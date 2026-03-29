import { useEffect, useState } from 'react';
import { getClasses, downloadMarklist, downloadMarksheet } from '../api/client';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function savePdf(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const classLabel = c =>
  c.gradeLevel === -1 ? 'PP1 (Pre-Primary 1)' :
  c.gradeLevel === 0  ? 'PP2 (Pre-Primary 2)' :
  c.gradeLevel <= 6   ? `Grade ${c.gradeLevel} (Primary)` :
                        `Grade ${c.gradeLevel} (JSS)`;

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'ADMIN';

  const [classes,    setClasses]    = useState([]);
  const [exams,      setExams]      = useState([]);
  const [students,   setStudents]   = useState([]);
  const [selClass,   setSelClass]   = useState('');
  const [selExam,    setSelExam]    = useState('');
  const [selStudent, setSelStudent] = useState('');
  const [loading,    setLoading]    = useState('');

  const [schoolYear, setSchoolYear] = useState(new Date().getFullYear().toString());
  const [schoolTerm, setSchoolTerm] = useState('1');
  const [schoolExam, setSchoolExam] = useState('Opener');

  useEffect(() => {
    if (isAdmin) {
      getClasses().then(r => setClasses(r.data));
    } else {
      api.get('/teacher/assignments').then(r => {
        const seen = new Set();
        const uniqueClasses = [];
        r.data.forEach(a => {
          if (!seen.has(a.classRoom.classId)) {
            seen.add(a.classRoom.classId);
            uniqueClasses.push(a.classRoom);
          }
        });
        setClasses(uniqueClasses);
      });
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!selClass) { setExams([]); setStudents([]); return; }
    const endpoint = isAdmin ? `/admin/exams` : `/teacher/exams/class/${selClass}`;
    api.get(endpoint).then(r => {
      const filtered = isAdmin ? r.data.filter(e => e.classRoom?.classId == selClass) : r.data;
      setExams(filtered);
    });
    const studEndpoint = isAdmin ? `/admin/students/class/${selClass}` : `/teacher/students/class/${selClass}`;
    api.get(studEndpoint).then(r => setStudents(r.data));
  }, [selClass, isAdmin]);

  const dlMarklist = async () => {
    if (!selExam) { toast.error('Select an exam'); return; }
    setLoading('list');
    try {
      const { data } = await downloadMarklist(selExam);
      savePdf(data, `marklist_exam_${selExam}.pdf`);
      toast.success('Marklist downloaded');
    } catch { toast.error('Failed to generate marklist'); }
    finally { setLoading(''); }
  };

  const dlMarksheet = async () => {
    if (!selExam || !selStudent) { toast.error('Select exam and student'); return; }
    setLoading('sheet');
    try {
      const { data } = await downloadMarksheet(selStudent, selExam);
      savePdf(data, `marksheet_student_${selStudent}.pdf`);
      toast.success('Marksheet downloaded');
    } catch { toast.error('Failed to generate marksheet'); }
    finally { setLoading(''); }
  };

  const dlSchoolReport = async () => {
    setLoading('school');
    try {
      const { data } = await api.get(
        `/reports/school/${schoolYear}/${schoolTerm}/${schoolExam}`,
        { responseType: 'blob' }
      );
      savePdf(data, `school_report_${schoolYear}_term${schoolTerm}.pdf`);
      toast.success('School report downloaded');
    } catch { toast.error('Failed — ensure exams exist for the selected period'); }
    finally { setLoading(''); }
  };

  return (
    <div>
      <h1 style={s.pageTitle}>📄 Reports</h1>

      <div style={s.grid}>
        {/* Class Marklist */}
        <div style={s.card}>
          <div style={s.cardIcon}>📋</div>
          <h3 style={s.cardTitle}>Class Marklist</h3>
          <p style={s.cardDesc}>Full marklist with positions, averages and grades</p>

          <label style={s.label}>Class</label>
          <select style={s.select} value={selClass} onChange={e => { setSelClass(e.target.value); setSelExam(''); }}>
            <option value="">Select class</option>
            {classes.map(c => (
              <option key={c.classId} value={c.classId}>{classLabel(c)} {c.academicYear ? `(${c.academicYear})` : ''}</option>
            ))}
          </select>

          <label style={s.label}>Exam</label>
          <select style={s.select} value={selExam} onChange={e => setSelExam(e.target.value)}>
            <option value="">Select exam</option>
            {exams.map(e => <option key={e.examId} value={e.examId}>{e.examName} T{e.term} {e.academicYear}</option>)}
          </select>

          <button style={s.btn} onClick={dlMarklist} disabled={loading === 'list'}>
            {loading === 'list' ? 'Generating...' : '⬇️ Download PDF'}
          </button>
        </div>

        {/* Student Report Card */}
        <div style={s.card}>
          <div style={s.cardIcon}>👤</div>
          <h3 style={s.cardTitle}>Student Report Card</h3>
          <p style={s.cardDesc}>Individual marksheet with grades and class position</p>

          <label style={s.label}>Class</label>
          <select style={s.select} value={selClass} onChange={e => { setSelClass(e.target.value); setSelStudent(''); setSelExam(''); }}>
            <option value="">Select class</option>
            {classes.map(c => (
              <option key={c.classId} value={c.classId}>{classLabel(c)} {c.academicYear ? `(${c.academicYear})` : ''}</option>
            ))}
          </select>

          <label style={s.label}>Student</label>
          <select style={s.select} value={selStudent} onChange={e => setSelStudent(e.target.value)}>
            <option value="">Select student</option>
            {students.map(st => (
              <option key={st.studentId} value={st.studentId}>{st.firstName} {st.lastName} ({st.admissionNumber})</option>
            ))}
          </select>

          <label style={s.label}>Exam</label>
          <select style={s.select} value={selExam} onChange={e => setSelExam(e.target.value)}>
            <option value="">Select exam</option>
            {exams.map(e => <option key={e.examId} value={e.examId}>{e.examName} T{e.term} {e.academicYear}</option>)}
          </select>

          <button style={s.btn} onClick={dlMarksheet} disabled={loading === 'sheet'}>
            {loading === 'sheet' ? 'Generating...' : '⬇️ Download PDF'}
          </button>
        </div>

        {/* School-wide report — admin only */}
        {isAdmin && (
          <div style={{ ...s.card, borderTop: '4px solid #7c3aed' }}>
            <div style={s.cardIcon}>🏫</div>
            <h3 style={s.cardTitle}>School-Wide Report</h3>
            <p style={s.cardDesc}>Complete report for all classes (PP1–Grade 9) for a given exam period</p>

            <label style={s.label}>Academic Year</label>
            <input style={s.select} type="text" value={schoolYear}
              onChange={e => setSchoolYear(e.target.value)} placeholder="e.g. 2026" />

            <label style={s.label}>Term</label>
            <select style={s.select} value={schoolTerm} onChange={e => setSchoolTerm(e.target.value)}>
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>

            <label style={s.label}>Exam</label>
            <select style={s.select} value={schoolExam} onChange={e => setSchoolExam(e.target.value)}>
              <option>Opener</option>
              <option>Mid-Term</option>
              <option>End-Term</option>
            </select>

            <button style={{ ...s.btn, background: '#7c3aed' }} onClick={dlSchoolReport} disabled={loading === 'school'}>
              {loading === 'school' ? 'Generating...' : '⬇️ Download School Report'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  pageTitle: { fontSize: 24, fontWeight: 700, color: '#1e3a5f', marginBottom: 24 },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: 24 },
  card:      { background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', gap: 10 },
  cardIcon:  { fontSize: 36 },
  cardTitle: { fontSize: 17, fontWeight: 700, color: '#1e3a5f' },
  cardDesc:  { fontSize: 13, color: '#888', marginBottom: 8 },
  label:     { fontSize: 12, fontWeight: 600, color: '#555' },
  select:    { padding: '9px 12px', borderRadius: 8, border: '1.5px solid #dde3ea', fontSize: 13, background: '#fff' },
  btn:       { marginTop: 8, padding: '11px', background: '#1e5fa0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
};