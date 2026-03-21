import { useEffect, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement,
         ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { getMyAssignments, getExams, getSubjectAnalytics } from '../../api/client';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function TeacherDashboard() {
  const { user } = useAuth();
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
        // Auto-select first assignment
        if (r.data.length > 0) selectAssignment(r.data[0]);
      })
      .catch(() => toast.error('Failed to load assignments'));
  }, []);

  const selectAssignment = async (a) => {
    setSelected(a);
    setSelectedExam('');
    setAnalytics(null);
    try {
      const res = await api.get(`/teacher/exams/class/${a.classRoom.classId}`);
      setExams(res.data);
      // Auto-select first exam if available
      if (res.data.length > 0) {
        setSelectedExam(String(res.data[0].examId));
        loadAnalytics(res.data[0].examId, a.subject.subjectId);
      }
    } catch { toast.error('Failed to load exams'); }
  };

  const loadAnalytics = async (examId, subjectId) => {
    setLoading(true);
    try {
      const res = await getSubjectAnalytics(examId, subjectId);
      setAnalytics(res.data);
    } catch { setAnalytics(null); }
    finally { setLoading(false); }
  };

  const handleExamChange = (examId) => {
    setSelectedExam(examId);
    if (examId && selected) loadAnalytics(examId, selected.subject.subjectId);
  };

  const barData = analytics && {
    labels: (analytics.studentScores || []).map(s => s.name.split(' ')[0]),
    datasets: [{
      label: 'Score',
      data: (analytics.studentScores || []).map(s => s.score),
      backgroundColor: (analytics.studentScores || []).map(s =>
        s.grade === 'EE' ? '#22c55e' : s.grade === 'ME' ? '#3b82f6' :
        s.grade === 'AE' ? '#f59e0b' : '#ef4444'),
      borderRadius: 6,
    }],
  };

  const pieData = analytics && {
    labels: Object.keys(analytics.gradeDistribution || {}),
    datasets: [{
      data: Object.values(analytics.gradeDistribution || {}),
      backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
      borderWidth: 2,
    }],
  };

  const gradeColor = g => ({ EE:'#22c55e', ME:'#3b82f6', AE:'#f59e0b', BE:'#ef4444' }[g] || '#888');

  return (
    <div>
      {/* Welcome header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>👋 Welcome, {user?.fullName?.split(' ')[0]}</h1>
          <p style={s.sub}>Here's your subject performance overview</p>
        </div>
      </div>

      {/* Assignment tabs */}
      {assignments.length > 0 && (
        <div style={s.tabs}>
          {assignments.map(a => (
            <button
              key={a.assignmentId}
              style={{ ...s.tab, ...(selected?.assignmentId === a.assignmentId ? s.tabActive : {}) }}
              onClick={() => selectAssignment(a)}
            >
              <div style={s.tabSubject}>{a.subject.subjectName}</div>
              <div style={s.tabClass}>{a.classRoom.displayName} · T{a.term}</div>
            </button>
          ))}
        </div>
      )}

      {assignments.length === 0 && (
        <div style={s.empty}>
          <div style={{ fontSize: 48 }}>📋</div>
          <h3>No subjects assigned yet</h3>
          <p>Contact admin to assign you a subject</p>
        </div>
      )}

      {selected && (
        <>
          {/* Exam selector */}
          <div style={s.examRow}>
            <label style={s.examLabel}>Select Exam:</label>
            <select style={s.select} value={selectedExam} onChange={e => handleExamChange(e.target.value)}>
              <option value="">— Choose exam —</option>
              {exams.map(e => (
                <option key={e.examId} value={e.examId}>{e.examName} · Term {e.term} · {e.academicYear}</option>
              ))}
            </select>
          </div>

          {loading && <div style={s.loading}>Loading analytics...</div>}

          {analytics && !loading && (
            <>
              {/* Stat cards */}
              <div style={s.statRow}>
                {[
                  { label: 'Class Average', value: `${analytics.average}%`, color: '#3b82f6', icon: '📊' },
                  { label: 'Highest Score', value: analytics.highest, color: '#22c55e', icon: '🏆' },
                  { label: 'Lowest Score',  value: analytics.lowest,  color: '#ef4444', icon: '📉' },
                  { label: 'Students',      value: analytics.totalStudents, color: '#8b5cf6', icon: '👥' },
                ].map(card => (
                  <div key={card.label} style={s.statCard}>
                    <div style={s.statIcon}>{card.icon}</div>
                    <div style={{ ...s.statValue, color: card.color }}>{card.value}</div>
                    <div style={s.statLabel}>{card.label}</div>
                  </div>
                ))}
              </div>

              {/* Grade distribution badges */}
              <div style={s.gradeRow}>
                {Object.entries(analytics.gradeDistribution || {}).map(([grade, count]) => (
                  <div key={grade} style={{ ...s.gradeBadge, borderColor: gradeColor(grade), color: gradeColor(grade) }}>
                    <span style={s.gradeLabel}>{grade}</span>
                    <span style={s.gradeCount}>{count} student{count > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div style={s.chartsGrid}>
                {barData && (
                  <div style={s.chartCard}>
                    <h3 style={s.chartTitle}>📊 Student Scores — {selected.subject.subjectName}</h3>
                    <Bar data={barData} options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                      scales: { y: { min: 0, max: 100, grid: { color: '#f0f4f8' } } }
                    }} />
                  </div>
                )}

                {pieData && Object.keys(analytics.gradeDistribution || {}).length > 0 && (
                  <div style={{ ...s.chartCard, maxWidth: 320 }}>
                    <h3 style={s.chartTitle}>🥧 Grade Distribution</h3>
                    <Pie data={pieData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                  </div>
                )}
              </div>

              {/* Student ranking table */}
              {analytics.studentScores?.length > 0 && (
                <div style={s.card}>
                  <h3 style={s.chartTitle}>🏅 Student Rankings</h3>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {['#', 'Student', 'Score', 'Grade'].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.studentScores.map((student, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                          <td style={s.td}>{i + 1}</td>
                          <td style={{ ...s.td, textAlign: 'left', fontWeight: 500 }}>{student.name}</td>
                          <td style={s.td}><strong>{student.score}</strong></td>
                          <td style={{ ...s.td, fontWeight: 700, color: gradeColor(student.grade) }}>{student.grade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {!loading && !analytics && selectedExam && (
            <div style={s.empty}>
              <div style={{ fontSize: 48 }}>📝</div>
              <h3>No marks entered yet</h3>
              <p>Go to Enter Marks to add scores for this exam</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const s = {
  header:     { marginBottom: 24 },
  title:      { fontSize: 26, fontWeight: 700, color: '#1e3a5f', marginBottom: 4 },
  sub:        { fontSize: 14, color: '#888' },
  tabs:       { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 },
  tab:        { padding: '12px 18px', borderRadius: 10, border: '2px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', textAlign: 'left', minWidth: 160 },
  tabActive:  { borderColor: '#1e5fa0', background: '#eff6ff' },
  tabSubject: { fontWeight: 700, color: '#1e3a5f', fontSize: 14 },
  tabClass:   { color: '#777', fontSize: 12, marginTop: 2 },
  examRow:    { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, background: '#fff', padding: '16px 20px', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,.05)' },
  examLabel:  { fontSize: 14, fontWeight: 600, color: '#555', whiteSpace: 'nowrap' },
  select:     { padding: '9px 14px', borderRadius: 8, border: '1.5px solid #dde3ea', fontSize: 14, minWidth: 260, background: '#fff' },
  loading:    { textAlign: 'center', padding: 40, color: '#888', fontSize: 15 },
  statRow:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 20 },
  statCard:   { background: '#fff', borderRadius: 12, padding: '20px 16px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', textAlign: 'center' },
  statIcon:   { fontSize: 24, marginBottom: 8 },
  statValue:  { fontSize: 26, fontWeight: 800, marginBottom: 4 },
  statLabel:  { fontSize: 12, color: '#888', fontWeight: 500 },
  gradeRow:   { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 },
  gradeBadge: { padding: '8px 20px', borderRadius: 30, border: '2px solid', display: 'flex', gap: 8, alignItems: 'center' },
  gradeLabel: { fontWeight: 800, fontSize: 16 },
  gradeCount: { fontSize: 13, fontWeight: 500 },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 20, marginBottom: 20 },
  chartCard:  { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.06)' },
  chartTitle: { fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 16 },
  card:       { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.06)', marginBottom: 20 },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th:         { background: '#1e3a5f', color: '#fff', padding: '10px 14px', textAlign: 'center', fontWeight: 600 },
  td:         { padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid #f0f4f8' },
  empty:      { textAlign: 'center', padding: '60px 20px', color: '#aaa' },
};
