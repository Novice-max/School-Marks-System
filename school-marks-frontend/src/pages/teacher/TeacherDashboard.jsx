import { useEffect, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement,
         ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { getMyAssignments, getExams, getSubjectAnalytics } from '../../api/client';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { usePageStyles } from '../../styles/pageStyles';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function TeacherDashboard() {
  const { user } = useAuth();
  const s = usePageStyles();
  const t = s.tokens;

  const [assignments,  setAssignments]  = useState([]);
  const [exams,        setExams]        = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [selectedExam, setSelectedExam] = useState('');
  const [analytics,    setAnalytics]    = useState(null);
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    getMyAssignments()
      .then(r => {
        setAssignments(r.data);
        if (r.data.length > 0) selectAssignment(r.data[0]);
      })
      .catch(() => toast.error('Failed to load assignments'));
  }, []);

  const selectAssignment = async (a) => {
    setSelected(a); setSelectedExam(''); setAnalytics(null);
    try {
      const res = await api.get(`/teacher/exams/class/${a.classRoom.classId}`);
      setExams(res.data);
      if (res.data.length > 0) {
        setSelectedExam(String(res.data[0].examId));
        loadAnalytics(res.data[0].examId, a.subject.subjectId);
      }
    } catch { toast.error('Failed to load exams'); }
  };

  const loadAnalytics = async (examId, subjectId) => {
    setLoading(true);
    try { const res = await getSubjectAnalytics(examId, subjectId); setAnalytics(res.data); }
    catch { setAnalytics(null); }
    finally { setLoading(false); }
  };

  const handleExamChange = (examId) => {
    setSelectedExam(examId);
    if (examId && selected) loadAnalytics(examId, selected.subject.subjectId);
  };

  const chartOpts = {
    responsive: true,
    plugins: { legend: { labels: { color: t.chartText } } },
    scales: {
      x: { ticks: { color: t.chartText }, grid: { color: t.chartGrid } },
      y: { min: 0, max: 100, ticks: { color: t.chartText }, grid: { color: t.chartGrid } },
    },
  };

  const barData = analytics && {
    labels: (analytics.studentScores || []).map(sc => sc.name.split(' ')[0]),
    datasets: [{
      label: 'Score',
      data: (analytics.studentScores || []).map(sc => sc.score),
      backgroundColor: (analytics.studentScores || []).map(sc =>
        sc.grade === 'EE' ? '#22c55e' : sc.grade === 'ME' ? '#3b82f6' :
        sc.grade === 'AE' ? '#f59e0b' : '#ef4444'),
      borderRadius: 6,
    }],
  };

  const pieData = analytics && {
    labels: Object.keys(analytics.gradeDistribution || {}),
    datasets: [{
      data: Object.values(analytics.gradeDistribution || {}),
      backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
      borderWidth: 2, borderColor: t.surface,
    }],
  };

  const gradeColor = g => ({ EE:'#22c55e', ME:'#3b82f6', AE:'#f59e0b', BE:'#ef4444' }[g] || t.textFaint);

  /* ─── Dashboard-specific styles ─── */
  const d = {
    sub:        { fontSize: 14, color: t.textFaint },
    tabs:       { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 },
    tab:        { padding: '12px 18px', borderRadius: 10, border: `2px solid ${t.border}`, background: t.rowAlt, cursor: 'pointer', textAlign: 'left', minWidth: 160 },
    tabActive:  { borderColor: t.accent, background: t.accentSubtle },
    tabSubject: { fontWeight: 700, color: t.text, fontSize: 14 },
    tabClass:   { color: t.textMuted, fontSize: 12, marginTop: 2 },
    examRow:    { ...s.card, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', marginBottom: 24 },
    examLabel:  { fontSize: 14, fontWeight: 600, color: t.textMuted, whiteSpace: 'nowrap' },
    statRow:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 20 },
    statCard:   { ...s.card, padding: '20px 16px', textAlign: 'center', marginBottom: 0 },
    statIcon:   { fontSize: 24, marginBottom: 8 },
    statValue:  { fontSize: 26, fontWeight: 800, marginBottom: 4 },
    statLabel:  { fontSize: 12, color: t.textFaint, fontWeight: 500 },
    gradeRow:   { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 },
    gradeBadge: { padding: '8px 20px', borderRadius: 30, border: '2px solid', display: 'flex', gap: 8, alignItems: 'center' },
    gradeLabel: { fontWeight: 800, fontSize: 16 },
    gradeCount: { fontSize: 13, fontWeight: 500 },
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={s.title}>👋 Welcome, {user?.fullName?.split(' ')[0]}</h1>
        <p style={d.sub}>Here's your subject performance overview</p>
      </div>

      {/* Assignment tabs */}
      {assignments.length > 0 && (
        <div style={d.tabs}>
          {assignments.map(a => (
            <button key={a.assignmentId}
              style={{ ...d.tab, ...(selected?.assignmentId === a.assignmentId ? d.tabActive : {}) }}
              onClick={() => selectAssignment(a)}>
              <div style={d.tabSubject}>{a.subject.subjectName}</div>
              <div style={d.tabClass}>{a.classRoom.displayName} · T{a.term}</div>
            </button>
          ))}
        </div>
      )}

      {assignments.length === 0 && (
        <div style={{ ...s.empty, padding: '60px 20px' }}>
          <div style={{ fontSize: 48 }}>📋</div>
          <h3 style={{ color: t.text }}>No subjects assigned yet</h3>
          <p>Contact admin to assign you a subject</p>
        </div>
      )}

      {selected && (
        <>
          <div style={d.examRow}>
            <label style={d.examLabel}>Select Exam:</label>
            <select style={{ ...s.select, minWidth: 260 }} value={selectedExam} onChange={e => handleExamChange(e.target.value)}>
              <option value="">— Choose exam —</option>
              {exams.map(e => (
                <option key={e.examId} value={e.examId}>{e.examName} · Term {e.term} · {e.academicYear}</option>
              ))}
            </select>
          </div>

          {loading && <div style={s.spinner}>Loading analytics...</div>}

          {analytics && !loading && (
            <>
              <div style={d.statRow}>
                {[
                  { label: 'Class Average', value: `${analytics.average}%`, color: '#3b82f6', icon: '📊' },
                  { label: 'Highest Score', value: analytics.highest, color: '#22c55e', icon: '🏆' },
                  { label: 'Lowest Score',  value: analytics.lowest,  color: '#ef4444', icon: '📉' },
                  { label: 'Students',      value: analytics.totalStudents, color: '#8b5cf6', icon: '👥' },
                ].map(card => (
                  <div key={card.label} style={d.statCard}>
                    <div style={d.statIcon}>{card.icon}</div>
                    <div style={{ ...d.statValue, color: card.color }}>{card.value}</div>
                    <div style={d.statLabel}>{card.label}</div>
                  </div>
                ))}
              </div>

              <div style={d.gradeRow}>
                {Object.entries(analytics.gradeDistribution || {}).map(([grade, count]) => (
                  <div key={grade} style={{ ...d.gradeBadge, borderColor: gradeColor(grade), color: gradeColor(grade) }}>
                    <span style={d.gradeLabel}>{grade}</span>
                    <span style={d.gradeCount}>{count} student{count > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 20, marginBottom: 20 }}>
                {barData && (
                  <div style={s.card}>
                    <h3 style={s.cardTitle}>📊 Student Scores — {selected.subject.subjectName}</h3>
                    <Bar data={barData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
                  </div>
                )}
                {pieData && Object.keys(analytics.gradeDistribution || {}).length > 0 && (
                  <div style={{ ...s.card, maxWidth: 320 }}>
                    <h3 style={s.cardTitle}>🥧 Grade Distribution</h3>
                    <Pie data={pieData} options={{ plugins: { legend: { position: 'bottom', labels: { color: t.chartText } } } }} />
                  </div>
                )}
              </div>

              {analytics.studentScores?.length > 0 && (
                <div style={s.card}>
                  <h3 style={s.cardTitle}>🏅 Student Rankings</h3>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr>{['#', 'Student', 'Score', 'Grade'].map(h => (
                          <th key={h} style={{ ...s.th, textAlign: 'center' }}>{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {analytics.studentScores.map((student, i) => (
                          <tr key={i} style={s.rowBg(i)}>
                            <td style={{ ...s.td, textAlign: 'center' }}>{i + 1}</td>
                            <td style={{ ...s.td, textAlign: 'left', fontWeight: 500 }}>{student.name}</td>
                            <td style={{ ...s.td, textAlign: 'center' }}><strong>{student.score}</strong></td>
                            <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, color: gradeColor(student.grade) }}>{student.grade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && !analytics && selectedExam && (
            <div style={{ ...s.empty, padding: '60px 20px' }}>
              <div style={{ fontSize: 48 }}>📝</div>
              <h3 style={{ color: t.text }}>No marks entered yet</h3>
              <p>Go to Enter Marks to add scores for this exam</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}