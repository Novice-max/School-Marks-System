import { useEffect, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement,
         ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { getMyAssignments, getSubjectAnalytics } from '../../api/client';
import api from '../../api/client';
import { usePageStyles } from '../../styles/pageStyles';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function TeacherAnalyticsPage() {
  const s = usePageStyles();
  const t = s.tokens;

  const [assignments,  setAssignments]  = useState([]);
  const [exams,        setExams]        = useState([]);
  const [selected,     setSelected]     = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [analytics,    setAnalytics]    = useState(null);

  useEffect(() => { getMyAssignments().then(r => setAssignments(r.data)); }, []);

  const handleAssignmentChange = async (assignmentId) => {
    setSelected(assignmentId); setSelectedExam(''); setAnalytics(null);
    if (!assignmentId) return;
    const a = assignments.find(x => x.assignmentId == assignmentId);
    if (!a) return;
    try { const res = await api.get(`/teacher/exams/class/${a.classRoom.classId}`); setExams(res.data); }
    catch { toast.error('Failed to load exams'); }
  };

  const handleExamChange = async (examId) => {
    setSelectedExam(examId);
    if (!examId || !selected) return;
    const a = assignments.find(x => x.assignmentId == selected);
    if (!a) return;
    try { const res = await getSubjectAnalytics(examId, a.subject.subjectId); setAnalytics(res.data); }
    catch { toast.error('No data yet for this selection'); setAnalytics(null); }
  };

  const chartOpts = {
    responsive: true,
    plugins: { legend: { labels: { color: t.chartText } } },
    scales: {
      x: { ticks: { color: t.chartText }, grid: { color: t.chartGrid } },
      y: { ticks: { color: t.chartText }, grid: { color: t.chartGrid }, min: 0, max: 100 },
    },
  };

  const barData = analytics && {
    labels: (analytics.studentScores || []).map(sc => sc.name.split(' ')[0]),
    datasets: [{
      label: 'Score',
      data: (analytics.studentScores || []).map(sc => sc.score),
      backgroundColor: (analytics.studentScores || []).map(sc =>
        sc.grade === 'EE' ? '#22c55e' : sc.grade === 'ME' ? '#3b82f6' : sc.grade === 'AE' ? '#f59e0b' : '#ef4444'),
      borderRadius: 4,
    }],
  };

  const pieData = analytics && {
    labels: Object.keys(analytics.gradeDistribution || {}),
    datasets: [{
      data: Object.values(analytics.gradeDistribution || {}),
      backgroundColor: ['#22c55e','#3b82f6','#f59e0b','#ef4444'],
      borderWidth: 2, borderColor: t.surface,
    }],
  };

  return (
    <div>
      <h1 style={s.title}>📈 My Subject Analytics</h1>

      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <select style={{ ...s.select, minWidth: 240 }} value={selected} onChange={e => handleAssignmentChange(e.target.value)}>
          <option value="">Select Subject & Class</option>
          {assignments.map(a => (
            <option key={a.assignmentId} value={a.assignmentId}>
              {a.subject.subjectName} — {a.classRoom.displayName}
            </option>
          ))}
        </select>
        <select style={{ ...s.select, minWidth: 240 }} value={selectedExam} onChange={e => handleExamChange(e.target.value)}>
          <option value="">Select Exam</option>
          {exams.map(e => (
            <option key={e.examId} value={e.examId}>{e.examName} · T{e.term} · {e.academicYear}</option>
          ))}
        </select>
      </div>

      {analytics && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
            {[
              { label: 'Class Average',  value: analytics.average,      color: '#3b82f6' },
              { label: 'Highest Score',  value: analytics.highest,      color: '#22c55e' },
              { label: 'Lowest Score',   value: analytics.lowest,       color: '#ef4444' },
              { label: 'Total Students', value: analytics.totalStudents, color: '#8b5cf6' },
            ].map(card => (
              <div key={card.label} style={{
                flex: 1, minWidth: 140, ...s.card, padding: '20px 24px', textAlign: 'center', marginBottom: 0,
              }}>
                <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 12, color: t.textFaint, fontWeight: 500 }}>{card.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px,1fr))', gap: 24 }}>
            <div style={s.card}>
              <h3 style={s.cardTitle}>Student Scores (Ranked)</h3>
              <Bar data={barData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
            </div>
            <div style={{ ...s.card, maxWidth: 320 }}>
              <h3 style={s.cardTitle}>Grade Distribution</h3>
              <Pie data={pieData} options={{ plugins: { legend: { labels: { color: t.chartText } } } }} />
            </div>
          </div>
        </>
      )}

      {(!selected || !selectedExam) && (
        <div style={s.empty}>Select a subject and exam to view analytics</div>
      )}
    </div>
  );
}