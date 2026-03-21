import { useEffect, useState } from 'react';
import { getClasses, getStudentsByClass, createStudent } from '../../api/client';
import toast from 'react-hot-toast';

export default function StudentsPage() {
  const [classes,  setClasses]  = useState([]);
  const [students, setStudents] = useState([]);
  const [selClass, setSelClass] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', admissionNumber: '',
    gender: 'Male', dateOfBirth: '', parentContact: ''
  });

  useEffect(() => { getClasses().then(r => setClasses(r.data)); }, []);

  useEffect(() => {
    if (!selClass) return;
    getStudentsByClass(selClass).then(r => setStudents(r.data));
  }, [selClass]);

  const classLabel = (c) => c.gradeLevel <= 6 ? `Grade ${c.gradeLevel} (Primary)` : `Grade ${c.gradeLevel} (JSS)`;

  const submit = async (e) => {
    e.preventDefault();
    if (!selClass) { toast.error('Select a class first'); return; }
    setLoading(true);
    try {
      await createStudent({
        ...form,
        classRoom: { classId: Number(selClass) },
        dateOfBirth: form.dateOfBirth || null,
      });
      toast.success('Student added');
      getStudentsByClass(selClass).then(r => setStudents(r.data));
      setForm({ firstName: '', lastName: '', admissionNumber: '', gender: 'Male', dateOfBirth: '', parentContact: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={s.title}>👨‍🎓 Students</h1>

      {/* Class selector */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>Select Class</h3>
        <select style={s.input} value={selClass} onChange={e => setSelClass(e.target.value)}>
          <option value="">— Choose a class —</option>
          {classes.map(c => (
            <option key={c.classId} value={c.classId}>
              {classLabel(c)} — {c.academicYear}
            </option>
          ))}
        </select>
        {classes.length === 0 && <p style={{color:'#e55',fontSize:13,marginTop:8}}>⚠️ No classes found. Create classes first.</p>}
      </div>

      {/* Add student form */}
      {selClass && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>Add Student</h3>
          <form onSubmit={submit} style={s.form}>
            <div style={s.grid}>
              {[
                { key: 'firstName',       label: 'First Name',       type: 'text',   req: true },
                { key: 'lastName',        label: 'Last Name',        type: 'text',   req: true },
                { key: 'admissionNumber', label: 'Admission No.',    type: 'text',   req: true },
                { key: 'parentContact',   label: 'Parent Contact',   type: 'text',   req: false },
                { key: 'dateOfBirth',     label: 'Date of Birth',    type: 'date',   req: false },
              ].map(f => (
                <div key={f.key} style={s.field}>
                  <label style={s.label}>{f.label}</label>
                  <input style={s.input} type={f.type}
                    value={form[f.key]}
                    onChange={e => setForm({...form, [f.key]: e.target.value})}
                    required={f.req} />
                </div>
              ))}
              <div style={s.field}>
                <label style={s.label}>Gender</label>
                <select style={s.input} value={form.gender}
                  onChange={e => setForm({...form, gender: e.target.value})}>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
            </div>
            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? 'Adding...' : '+ Add Student'}
            </button>
          </form>
        </div>
      )}

      {/* Students list */}
      {selClass && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>Students in this class ({students.length})</h3>
          {students.length === 0 ? (
            <p style={s.empty}>No students yet. Add one above.</p>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>{['#','Adm No.','Name','Gender','Parent Contact'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {students.map((st, i) => (
                  <tr key={st.studentId} style={{background: i%2===0?'#f8fafc':'#fff'}}>
                    <td style={s.td}>{i+1}</td>
                    <td style={s.td}>{st.admissionNumber}</td>
                    <td style={s.td}><strong>{st.firstName} {st.lastName}</strong></td>
                    <td style={s.td}>{st.gender}</td>
                    <td style={s.td}>{st.parentContact || '—'}</td>
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
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th:        { background: '#1e3a5f', color: '#fff', padding: '10px 14px', textAlign: 'left', fontWeight: 600 },
  td:        { padding: '10px 14px', borderBottom: '1px solid #f0f4f8' },
  empty:     { color: '#aaa', textAlign: 'center', padding: 32 },
};
