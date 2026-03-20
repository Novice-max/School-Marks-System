import { useEffect, useState } from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
         PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { getExams, getClasses, getSubjectAverages, getGradeDistribution, getClassTrend } from '../../api/client';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement,
                 PointElement, LineElement, Title, Tooltip, Legend);

export default function AdminDashboard() {
  const [exams,        setExams]        = useState([]);
  const [classes,      setClasses]      = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass,setSelectedClass]= useState('');
  const [subjAvg,      setSubjAvg]      = useState([]);
  const [gradeDist,    setGradeDist]    = useState({});
  const [trend,        setTrend]        = useState([]);

  useEffect(() => {
    getExams().then(r  => setExams(r.data)).catch(() => toast.error('Failed to load exams'));
    getClasses().then(r=> setClasses(r.data)).catch(() => toast.error('Failed to load classes'));
  }, []);

  useEffect(() => {
    if (!selectedExam || !selectedClass) return;
    getSubjectAverages(selectedExam, selectedClass)
      .then(r => setSubjAvg(r.data))
      .catch(() => toast.error('Failed to load averages'));
    getGradeDistribution(selectedExam)
      .then(r => setGradeDist(r.data))
      .catch(() => {});
  }, [selectedExam, selectedClass]);

  useEffect(() => {
    if (!selectedClass) return;
    getClassTrend(selectedClass)
      .then(r => setTrend(r.data))
      .catch(() => {});
  }, [selectedClass]);

  const barData = {
    labels: subjAvg.map(s => s.subject),
    datasets: [{ label: 'Average Score', data: subjAvg.map(s => s.average),
      backgroundColor: subjAvg.map(s =>
        s.average >= 80 ? '#22c55e' : s.average >= 60 ? '#3b82f6' : s.average >= 40 ? '#f59e0b' : '#ef4444'),
      borderRadius: 6 }],
  };

  const pieData = {
    labels: Object.keys(gradeDist),
    datasets: [{ data: Object.values(gradeDist),
      backgroundColor: ['#22c55e','#3b82f6','#f59e0b','#ef4444'],
      borderWidth: 2 }],
  };

  const lineData = {
    labels: trend.map(t => `${t.examName} T${t.term}`),
    datasets: [{ label: 'Class Average', data: trend.map(t => t.classAverage),
      borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.12)',
      tension: 0.4, fill: true, pointRadius: 5 }],
  };

  return (
    <div>
      <h1 style={styles.pageTitle}>📊 Admin Dashboard</h1>

      {/* Filters */}
      <div style={styles.filters}>
        <select style={styles.select} value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}>
          <option value="">Select Class</option>
          {classes.map(c => (
            <option key={c.classId} value={c.classId}>{c.displayName} ({c.academicYear})</option>
          ))}
        </select>

        <select style={styles.select} value={selectedExam}
          onChange={e => setSelectedExam(e.target.value)}>
          <option value="">Select Exam</option>
          {exams.filter(e => !selectedClass || e.classRoom?.classId == selectedClass)
            .map(e => (
            <option key={e.examId} value={e.examId}>{e.examName} — Term {e.term} {e.academicYear}</option>
          ))}
        </select>
      </div>

      {/* Charts */}
      <div style={styles.chartsGrid}>
        {subjAvg.length > 0 && (
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Subject Averages</h3>
            <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </div>
        )}

        {Object.keys(gradeDist).length > 0 && (
          <div style={{ ...styles.chartCard, maxWidth: 340 }}>
            <h3 style={styles.chartTitle}>Grade Distribution</h3>
            <Pie data={pieData} />
          </div>
        )}

        {trend.length > 0 && (
          <div style={{ ...styles.chartCard, gridColumn: '1/-1' }}>
            <h3 style={styles.chartTitle}>Class Performance Trend</h3>
            <Line data={lineData} options={{ responsive: true }} />
          </div>
        )}
      </div>

      {(!selectedClass || !selectedExam) && (
        <div style={styles.emptyState}>
          Select a class and exam above to see analytics
        </div>
      )}
    </div>
  );
}

const styles = {
  pageTitle:  { fontSize: 24, fontWeight: 700, color: '#1e3a5f', marginBottom: 24 },
  filters:    { display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' },
  select:     { padding: '10px 14px', borderRadius: 8, border: '1.5px solid #dde3ea', fontSize: 14, minWidth: 220, background: '#fff' },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px,1fr))', gap: 24 },
  chartCard:  { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.06)' },
  chartTitle: { fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 16 },
  emptyState: { textAlign: 'center', padding: 60, color: '#aaa', fontSize: 15 },
};
