import { useEffect, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement,
         ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { getMyAssignments, getExams, getSubjectAnalytics } from '../../api/client';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function TeacherAnalyticsPage() {
  const [assignments,  setAssignments]  = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [exams,        setExams]        = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [analytics,    setAnalytics]    = useState(null);

  useEffect(() => {
    getMyAssignments().then(r => setAssignments(r.data));
    getExams().then(r => setExams(r.data));
  }, []);

  useEffect(() => {
    if (!selected || !selectedExam) return;
    getSubjectAnalytics(selectedExam, selected.subject.subjectId)
      .then(r => setAnalytics(r.data))
      .catch(() => toast.error('No data yet for this selection'));
  }, [selected, selectedExam]);

  const barData = analytics && {
    labels: (analytics.studentScores || []).map(s => s.name),
    datasets: [{
      label: 'Score',
      data: (analytics.studentScores || []).map(s => s.score),
      backgroundColor: (analytics.studentScores || []).map(s =>
        s.grade === 'EE' ? '#22c55e' : s.grade === 'ME' ? '#3b82f6' : s.grade === 'AE' ? '#f59e0b' : '#ef4444'),
      borderRadius: 4,
    }],
  };

  const pieData = analytics && {
    labels: Object.keys(analytics.gradeDistribution || {}),
    datasets: [{
      data: Object.values(analytics.gradeDistribution || {}),
      backgroundColor: ['#22c55e','#3b82f6','#f59e0b','#ef4444'],
    }],
  };

  return (
    <div>
      <h1 style={styles.pageTitle}>📈 My Subject Analytics</h1>

      <div style={styles.filters}>
        <select style={styles.select} value={selected?.assignmentId || ''}
          onChange={e => {
            const a = assignments.find(x => x.assignmentId == e.target.value);
            setSelected(a || null);
            setAnalytics(null);
          }}>
          <option value="">Select Subject & Class</option>
          {assignments.map(a => (
            <option key={a.assignmentId} value={a.assignmentId}>
              {a.subject.subjectName} — {a.classRoom.displayName}
            </option>
          ))}
        </select>

        <select style={styles.select} value={selectedExam}
          onChange={e => setSelectedExam(e.target.value)}>
          <option value="">Select Exam</option>
          {exams.filter(e => selected ? e.classRoom?.classId === selected.classRoom.classId : true)
            .map(e => <option key={e.examId} value={e.examId}>{e.examName} T{e.term} {e.academicYear}</option>)}
        </select>
      </div>

      {analytics && (
        <>
          {/* Summary Cards */}
          <div style={styles.statRow}>
            {[
              { label: 'Class Average', value: analytics.average, color: '#3b82f6' },
              { label: 'Highest Score', value: analytics.highest, color: '#22c55e' },
              { label: 'Lowest Score',  value: analytics.lowest,  color: '#ef4444' },
              { label: 'Total Students',value: analytics.totalStudents, color: '#8b5cf6' },
            ].map(s => (
              <div key={s.label} style={styles.statCard}>
                <div style={{ ...styles.statValue, color: s.color }}>{s.value}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={styles.chartsGrid}>
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Student Scores (Ranked)</h3>
              <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } },
                scales: { y: { min: 0, max: 100 } } }} />
            </div>
            <div style={{ ...styles.chartCard, maxWidth: 320 }}>
              <h3 style={styles.chartTitle}>Grade Distribution</h3>
              <Pie data={pieData} />
            </div>
          </div>
        </>
      )}

      {(!selected || !selectedExam) && (
        <div style={styles.empty}>Select a subject and exam to view analytics</div>
      )}
    </div>
  );
}

const styles = {
  pageTitle:  { fontSize: 24, fontWeight: 700, color: '#1e3a5f', marginBottom: 24 },
  filters:    { display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' },
  select:     { padding: '10px 14px', borderRadius: 8, border: '1.5px solid #dde3ea', fontSize: 14, minWidth: 240, background: '#fff' },
  statRow:    { display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' },
  statCard:   { flex: 1, minWidth: 140, background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', textAlign: 'center' },
  statValue:  { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  statLabel:  { fontSize: 12, color: '#888', fontWeight: 500 },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px,1fr))', gap: 24 },
  chartCard:  { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.06)' },
  chartTitle: { fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 16 },
  empty:      { textAlign: 'center', padding: 60, color: '#aaa', fontSize: 15 },
};
