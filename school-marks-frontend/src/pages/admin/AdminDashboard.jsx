import { useEffect, useState } from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
         PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { getExams, getClasses, getSubjectAverages, getGradeDistribution, getClassTrend } from '../../api/client';
import { usePageStyles } from '../../styles/pageStyles';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement,
                 PointElement, LineElement, Title, Tooltip, Legend);

export default function AdminDashboard() {
  const s = usePageStyles();
  const t = s.tokens;

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
      .then(r => setSubjAvg(r.data)).catch(() => toast.error('Failed to load averages'));
    getGradeDistribution(selectedExam)
      .then(r => setGradeDist(r.data)).catch(() => {});
  }, [selectedExam, selectedClass]);

  useEffect(() => {
    if (!selectedClass) return;
    getClassTrend(selectedClass).then(r => setTrend(r.data)).catch(() => {});
  }, [selectedClass]);

  const chartOpts = {
    responsive: true,
    plugins: { legend: { labels: { color: t.chartText } } },
    scales: {
      x: { ticks: { color: t.chartText }, grid: { color: t.chartGrid } },
      y: { ticks: { color: t.chartText }, grid: { color: t.chartGrid } },
    },
  };

  const barData = {
    labels: subjAvg.map(sa => sa.subject),
    datasets: [{
      label: 'Average Score',
      data: subjAvg.map(sa => sa.average),
      backgroundColor: subjAvg.map(sa =>
        sa.average >= 80 ? '#22c55e' : sa.average >= 60 ? '#3b82f6' : sa.average >= 40 ? '#f59e0b' : '#ef4444'),
      borderRadius: 6,
    }],
  };

  const pieData = {
    labels: Object.keys(gradeDist),
    datasets: [{
      data: Object.values(gradeDist),
      backgroundColor: ['#22c55e','#3b82f6','#f59e0b','#ef4444'],
      borderWidth: 2, borderColor: t.surface,
    }],
  };

  const lineData = {
    labels: trend.map(tr => `${tr.examName} T${tr.term}`),
    datasets: [{
      label: 'Class Average', data: trend.map(tr => tr.classAverage),
      borderColor: t.accent, backgroundColor: t.accentSubtle,
      tension: 0.4, fill: true, pointRadius: 5,
    }],
  };

  return (
    <div>
      <h1 style={s.title}>📊 Admin Dashboard</h1>

      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        <select style={s.select} value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}>
          <option value="">Select Class</option>
          {classes.map(c => (
            <option key={c.classId} value={c.classId}>{c.displayName} ({c.academicYear})</option>
          ))}
        </select>
        <select style={s.select} value={selectedExam}
          onChange={e => setSelectedExam(e.target.value)}>
          <option value="">Select Exam</option>
          {exams.filter(e => !selectedClass || e.classRoom?.classId == selectedClass).map(e => (
            <option key={e.examId} value={e.examId}>{e.examName} — Term {e.term} {e.academicYear}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px,1fr))', gap: 24 }}>
        {subjAvg.length > 0 && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>Subject Averages</h3>
            <Bar data={barData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
          </div>
        )}
        {Object.keys(gradeDist).length > 0 && (
          <div style={{ ...s.card, maxWidth: 340 }}>
            <h3 style={s.cardTitle}>Grade Distribution</h3>
            <Pie data={pieData} options={{ plugins: { legend: { labels: { color: t.chartText } } } }} />
          </div>
        )}
        {trend.length > 0 && (
          <div style={{ ...s.card, gridColumn: '1/-1' }}>
            <h3 style={s.cardTitle}>Class Performance Trend</h3>
            <Line data={lineData} options={chartOpts} />
          </div>
        )}
      </div>

      {(!selectedClass || !selectedExam) && (
        <div style={s.empty}>Select a class and exam above to see analytics</div>
      )}
    </div>
  );
}