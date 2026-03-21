import { useEffect, useState } from 'react';
import { getTeachers, createTeacher } from '../../api/client';
import toast from 'react-hot-toast';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [showCreds, setShowCreds] = useState(null); // { username, password }
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', username: '' });

  const load = () => getTeachers().then(r => setTeachers(r.data)).catch(() => toast.error('Failed to load teachers'));

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await createTeacher(form);
      toast.success('Teacher created');
      setShowCreds({ username: data.username, password: data.defaultPassword });
      setForm({ firstName: '', lastName: '', email: '', phone: '', username: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create teacher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={s.title}>👩‍🏫 Teachers</h1>

      {/* Credentials popup */}
      {showCreds && (
        <div style={s.credsBox}>
          <div style={s.credsInner}>
            <h3 style={{color:'#1e3a5f',marginBottom:12}}>✅ Teacher Created — Share These Credentials</h3>
            <p style={s.credsText}>Username: <strong>{showCreds.username}</strong></p>
            <p style={s.credsText}>Password: <strong>{showCreds.password}</strong></p>
            <p style={{fontSize:12,color:'#e55',marginTop:8}}>⚠️ Teacher must change password on first login</p>
            <button style={s.closeBtn} onClick={() => setShowCreds(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Create form */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>Add New Teacher</h3>
        <form onSubmit={submit} style={s.form}>
          <div style={s.grid}>
            {[
              { key: 'firstName',  label: 'First Name',  placeholder: 'John' },
              { key: 'lastName',   label: 'Last Name',   placeholder: 'Doe' },
              { key: 'username',   label: 'Username (login)', placeholder: 'jdoe' },
              { key: 'email',      label: 'Email',       placeholder: 'jdoe@school.ac.ke' },
              { key: 'phone',      label: 'Phone',       placeholder: '0712345678' },
            ].map(f => (
              <div key={f.key} style={s.field}>
                <label style={s.label}>{f.label}</label>
                <input style={s.input} type="text" placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm({...form, [f.key]: e.target.value})}
                  required={['firstName','lastName','username'].includes(f.key)} />
              </div>
            ))}
          </div>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Creating...' : '+ Add Teacher'}
          </button>
        </form>
      </div>

      {/* Teachers table */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>All Teachers ({teachers.length})</h3>
        {teachers.length === 0 ? (
          <p style={s.empty}>No teachers yet.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {['ID','Name','Email','Phone'].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {teachers.map((t, i) => (
                <tr key={t.teacherId} style={{background: i%2===0?'#f8fafc':'#fff'}}>
                  <td style={s.td}>{t.teacherId}</td>
                  <td style={s.td}><strong>{t.firstName} {t.lastName}</strong></td>
                  <td style={s.td}>{t.email || '—'}</td>
                  <td style={s.td}>{t.phone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const s = {
  title:     { fontSize: 24, fontWeight: 700, color: '#1e3a5f', marginBottom: 24 },
  card:      { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,.06)' },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 16 },
  form:      { display: 'flex', flexDirection: 'column', gap: 16 },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 14 },
  field:     { display: 'flex', flexDirection: 'column', gap: 4 },
  label:     { fontSize: 13, fontWeight: 600, color: '#555' },
  input:     { padding: '9px 12px', borderRadius: 8, border: '1.5px solid #dde3ea', fontSize: 14 },
  btn:       { padding: '11px 28px', background: '#1e5fa0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14, alignSelf: 'flex-start' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th:        { background: '#1e3a5f', color: '#fff', padding: '10px 14px', textAlign: 'left', fontWeight: 600 },
  td:        { padding: '10px 14px', borderBottom: '1px solid #f0f4f8' },
  empty:     { color: '#aaa', textAlign: 'center', padding: 32 },
  credsBox:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  credsInner:{ background: '#fff', borderRadius: 14, padding: 32, minWidth: 340, boxShadow: '0 20px 60px rgba(0,0,0,.2)' },
  credsText: { fontSize: 16, marginBottom: 6, color: '#333' },
  closeBtn:  { marginTop: 16, padding: '10px 28px', background: '#1e5fa0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' },
};
