import { useEffect, useState } from 'react';
import { getTeachers, getClasses, getSubjects, assignTeacher,
         getAssignmentsByTeacher, removeAssignment } from '../../api/client';
import toast from 'react-hot-toast';

export default function AssignmentsPage() {
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

  const classLabel = c => c.gradeLevel <= 6 ? `Grade ${c.gradeLevel} (Primary)` : `Grade ${c.gradeLevel} (JSS)`;

  // Filter subjects by selected class level
  const filteredSubjects = () => {
    if (!form.classId) return subjects;
    const cls = classes.find(c => c.classId == form.classId);
    if (!cls) return subjects;
    return subjects.filter(s => s.levelType === cls.levelType);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selTeacher) { toast.error('Select a teacher'); return; }
    setLoading(true);
    try {
      await assignTeacher({
        teacher:      { teacherId: Number(selTeacher) },
        subject:      { subjectId: Number(form.subjectId) },
        classRoom:    { classId:   Number(form.classId) },
        academicYear: form.academicYear,
        term:         Number(form.term),
      });
      toast.success('Subject assigned');
      getAssignmentsByTeacher(selTeacher).then(r => setAssignments(r.data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed — may already exist');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    try {
      await removeAssignment(id);
      toast.success('Assignment removed');
      getAssignmentsByTeacher(selTeacher).then(r => setAssignments(r.data));
    } catch {
      toast.error('Failed to remove');
    }
  };

  return (
    <div>
      <h1 style={s.title}>🔗 Teacher Assignments</h1>

      {/* Select teacher */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>Select Teacher</h3>
        <select style={s.input} value={selTeacher}
          onChange={e => setSelTeacher(e.target.value)}>
          <option value="">— Choose teacher —</option>
          {teachers.map(t => (
            <option key={t.teacherId} value={t.teacherId}>
              {t.firstName} {t.lastName}
            </option>
          ))}
        </select>
      </div>

      {/* Assign form */}
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

      {/* Current assignments */}
      {selTeacher && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>
            Current Assignments for {teachers.find(t => t.teacherId == selTeacher)?.firstName} ({assignments.length})
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
                  <tr key={a.assignmentId} style={{background: i%2===0?'#f8fafc':'#fff'}}>
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

const s = {
  title:     { fontSize: 24, fontWeight: 700, color: '#1e3a5f', marginBottom: 24 },
  card:      { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,.06)' },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 16 },
  form:      { display: 'flex', flexDirection: 'column', gap: 16 },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 14 },
  field:     { display: 'flex', flexDirection: 'column', gap: 4 },
  label:     { fontSize: 13, fontWeight: 600, color: '#555' },
  input:     { padding: '9px 12px', borderRadius: 8, border: '1.5px solid #dde3ea', fontSize: 14, background: '#fff' },
  btn:       { padding: '11px 28px', background: '#1e5fa0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14, alignSelf: 'flex-start' },
  removeBtn: { padding: '5px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th:        { background: '#1e3a5f', color: '#fff', padding: '10px 14px', textAlign: 'left', fontWeight: 600 },
  td:        { padding: '10px 14px', borderBottom: '1px solid #f0f4f8' },
  empty:     { color: '#aaa', textAlign: 'center', padding: 32 },
};
