import { useEffect, useState } from 'react';
import { getTeachers, getClasses, getSubjects, assignTeacher,
         getAssignmentsByTeacher, removeAssignment } from '../../api/client';
import { usePageStyles } from '../../styles/pageStyles';
import toast from 'react-hot-toast';

const classLabel = c =>
  c.gradeLevel === -1 ? 'PP1 (Pre-Primary 1)' :
  c.gradeLevel === 0  ? 'PP2 (Pre-Primary 2)' :
  c.gradeLevel <= 6   ? `Grade ${c.gradeLevel} (Primary)` :
                        `Grade ${c.gradeLevel} (JSS)`;

export default function AssignmentsPage() {
  const s = usePageStyles();

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

  useEffect(() => {
    getTeachers().then(r => setTeachers(r.data));
    getClasses().then(r  => setClasses(r.data));
    getSubjects().then(r => setSubjects(r.data));
  }, []);

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