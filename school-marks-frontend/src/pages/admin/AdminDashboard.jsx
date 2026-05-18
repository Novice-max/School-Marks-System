import { useEffect, useState, useMemo } from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import {
  getExams, getClasses, getTeachers, getStudentsByClass,
  getGradeDistribution, getFullMarklist
} from '../../api/client';
import api from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { usePageStyles } from '../../styles/pageStyles';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
);

const SUBJECT_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626',
  '#DB2777', '#0891B2', '#4F46E5', '#65A30D', '#EA580C',
  '#6D28D9', '#0284C7', '#15803D', '#B45309', '#BE123C',
  '#0D9488', '#7C2D12', '#4338CA', '#A16207', '#9333EA',
];

export default function AdminDashboard() {
  const { tokens, isDark } = useTheme();
  const s = usePageStyles();

  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, exams: 0 });
  const [subjectTrend, setSubjectTrend] = useState([]);
  const [gradeDist, setGradeDist] = useState({});
  const [comparison, setComparison] = useState(null);
  const [studentList, setStudentList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);
  const [compLoading, setCompLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      getTeachers().catch(() => ({ data: [] })),
      getClasses().catch(() => ({ data: [] })),
      getExams().catch(() => ({ data: [] })),
    ]).then(([teaR, clsR, exR]) => {
      const cls = clsR.data || [];
      const exs = exR.data || [];
      const teachers = teaR.data || [];
      setStats({
        students: 0,
        teachers: teachers.length,
        classes: cls.length,
        exams: exs.length,
      });
      setClasses(cls);
      setExams(exs);
      if (cls.length > 0) setSelectedClass(String(cls[0].classId));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    getStudentsByClass(selectedClass)
      .then(r => setStats(prev => ({ ...prev, students: (r.data || []).length })))
      .catch(() => {});
  }, [selectedClass]);

  const classExams = useMemo(() => {
    if (!selectedClass) return [];
    return exams.filter(e => {
      const examClassId = e.classRoom?.classId ?? e.classId;
      return String(examClassId) === selectedClass;
    });
  }, [exams, selectedClass]);

  useEffect(() => {
    if (classExams.length > 0) {
      setSelectedExam(String(classExams[0].examId));
    } else {
      setSelectedExam('');
      setGradeDist({});
      setStudentList([]);
      setComparison(null);
    }
    setSelectedStudent('');
  }, [classExams]);

  useEffect(() => {
    if (!selectedClass) return;
    setTrendLoading(true);
    api.get(`/admin/analytics/subject-trend/${selectedClass}`)
      .then(r => setSubjectTrend(r.data || []))
      .catch(() => setSubjectTrend([]))
      .finally(() => setTrendLoading(false));
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedExam) return;
    getGradeDistribution(selectedExam)
      .then(r => setGradeDist(r.data || {}))
      .catch(() => setGradeDist({}));

    getFullMarklist(selectedExam)
      .then(r => {
        const list = (r.data || []).map(st => ({
          id: st.studentId,
          name: st.fullName,
          avg: st.average,
        }));
        setStudentList(list);
        if (list.length > 0) setSelectedStudent(String(list[0].id));
      })
      .catch(() => setStudentList([]));
  }, [selectedExam]);

  useEffect(() => {
    if (!selectedExam || !selectedStudent) { setComparison(null); return; }
    setCompLoading(true);
    api.get(`/admin/analytics/student-comparison/${selectedExam}/${selectedStudent}`)
      .then(r => setComparison(r.data))
      .catch(() => setComparison(null))
      .finally(() => setCompLoading(false));
  }, [selectedExam, selectedStudent]);

  const trendChartData = useMemo(() => {
    if (!subjectTrend.length) return null;
    const labels = subjectTrend.map(e => `${e.examName} T${e.term}`);
    const allSubjects = new Set();
    subjectTrend.forEach(e => {
      if (e.subjects) Object.keys(e.subjects).forEach(s => allSubjects.add(s));
    });
    const subjects = [...allSubjects];
    const datasets = subjects.map((sub, i) => ({
      label: sub,
      data: subjectTrend.map(e => e.subjects?.[sub] ?? null),
      borderColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
      backgroundColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length] + '20',
      borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6, tension: 0.3, spanGaps: true,
    }));
    return { labels, datasets };
  }, [subjectTrend]);

  const pieData = useMemo(() => {
    const gradeOrder = ['EE1', 'EE2', 'ME1', 'ME2', 'AE1', 'AE2', 'BE1', 'BE2', 'N/A'];
    const gradeColors = {
      EE1: '#059669', EE2: '#34D399', ME1: '#2563EB', ME2: '#60A5FA',
      AE1: '#D97706', AE2: '#FBBF24', BE1: '#DC2626', BE2: '#F87171', 'N/A': '#9CA3AF'
    };
    const sorted = gradeOrder.filter(g => gradeDist[g]);
    return {
      labels: sorted,
      datasets: [{ data: sorted.map(g => gradeDist[g]), backgroundColor: sorted.map(g => gradeColors[g] || '#9CA3AF'), borderColor: tokens.surface, borderWidth: 2 }],
    };
  }, [gradeDist, tokens]);

  const compChartData = useMemo(() => {
    if (!comparison) return null;
    const subjects = Object.keys(comparison.classAverages || {});
    return {
      labels: subjects,
      datasets: [
        { label: studentList.find(st => String(st.id) === selectedStudent)?.name || 'Student', data: subjects.map(s => comparison.studentMarks?.[s] ?? 0), backgroundColor: isDark ? '#AFA9EC' : '#7C3AED', borderRadius: 4, barPercentage: 0.8, categoryPercentage: 0.7 },
        { label: 'Class Average', data: subjects.map(s => comparison.classAverages?.[s] ?? 0), backgroundColor: isDark ? '#555' : '#CBD5E1', borderRadius: 4, barPercentage: 0.8, categoryPercentage: 0.7 },
      ],
    };
  }, [comparison, selectedStudent, studentList, isDark]);

  const chartText = tokens.subtext;
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const lineOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: chartText, boxWidth: 12, padding: 12, font: { size: 11 } } }, tooltip: { mode: 'index', intersect: false } }, scales: { x: { ticks: { color: chartText, font: { size: 11 } }, grid: { color: gridColor } }, y: { min: 0, max: 100, ticks: { color: chartText, stepSize: 20 }, grid: { color: gridColor } } } };
  const barOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: chartText, boxWidth: 12, padding: 16, font: { size: 12 } } }, tooltip: { mode: 'index', intersect: false } }, scales: { x: { ticks: { color: chartText, font: { size: 10 }, maxRotation: 45, minRotation: 0 }, grid: { display: false } }, y: { min: 0, max: 100, ticks: { color: chartText, stepSize: 20 }, grid: { color: gridColor } } } };
  const pieOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: chartText, boxWidth: 10, padding: 8, font: { size: 11 } } } } };

  const classLabel = c => { const gl = c.gradeLevel; const name = gl === -1 ? 'PP1' : gl === 0 ? 'PP2' : `Grade ${gl}`; return `${name} — ${c.academicYear}`; };

  if (loading) return <div style={{ padding: 40, color: tokens.subtext }}>Loading dashboard...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: tokens.text, marginBottom: 20 }}>📊 Admin Dashboard</h1>

      <div style={styles.statGrid}>
        {[
          { label: 'Students', value: stats.students, icon: '👨‍🎓', color: '#7C3AED' },
          { label: 'Teachers', value: stats.teachers, icon: '👩‍🏫', color: '#2563EB' },
          { label: 'Classes', value: stats.classes, icon: '🏫', color: '#059669' },
          { label: 'Exams', value: stats.exams, icon: '📝', color: '#D97706' },
        ].map(card => (
          <div key={card.label} style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', borderLeft: `4px solid ${card.color}` }}>
            <span style={{ fontSize: 32 }}>{card.icon}</span>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: tokens.text }}>{card.value}</div>
              <div style={{ fontSize: 13, color: tokens.subtext }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: tokens.subtext, marginBottom: 4, display: 'block' }}>Select Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ ...s.input, width: '100%' }}>
            {classes.map(c => (<option key={c.classId} value={c.classId}>{classLabel(c)}</option>))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: tokens.subtext, marginBottom: 4, display: 'block' }}>Select Exam</label>
          <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} style={{ ...s.input, width: '100%' }}>
            {classExams.length === 0 && <option value="">No exams</option>}
            {classExams.map(e => (<option key={e.examId} value={e.examId}>{e.examName} — Term {e.term} {e.academicYear}</option>))}
          </select>
        </div>
      </div>

      <div style={styles.chartRow}>
        <div style={{ ...s.card, flex: 2, minWidth: 300, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: tokens.text, marginBottom: 4 }}>📈 Subject Performance Across Exams</h3>
          <p style={{ fontSize: 12, color: tokens.subtext, marginBottom: 16 }}>Average score per subject across all exams in this class</p>
          <div style={{ height: 320 }}>
            {trendLoading ? <div style={styles.placeholder(tokens)}>Loading trends...</div> : trendChartData && trendChartData.datasets.length > 0 ? <Line data={trendChartData} options={lineOptions} /> : <div style={styles.placeholder(tokens)}>No trend data available</div>}
          </div>
        </div>
        <div style={{ ...s.card, flex: 1, minWidth: 260, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: tokens.text, marginBottom: 4 }}>🎯 Grade Distribution</h3>
          <p style={{ fontSize: 12, color: tokens.subtext, marginBottom: 16 }}>{classExams.find(e => String(e.examId) === selectedExam)?.examName || 'Selected exam'}</p>
          <div style={{ height: 320 }}>
            {pieData.labels.length > 0 ? <Pie data={pieData} options={pieOptions} /> : <div style={styles.placeholder(tokens)}>No grade data</div>}
          </div>
        </div>
      </div>

      <div style={{ ...s.card, padding: 24, marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: tokens.text, marginBottom: 4 }}>👤 Student vs Class Average</h3>
            <p style={{ fontSize: 12, color: tokens.subtext }}>Compare individual performance against class benchmarks</p>
          </div>
          <div style={{ minWidth: 220 }}>
            <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} style={{ ...s.input, width: '100%' }}>
              {studentList.length === 0 && <option value="">No students</option>}
              {studentList.map(st => (<option key={st.id} value={st.id}>{st.name} ({st.avg ? st.avg.toFixed(1) : '—'}%)</option>))}
            </select>
          </div>
        </div>

        {comparison && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <Badge label="Student Avg" value={comparison.studentAverage?.toFixed(1) || '—'} color="#7C3AED" tokens={tokens} />
            <Badge label="Class Avg" value={typeof comparison.classAverage === 'number' ? comparison.classAverage.toFixed(1) : '—'} color="#64748B" tokens={tokens} />
            <Badge label="Position" value={comparison.position ? `${comparison.position} / ${comparison.totalStudents}` : '—'} color="#059669" tokens={tokens} />
            {comparison.studentAverage && comparison.classAverage && (
              <Badge label="vs Class" value={`${(comparison.studentAverage - comparison.classAverage) >= 0 ? '+' : ''}${(comparison.studentAverage - comparison.classAverage).toFixed(1)}`} color={(comparison.studentAverage - comparison.classAverage) >= 0 ? '#059669' : '#DC2626'} tokens={tokens} />
            )}
          </div>
        )}

        <div style={{ height: 320 }}>
          {compLoading ? <div style={styles.placeholder(tokens)}>Loading comparison...</div> : compChartData && compChartData.labels.length > 0 ? <Bar data={compChartData} options={barOptions} /> : <div style={styles.placeholder(tokens)}>{selectedStudent ? 'No marks found for this student' : 'Select a student to compare'}</div>}
        </div>

        {comparison && Object.keys(comparison.classAverages || {}).length > 0 && (
          <div style={{ marginTop: 16, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>
                <th style={thStyle(tokens)}>Subject</th>
                <th style={{ ...thStyle(tokens), textAlign: 'center' }}>Student</th>
                <th style={{ ...thStyle(tokens), textAlign: 'center' }}>Class Avg</th>
                <th style={{ ...thStyle(tokens), textAlign: 'center' }}>Diff</th>
                <th style={{ ...thStyle(tokens), textAlign: 'center' }}>Status</th>
              </tr></thead>
              <tbody>
                {Object.keys(comparison.classAverages).map((sub, i) => {
                  const stuScore = comparison.studentMarks?.[sub];
                  const clsAvg = comparison.classAverages[sub];
                  const diff = stuScore != null ? (stuScore - clsAvg) : null;
                  return (
                    <tr key={sub} style={{ background: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') }}>
                      <td style={tdStyle(tokens)}>{sub}</td>
                      <td style={{ ...tdStyle(tokens), textAlign: 'center', fontWeight: 600 }}>{stuScore != null ? stuScore.toFixed(1) : '—'}</td>
                      <td style={{ ...tdStyle(tokens), textAlign: 'center', color: tokens.subtext }}>{clsAvg.toFixed(1)}</td>
                      <td style={{ ...tdStyle(tokens), textAlign: 'center', fontWeight: 600, color: diff != null ? (diff >= 0 ? '#059669' : '#DC2626') : tokens.subtext }}>{diff != null ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}` : '—'}</td>
                      <td style={{ ...tdStyle(tokens), textAlign: 'center' }}>
                        {diff != null ? (
                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: diff >= 5 ? '#DCFCE7' : diff >= 0 ? '#FEF9C3' : diff >= -5 ? '#FFF7ED' : '#FEE2E2', color: diff >= 5 ? '#166534' : diff >= 0 ? '#854D0E' : diff >= -5 ? '#9A3412' : '#991B1B' }}>
                            {diff >= 5 ? '▲ Strong' : diff >= 0 ? '● On Track' : diff >= -5 ? '▽ Below' : '▼ Needs Support'}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ label, value, color, tokens }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 20px', borderRadius: 12, background: color + '12', border: `1px solid ${color}30`, minWidth: 100 }}>
      <span style={{ fontSize: 20, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 11, color: tokens.subtext, marginTop: 2 }}>{label}</span>
    </div>
  );
}

function thStyle(tokens) { return { padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: tokens.subtext, borderBottom: `2px solid ${tokens.border}` }; }
function tdStyle(tokens) { return { padding: '8px 12px', color: tokens.text, borderBottom: `1px solid ${tokens.border}` }; }

const styles = {
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 },
  chartRow: { display: 'flex', gap: 20, flexWrap: 'wrap' },
  placeholder: (tokens) => ({ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.subtext, fontSize: 14 }),
};