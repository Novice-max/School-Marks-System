import { useEffect, useState } from 'react';
import { getClasses, getExams, createExam } from '../../api/client';
import { usePageStyles } from '../../styles/pageStyles';
import toast from 'react-hot-toast';

const EXAM_NAMES = ['Opener', 'Mid-Term', 'End-Term'];
const classLabel = c =>
  c.gradeLevel === -1 ? 'PP1 (Pre-Primary 1)' :
  c.gradeLevel === 0  ? 'PP2 (Pre-Primary 2)' :
  c.gradeLevel <= 6   ? `Grade ${c.gradeLevel} (Primary)` :
                        `Grade ${c.gradeLevel} (JSS)`;

export default function ExamsPage() {
  const s = usePageStyles();

  const [classes, setClasses] = useState([]);
  const [exams,   setExams]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    examName: 'Opener', term: 1,
    academicYear: new Date().getFullYear().toString(), classId: ''
  });

  const load = () => getExams().then(r => setExams(r.data));

  useEffect(() => { getClasses().then(r => setClasses(r.data)); load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.classId) { toast.error('Select a class'); return; }
    setLoading(true);
    try {
      await createExam({
        examName: form.examName, term: Number(form.term),
        academicYear: form.academicYear, classRoom: { classId: Number(form.classId) },
      });
      toast.success('Exam created'); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create exam'); }
    finally { setLoading(false); }
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
                <tr key={ex.examId} style={s.rowBg(i)}>
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