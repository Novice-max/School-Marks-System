import { useEffect, useState } from 'react';
import { getTeachers, getClasses, getSubjects, assignTeacher,
         getAssignmentsByTeacher, removeAssignment,
         getAssignmentTerms, copyAssignmentsToTerm } from '../../api/client';
import { usePageStyles } from '../../styles/pageStyles';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

// Term after the given one: T1→T2, T2→T3, T3→T1 of the next year
const nextTerm = (year, term) =>
  Number(term) >= 3 ? { academicYear: String(Number(year) + 1), term: 1 }
                    : { academicYear: String(year), term: Number(term) + 1 };

const classLabel = c =>
  c.gradeLevel === -2 ? `Playgroup — ${c.academicYear}` :
  c.gradeLevel === -1 ? 'PP1 (Pre-Primary 1)' :
  c.gradeLevel === 0  ? 'PP2 (Pre-Primary 2)' :
  c.gradeLevel <= 6   ? `Grade ${c.gradeLevel} (Primary)` :
                        `Grade ${c.gradeLevel} (JSS)`;

export default function AssignmentsPage() {
  const s = usePageStyles();
  const { tokens: t } = useTheme();

  const [teachers,     setTeachers]     = useState([]);
  const [classes,      setClasses]      = useState([]);
  const [subjects,     setSubjects]     = useState([]);
  const [assignments,  setAssignments]  = useState([]);
  const [selTeacher,   setSelTeacher]   = useState('');
  const [loading,      setLoading]      = useState(false);
  const [form, setForm] = useState({
    subjectId: '', classId: '',
    academicYear: new Date().getFullYear().toString(), term: 1
  });

  // ── Copy-to-new-term panel ──
  const [terms,    setTerms]    = useState([]);   // [{academicYear, term, count}] newest first
  const [copyFrom, setCopyFrom] = useState('');   // "2026|3"
  const [copyTo,   setCopyTo]   = useState({ academicYear: '', term: 1 });
  const [preview,  setPreview]  = useState(null); // dry-run result
  const [copying,  setCopying]  = useState(false);

  const loadTerms = () =>
    getAssignmentTerms()
      .then(r => {
        setTerms(r.data);
        const latest = r.data[0];
        if (latest) {
          setCopyFrom(`${latest.academicYear}|${latest.term}`);
          setCopyTo(nextTerm(latest.academicYear, latest.term));
          // New single assignments default to the current (latest) term, not always Term 1
          setForm(f => ({ ...f, academicYear: String(latest.academicYear), term: Number(latest.term) }));
        }
      })
      .catch(() => toast.error('Failed to load terms'));

  useEffect(() => {
    getTeachers().then(r => setTeachers(r.data)).catch(() => toast.error('Failed to load teachers'));
    getClasses().then(r  => setClasses(r.data)).catch(() => toast.error('Failed to load classes'));
    getSubjects().then(r => setSubjects(r.data)).catch(() => toast.error('Failed to load subjects'));
    loadTerms();
  }, []);

  const copyBody = (dryRun) => {
    const [fromYear, fromTerm] = copyFrom.split('|');
    return { fromYear, fromTerm: Number(fromTerm), toYear: String(copyTo.academicYear).trim(),
             toTerm: Number(copyTo.term), dryRun };
  };

  const runPreview = async () => {
    if (!copyFrom) { toast.error('Nothing to copy yet'); return; }
    setCopying(true); setPreview(null);
    try {
      const { data } = await copyAssignmentsToTerm(copyBody(true));
      setPreview(data);
    } catch (err) { toast.error(err.response?.data?.message || 'Preview failed'); }
    finally { setCopying(false); }
  };

  const runCopy = async () => {
    setCopying(true);
    try {
      const { data } = await copyAssignmentsToTerm(copyBody(false));
      toast.success(`${data.toCopy} assignment${data.toCopy === 1 ? '' : 's'} copied to Term ${copyTo.term} ${copyTo.academicYear}`);
      setPreview(null);
      loadTerms();
      if (selTeacher) getAssignmentsByTeacher(selTeacher).then(r => setAssignments(r.data));
    } catch (err) { toast.error(err.response?.data?.message || 'Copy failed — nothing was changed'); }
    finally { setCopying(false); }
  };

  useEffect(() => {
    if (!selTeacher) return;
    getAssignmentsByTeacher(selTeacher).then(r => setAssignments(r.data));
  }, [selTeacher]);

  const filteredSubjects = () => {
    if (!form.classId) return subjects;
    const cls = classes.find(c => c.classId == form.classId);
    if (!cls) return subjects;
    return subjects.filter(sub => sub.levelType === cls.levelType);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selTeacher) { toast.error('Select a teacher'); return; }
    setLoading(true);
    try {
      await assignTeacher({
        teacher: { teacherId: Number(selTeacher) },
        subject: { subjectId: Number(form.subjectId) },
        classRoom: { classId: Number(form.classId) },
        academicYear: form.academicYear, term: Number(form.term),
      });
      toast.success('Subject assigned');
      getAssignmentsByTeacher(selTeacher).then(r => setAssignments(r.data));
    } catch (err) { toast.error(err.response?.data?.message || 'Assignment failed — may already exist'); }
    finally { setLoading(false); }
  };

  const remove = async (id) => {
    try {
      await removeAssignment(id); toast.success('Assignment removed');
      getAssignmentsByTeacher(selTeacher).then(r => setAssignments(r.data));
    } catch { toast.error('Failed to remove'); }
  };

  return (
    <div>
      <h1 style={s.title}>🔗 Teacher Assignments</h1>

      {/* ── Start a new term: copy everyone's assignments forward ── */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>📋 Start a new term</h3>
        <p style={{ fontSize: 13, color: t.textMuted, margin: '-8px 0 14px', lineHeight: 1.5 }}>
          Copy every teacher's subjects and classes from one term to the next, so nobody is locked out of
          mark entry on day one. Existing assignments are kept and nothing is deleted. Adjust individual
          teachers below afterwards.
        </p>
        {terms.length === 0 ? (
          <p style={{ fontSize: 13, color: t.textFaint }}>No assignments yet — add some below first.</p>
        ) : (
          <>
            <div style={s.grid}>
              <div style={s.field}>
                <label style={s.label}>Copy from</label>
                <select style={s.input} value={copyFrom}
                  onChange={e => { setCopyFrom(e.target.value); setPreview(null); }}>
                  {terms.map(x => (
                    <option key={`${x.academicYear}|${x.term}`} value={`${x.academicYear}|${x.term}`}>
                      Term {x.term} {x.academicYear} ({x.count} assignments)
                    </option>
                  ))}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>To term</label>
                <select style={s.input} value={copyTo.term}
                  onChange={e => { setCopyTo({ ...copyTo, term: Number(e.target.value) }); setPreview(null); }}>
                  <option value={1}>Term 1</option>
                  <option value={2}>Term 2</option>
                  <option value={3}>Term 3</option>
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>To year</label>
                <input style={s.input} type="text" inputMode="numeric" maxLength={4} value={copyTo.academicYear}
                  onChange={e => { setCopyTo({ ...copyTo, academicYear: e.target.value }); setPreview(null); }} />
              </div>
            </div>

            {!preview ? (
              <button style={{ ...s.btn, marginTop: 14, opacity: copying ? 0.7 : 1 }}
                onClick={runPreview} disabled={copying}>
                {copying ? 'Checking…' : 'Preview copy'}
              </button>
            ) : (
              <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 10,
                            background: t.rowAlt, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 6 }}>
                  {preview.toCopy > 0
                    ? `${preview.toCopy} assignment${preview.toCopy === 1 ? '' : 's'} will be copied to Term ${copyTo.term} ${copyTo.academicYear}`
                    : `Nothing new to copy — Term ${copyTo.term} ${copyTo.academicYear} is already set up`}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>
                  {preview.alreadyThere > 0 && <li>{preview.alreadyThere} already exist (kept as they are)</li>}
                  {preview.archivedSkipped > 0 && <li>{preview.archivedSkipped} skipped: subject archived</li>}
                  {preview.inactiveTeacherSkipped > 0 && <li>{preview.inactiveTeacherSkipped} skipped: teacher deactivated</li>}
                  {preview.noTargetClassSkipped > 0 && (
                    <li style={{ color: t.danger }}>
                      {preview.noTargetClassSkipped} skipped: no {copyTo.academicYear} class yet for{' '}
                      {preview.missingClasses.join(', ')}. Create those classes first, then copy again.
                    </li>
                  )}
                </ul>
                <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                  {preview.toCopy > 0 && (
                    <button style={{ ...s.btn, opacity: copying ? 0.7 : 1 }} onClick={runCopy} disabled={copying}>
                      {copying ? 'Copying…' : `Copy ${preview.toCopy}`}
                    </button>
                  )}
                  <button style={s.btnCancel} onClick={() => setPreview(null)} disabled={copying}>Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div style={s.card}>
        <h3 style={s.cardTitle}>Select Teacher</h3>
        <select style={s.input} value={selTeacher}
          onChange={e => setSelTeacher(e.target.value)}>
          <option value="">— Choose teacher —</option>
          {teachers.map(tc => (
            <option key={tc.teacherId} value={tc.teacherId}>
              {tc.firstName} {tc.lastName}
            </option>
          ))}
        </select>
      </div>

      {selTeacher && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>Assign Subject to Teacher</h3>
          <form onSubmit={submit} style={s.form}>
            <div style={s.grid}>
              <div style={s.field}>
                <label style={s.label}>Class</label>
                <select style={s.input} value={form.classId}
                  onChange={e => setForm({...form, classId: e.target.value, subjectId: ''})} required>
                  <option value="">Select class</option>
                  {classes.map(c => (
                    <option key={c.classId} value={c.classId}>{classLabel(c)} — {c.academicYear}</option>
                  ))}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Subject</label>
                <select style={s.input} value={form.subjectId}
                  onChange={e => setForm({...form, subjectId: e.target.value})} required>
                  <option value="">Select subject</option>
                  {filteredSubjects().map(sub => (
                    <option key={sub.subjectId} value={sub.subjectId}>{sub.subjectName}</option>
                  ))}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Term</label>
                <select style={s.input} value={form.term}
                  onChange={e => setForm({...form, term: e.target.value})}>
                  <option value={1}>Term 1</option>
                  <option value={2}>Term 2</option>
                  <option value={3}>Term 3</option>
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Academic Year</label>
                <input style={s.input} type="text" value={form.academicYear}
                  onChange={e => setForm({...form, academicYear: e.target.value})} required />
              </div>
            </div>
            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? 'Assigning...' : '+ Assign Subject'}
            </button>
          </form>
        </div>
      )}

      {selTeacher && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>
            Current Assignments for {teachers.find(tc => tc.teacherId == selTeacher)?.firstName} ({assignments.length})
          </h3>
          {assignments.length === 0 ? (
            <p style={s.empty}>No assignments yet.</p>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>{['Subject','Class','Term','Year','Action'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => (
                  <tr key={a.assignmentId} style={s.rowBg(i)}>
                    <td style={s.td}><strong>{a.subject?.subjectName}</strong></td>
                    <td style={s.td}>{a.classRoom ? classLabel(a.classRoom) : '—'}</td>
                    <td style={s.td}>Term {a.term}</td>
                    <td style={s.td}>{a.academicYear}</td>
                    <td style={s.td}>
                      <button style={s.removeBtn} onClick={() => remove(a.assignmentId)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}