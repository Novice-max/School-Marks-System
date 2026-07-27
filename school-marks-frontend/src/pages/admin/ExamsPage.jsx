import { useState, useEffect, useContext } from 'react';
import api from '../../api';
import { ThemeContext } from '../../context/ThemeContext';

const EXAM_NAMES = ['Opener', 'Mid-Term', 'End-Term'];

export default function ExamsPage() {
  const { s } = useContext(ThemeContext);

  const [exams, setExams]         = useState([]);
  const [classes, setClasses]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const currentYear = new Date().getFullYear().toString();

  const [form, setForm] = useState({
    examName: 'Opener',
    term: 1,
    academicYear: currentYear,
  });

  // Grouped view: { "Opener||1||2026": [exam, exam, ...] }
  const [grouped, setGrouped] = useState({});

  const load = () =>
    api.get('/admin/exams').then(r => {
      setExams(r.data);
      groupExams(r.data);
    });

  const groupExams = (data) => {
    const g = {};
    data.forEach(e => {
      const key = `${e.examName}||${e.term}||${e.academicYear}`;
      if (!g[key]) g[key] = [];
      g[key].push(e);
    });
    setGrouped(g);
  };

  useEffect(() => {
    load();
    api.get('/admin/classes').then(r => setClasses(r.data));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const res = await api.post('/admin/exams/school', {
        examName: form.examName,
        term: Number(form.term),
        academicYear: form.academicYear,
      });
      setSuccess(res.data.message);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create exams');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (examName, term, academicYear) => {
    const key = `${examName}||${term}||${academicYear}`;
    if (!window.confirm(`Delete "${examName}" Term ${term} ${academicYear} for ALL classes? This also deletes all marks entered for this exam.`)) return;
    setDeleteLoading(key);
    setError(''); setSuccess('');
    try {
      const res = await api.delete(`/admin/exams/school/${encodeURIComponent(examName)}/${term}/${academicYear}`);
      setSuccess(res.data.message);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete exams');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Sort group keys: newest year first, then term asc, then name
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const [nameA, termA, yearA] = a.split('||');
    const [nameB, termB, yearB] = b.split('||');
    if (yearB !== yearA) return yearB.localeCompare(yearA);
    if (termA !== termB) return Number(termA) - Number(termB);
    return nameA.localeCompare(nameB);
  });

  return (
    <div style={s.page}>
      <h1 style={s.title}>📋 Exams</h1>

      {/* CREATE FORM */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>Create School-Wide Exam</h3>
        <p style={{ ...s.label, marginBottom: 16, opacity: 0.7 }}>
          Creates one exam record for every class in the selected academic year.
        </p>

        {error   && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, background: 'var(--dangerBg)', color: 'var(--danger)', border: '1px solid var(--dangerBorder)', fontSize: 14 }}>{error}</div>}
        {success && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, background: 'var(--successBg)', color: 'var(--successText)', border: '1px solid var(--successBorder)', fontSize: 14 }}>{success}</div>}

        <form onSubmit={handleCreate} style={s.form}>
          <div style={s.grid}>

            {/* Exam Name */}
            <div style={s.field}>
              <label style={s.label}>Exam Name</label>
              <select
                style={s.input}
                value={form.examName}
                onChange={e => setForm({ ...form, examName: e.target.value })}
                required
              >
                {EXAM_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {/* Term */}
            <div style={s.field}>
              <label style={s.label}>Term</label>
              <select
                style={s.input}
                value={form.term}
                onChange={e => setForm({ ...form, term: e.target.value })}
              >
                <option value={1}>Term 1</option>
                <option value={2}>Term 2</option>
                <option value={3}>Term 3</option>
              </select>
            </div>

            {/* Academic Year */}
            <div style={s.field}>
              <label style={s.label}>Academic Year</label>
              <input
                style={s.input}
                type="text"
                value={form.academicYear}
                onChange={e => setForm({ ...form, academicYear: e.target.value })}
                required
              />
            </div>

          </div>

          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Creating...' : '+ Create for All Classes'}
          </button>
        </form>
      </div>

      {/* GROUPED EXAM LIST */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>All Exams ({exams.length} records across {sortedKeys.length} exam sets)</h3>

        {sortedKeys.length === 0 ? (
          <p style={s.label}>No exams yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedKeys.map(key => {
              const [examName, term, academicYear] = key.split('||');
              const group = grouped[key];
              const isDeleting = deleteLoading === key;

              return (
                <div
                  key={key}
                  style={{
                    border: `1px solid var(--border)`,
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  {/* Group header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    background: 'var(--surface2)',
                    borderBottom: `1px solid var(--border)`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <strong style={{ fontSize: 15 }}>{examName}</strong>
                      <span style={{
                        background: 'var(--primary)',
                        color: '#fff',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 12,
                      }}>Term {term}</span>
                      <span style={{ opacity: 0.6, fontSize: 13 }}>{academicYear}</span>
                      <span style={{ opacity: 0.5, fontSize: 12 }}>{group.length} classes</span>
                    </div>
                    <button
                      style={{
                        ...s.removeBtn,
                        padding: '4px 12px',
                        fontSize: 12,
                        opacity: isDeleting ? 0.6 : 1,
                      }}
                      onClick={() => handleDeleteGroup(examName, Number(term), academicYear)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete All'}
                    </button>
                  </div>

                  {/* Class list inside group */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    padding: 12,
                  }}>
                    {group
                      .slice()
                      .sort((a, b) => {
                        const nameA = a.classRoom?.className || '';
                        const nameB = b.classRoom?.className || '';
                        return nameA.localeCompare(nameB);
                      })
                      .map(exam => {
                        const cn = classes.find(c => c.classId === exam.classRoom?.classId);
                        const label = cn ? cn.className : (exam.classRoom?.className || `ID ${exam.examId}`);
                        return (
                          <span
                            key={exam.examId}
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                              padding: '3px 10px',
                              fontSize: 13,
                            }}
                          >
                            {label}
                          </span>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}