import { useEffect, useState } from 'react';
import { getClasses, getExams, createExam } from '../../api/client';
import toast from 'react-hot-toast';

const EXAM_NAMES = ['Opener', 'Mid-Term', 'End-Term'];

export default function ExamsPage() {
  const [classes, setClasses] = useState([]);
  const [exams,   setExams]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    examName: 'Opener', term: 1,
    academicYear: new Date().getFullYear().toString(), classId: ''
  });

  const load = () => getExams().then(r => setExams(r.data));

  useEffect(() => {
    getClasses().then(r => setClasses(r.data));
    load();
  }, []);

  const classLabel = c => c.gradeLevel <= 6 ? `Grade ${c.gradeLevel} (Primary)` : `Grade ${c.gradeLevel} (JSS)`;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.classId) { toast.error('Select a class'); return; }
    setLoading(true);
    try {
      await createExam({
        examName:     form.examName,
        term:         Number(form.term),
        academicYear: form.academicYear,
        classRoom:    { classId: Number(form.classId) },
      });
      toast.success('Exam created');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  const getClassName = (exam) => {
    const c = classes.find(cl => cl.classId === exam.classRoom?.classId);
    return c ? classLabel(c) : '—';
  };

  return (
    <div>
      <h1 style={s.title}>📝 Exams</h1>

      <div style={s.card}>
        <h3 style={s.cardTitle}>Create Exam</h3>
        <form onSubmit={submit} style={s.form}>
          <div style={s.grid}>
            <div style={s.field}>
              <label style={s.label}>Class</label>
              <select style={s.input} value={form.classId}
                onChange={e => setForm({...form, classId: e.target.value})} required>
                <option value="">Select class</option>
                {classes.map(c => (
                  <option key={c.classId} value={c.classId}>{classLabel(c)} — {c.academicYear}</option>
                ))}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Exam Name</label>
              <select style={s.input} value={form.examName}
                onChange={e => setForm({...form, examName: e.target.value})}>
                {EXAM_NAMES.map(n => <option key={n}>{n}</option>)}
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
            {loading ? 'Creating...' : '+ Create Exam'}
          </button>
        </form>
      </div>

      <div style={s.card}>
        <h3 style={s.cardTitle}>All Exams ({exams.length})</h3>
        {exams.length === 0 ? (
          <p style={s.empty}>No exams yet.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>{['ID','Class','Exam','Term','Year'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {exams.map((ex, i) => (
                <tr key={ex.examId} style={{background: i%2===0?'#f8fafc':'#fff'}}>
                  <td style={s.td}>{ex.examId}</td>
                  <td style={s.td}>{getClassName(ex)}</td>
                  <td style={s.td}><strong>{ex.examName}</strong></td>
                  <td style={s.td}>Term {ex.term}</td>
                  <td style={s.td}>{ex.academicYear}</td>
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
