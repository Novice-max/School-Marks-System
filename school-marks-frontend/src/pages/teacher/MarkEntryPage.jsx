import { useEffect, useState } from 'react';
import { getMyAssignments, getTeacherStudents, enterMarksBulk } from '../../api/client';
import api from '../../api/client';
import { usePageStyles } from '../../styles/pageStyles';
import toast from 'react-hot-toast';

export default function MarkEntryPage() {
  const s = usePageStyles();
  const t = s.tokens;

  const [assignments,   setAssignments]   = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [exams,         setExams]         = useState([]);
  const [selectedExam,  setSelectedExam]  = useState('');
  const [students,      setStudents]      = useState([]);
  const [marks,         setMarks]         = useState({});
  const [originalMarks, setOriginalMarks] = useState({});
  const [saving,        setSaving]        = useState(false);
  const [hasExisting,   setHasExisting]   = useState(false);

  useEffect(() => {
    getMyAssignments().then(r => setAssignments(r.data)).catch(() => toast.error('Failed to load assignments'));
  }, []);

  const selectAssignment = async (a) => {
    setSelected(a); setSelectedExam(''); setMarks({}); setOriginalMarks({}); setHasExisting(false);
    const [studRes, examRes] = await Promise.all([
      getTeacherStudents(a.classRoom.classId),
      api.get(`/teacher/exams/class/${a.classRoom.classId}`),
    ]);
    setStudents(studRes.data); setExams(examRes.data);
  };

  const selectExam = async (examId) => {
    setSelectedExam(examId); setMarks({}); setOriginalMarks({}); setHasExisting(false);
    if (!examId || !selected) return;
    try {
      const res = await api.get(`/teacher/marks/${examId}/${selected.subject.subjectId}`);
      if (res.data.length > 0) {
        const markMap = {};
        res.data.forEach(m => { markMap[m.student.studentId] = m.score; });
        setMarks(markMap); setOriginalMarks({ ...markMap }); setHasExisting(true);
        toast.success(`Loaded ${res.data.length} existing marks — edit and re-save to update`);
      }
    } catch { /* fresh entry */ }
  };

  const handleScore = (studentId, value) => {
    if (value === '' || (Number(value) >= 0 && Number(value) <= 100)) {
      setMarks(prev => ({ ...prev, [studentId]: value }));
    }
  };

  const getGrade = (score, gradeLevel) => {
    const sc = Number(score); if (isNaN(sc)) return '';
    if (gradeLevel <= 3) return sc >= 75 ? 'EE' : sc >= 50 ? 'ME' : sc >= 25 ? 'AE' : 'BE';
    return sc >= 80 ? 'EE' : sc >= 60 ? 'ME' : sc >= 40 ? 'AE' : 'BE';
  };

  const gradeColor = g => ({ EE: '#22c55e', ME: '#3b82f6', AE: '#f59e0b', BE: '#ef4444' }[g] || t.textFaint);

  const save = async () => {
    const entries = students
      .filter(st => {
        const val = marks[st.studentId];
        if (val === undefined || val === '') return false;
        const orig = originalMarks[st.studentId];
        return orig === undefined || Number(val) !== Number(orig);
      })
      .map(st => ({
        studentId: st.studentId, subjectId: selected.subject.subjectId,
        examId: Number(selectedExam), score: Number(marks[st.studentId]),
      }));
    if (!entries.length) { toast.error(hasExisting ? 'No changes made' : 'No marks to save'); return; }
    setSaving(true);
    try {
      await enterMarksBulk(entries);
      const updated = {};
      entries.forEach(e => { updated[e.studentId] = e.score; });
      setOriginalMarks(prev => ({ ...prev, ...updated })); setHasExisting(true);
      toast.success(`✅ ${entries.length} mark${entries.length !== 1 ? 's' : ''} ${hasExisting ? 'updated' : 'saved'}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const filledCount  = students.filter(st => marks[st.studentId] !== undefined && marks[st.studentId] !== '').length;
  const changedCount = students.filter(st => {
    const val = marks[st.studentId];
    if (val === undefined || val === '') return false;
    const orig = originalMarks[st.studentId];
    return orig === undefined || Number(val) !== Number(orig);
  }).length;

  /* ─── Mark-entry specific styles ─── */
  const me = {
    section:      { ...s.card, padding: 24 },
    sectionTitle: { fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 8 },
    editBanner:   { fontSize: 13, color: t.infoText, background: t.infoBg, padding: '6px 12px', borderRadius: 6, marginBottom: 12, display: 'inline-block' },
    assignGrid:   { display: 'flex', gap: 12, flexWrap: 'wrap' },
    assignCard:   { padding: '14px 20px', borderRadius: 10, border: `2px solid ${t.border}`, background: t.rowAlt, cursor: 'pointer', textAlign: 'left', minWidth: 180 },
    assignActive: { borderColor: t.accent, background: t.accentSubtle },
    assignSubj:   { fontWeight: 700, color: t.text, fontSize: 14 },
    assignClass:  { color: t.textMuted, fontSize: 13, marginTop: 2 },
    assignTerm:   { color: t.textFaint, fontSize: 12, marginTop: 2 },
    tableHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 },
    badges:       { display: 'flex', gap: 8, flexWrap: 'wrap' },
    badge:        { padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 },
    scoreInput:   { width: 80, padding: '6px 8px', borderRadius: 6, border: `1.5px solid ${t.inputBorder}`, textAlign: 'center', fontSize: 14, background: t.inputBg, color: t.text, outline: 'none' },
    saveRow:      { marginTop: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
    saveBtn:      { padding: '12px 32px', background: t.accent, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer' },
  };

  return (
    <div>
      <h1 style={s.title}>✏️ Enter Marks</h1>

      {/* Assignment picker */}
      <div style={me.section}>
        <h3 style={me.sectionTitle}>1. Select Subject & Class</h3>
        <div style={me.assignGrid}>
          {assignments.map(a => (
            <button key={a.assignmentId}
              style={{ ...me.assignCard, ...(selected?.assignmentId === a.assignmentId ? me.assignActive : {}) }}
              onClick={() => selectAssignment(a)}>
              <div style={me.assignSubj}>{a.subject.subjectName}</div>
              <div style={me.assignClass}>{a.classRoom.displayName}</div>
              <div style={me.assignTerm}>Term {a.term} · {a.academicYear}</div>
            </button>
          ))}
          {assignments.length === 0 && <p style={{ color: t.textFaint }}>No subjects assigned. Contact admin.</p>}
        </div>
      </div>

      {/* Exam picker */}
      {selected && (
        <div style={me.section}>
          <h3 style={me.sectionTitle}>2. Select Exam</h3>
          <select style={{ ...s.select, minWidth: 280 }} value={selectedExam} onChange={e => selectExam(e.target.value)}>
            <option value="">— Choose exam —</option>
            {exams.map(e => (
              <option key={e.examId} value={e.examId}>{e.examName} · Term {e.term} · {e.academicYear}</option>
            ))}
          </select>
        </div>
      )}

      {/* Mark entry table */}
      {selected && selectedExam && (
        <div style={me.section}>
          <div style={me.tableHeader}>
            <div>
              <h3 style={me.sectionTitle}>
                3. {hasExisting ? 'Edit Marks' : 'Enter Marks'} — {selected.subject.subjectName} · {selected.classRoom.displayName}
              </h3>
              {hasExisting && <div style={me.editBanner}>✏️ Existing marks loaded — edit any score and click Update to save changes</div>}
            </div>
            <div style={me.badges}>
              <span style={{ ...me.badge, background: t.infoBg, color: t.infoText }}>{students.length} students</span>
              <span style={{ ...me.badge, background: t.successBg, color: t.successText }}>{filledCount} filled</span>
              {hasExisting && changedCount > 0 && (
                <span style={{ ...me.badge, background: t.warningBg, color: t.warningText }}>{changedCount} changed</span>
              )}
              {students.length - filledCount > 0 && (
                <span style={{ ...me.badge, background: t.dangerBg, color: t.danger }}>{students.length - filledCount} missing</span>
              )}
            </div>
          </div>

          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>{['#', 'Adm No.', 'Student Name', 'Score (0–100)', 'Grade', 'Points'].map(h => (
                  <th key={h} style={{ ...s.th, textAlign: 'center', fontSize: 13 }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {students.map((st, i) => {
                  const score      = marks[st.studentId] ?? '';
                  const origScore  = originalMarks[st.studentId];
                  const isChanged  = score !== '' && origScore !== undefined && Number(score) !== Number(origScore);
                  const isNew      = score !== '' && origScore === undefined;
                  const gradeLevel = st.classRoom?.gradeLevel || selected.classRoom.gradeLevel;
                  const grade      = score !== '' ? getGrade(score, gradeLevel) : '';
                  const pts        = { EE: 4, ME: 3, AE: 2, BE: 1 }[grade] || '';

                  return (
                    <tr key={st.studentId} style={s.rowBg(i)}>
                      <td style={{ ...s.td, textAlign: 'center' }}>{i + 1}</td>
                      <td style={{ ...s.td, textAlign: 'center' }}>{st.admissionNumber}</td>
                      <td style={{ ...s.td, textAlign: 'left', fontWeight: 500 }}>{st.firstName} {st.lastName}</td>
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        <input
                          style={{
                            ...me.scoreInput,
                            borderColor: isChanged ? t.warningText : isNew ? t.successText : t.inputBorder,
                            background:  isChanged ? t.warningBg   : isNew ? t.successBg   : score !== '' ? t.infoBg : t.inputBg,
                          }}
                          type="number" min={0} max={100} value={score}
                          onChange={e => handleScore(st.studentId, e.target.value)} placeholder="—"
                        />
                      </td>
                      <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, color: gradeColor(grade) }}>{grade || '—'}</td>
                      <td style={{ ...s.td, textAlign: 'center' }}>{pts || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={me.saveRow}>
            <button style={me.saveBtn} onClick={save} disabled={saving}>
              {saving ? 'Saving...' : hasExisting ? '💾 Update Marks' : '💾 Save All Marks'}
            </button>
            {hasExisting && changedCount === 0 && (
              <span style={{ fontSize: 13, color: t.textFaint }}>No changes to save</span>
            )}
            {students.length - filledCount > 0 && (
              <span style={{ fontSize: 13, color: t.warningText, fontWeight: 600 }}>
                ⚠️ {students.length - filledCount} student(s) have no score
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}