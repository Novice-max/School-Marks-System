import { useEffect, useState } from 'react';
import { getClasses, createClass } from '../../api/client';
import toast from 'react-hot-toast';

const GRADES = [1,2,3,4,5,6,7,8,9];
const LEVEL  = g => g <= 3 ? 'lower_primary' : g <= 6 ? 'upper_primary' : 'junior_secondary';
const LABEL  = g => g <= 6 ? `Grade ${g} (Primary)` : `Grade ${g} (JSS)`;

export default function ClassesPage() {
  const [classes, setClasses]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [form, setForm]         = useState({ gradeLevel: 1, academicYear: new Date().getFullYear().toString() });

  const load = () => getClasses().then(r => setClasses(r.data)).catch(() => toast.error('Failed to load classes'));

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createClass({
        gradeLevel:   Number(form.gradeLevel),
        levelType:    LEVEL(Number(form.gradeLevel)),
        academicYear: form.academicYear,
      });
      toast.success('Class created');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={s.title}>🏫 Classes</h1>

      {/* Create form */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>Create New Class</h3>
        <form onSubmit={submit} style={s.form}>
          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Grade Level</label>
              <select style={s.input} value={form.gradeLevel}
                onChange={e => setForm({...form, gradeLevel: e.target.value})}>
                {GRADES.map(g => <option key={g} value={g}>{LABEL(g)}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Academic Year</label>
              <input style={s.input} type="text" value={form.academicYear}
                onChange={e => setForm({...form, academicYear: e.target.value})}
                placeholder="e.g. 2025" required />
            </div>
            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? 'Creating...' : '+ Create Class'}
            </button>
          </div>
        </form>
      </div>

      {/* Classes table */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>All Classes ({classes.length})</h3>
        {classes.length === 0 ? (
          <p style={s.empty}>No classes yet. Create one above.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {['ID','Grade','Level','Academic Year'].map(h =>
                  <th key={h} style={s.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {classes.map((c, i) => (
                <tr key={c.classId} style={{background: i%2===0?'#f8fafc':'#fff'}}>
                  <td style={s.td}>{c.classId}</td>
                  <td style={s.td}>{LABEL(c.gradeLevel)}</td>
                  <td style={s.td}><span style={{...s.badge, background: badgeColor(c.levelType)}}>{c.levelType}</span></td>
                  <td style={s.td}>{c.academicYear}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const badgeColor = t => t === 'lower_primary' ? '#dcfce7' : t === 'upper_primary' ? '#dbeafe' : '#f3e8ff';

const s = {
  title:     { fontSize: 24, fontWeight: 700, color: '#1e3a5f', marginBottom: 24 },
  card:      { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,.06)' },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 16 },
  form:      { display: 'flex', flexDirection: 'column', gap: 12 },
  row:       { display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' },
  field:     { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200 },
  label:     { fontSize: 13, fontWeight: 600, color: '#555' },
  input:     { padding: '9px 12px', borderRadius: 8, border: '1.5px solid #dde3ea', fontSize: 14, background: '#fff' },
  btn:       { padding: '10px 24px', background: '#1e5fa0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14, height: 40 },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th:        { background: '#1e3a5f', color: '#fff', padding: '10px 14px', textAlign: 'left', fontWeight: 600 },
  td:        { padding: '10px 14px', borderBottom: '1px solid #f0f4f8' },
  badge:     { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  empty:     { color: '#aaa', textAlign: 'center', padding: 32 },
};
