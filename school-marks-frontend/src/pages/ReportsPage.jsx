import { useEffect, useState } from 'react';
import { getExams, getStudentsByClass, getClasses, downloadMarklist, downloadMarksheet }  from "../api/client";
import toast from 'react-hot-toast';

function savePdf(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [classes,      setClasses]      = useState([]);
  const [exams,        setExams]        = useState([]);
  const [students,     setStudents]     = useState([]);
  const [selClass,     setSelClass]     = useState('');
  const [selExam,      setSelExam]      = useState('');
  const [selStudent,   setSelStudent]   = useState('');
  const [loading,      setLoading]      = useState('');

  useEffect(() => {
    getClasses().then(r => setClasses(r.data));
    getExams().then(r   => setExams(r.data));
  }, []);

  useEffect(() => {
    if (!selClass) return;
    getStudentsByClass(selClass).then(r => setStudents(r.data));
  }, [selClass]);

  const dlMarklist = async () => {
    if (!selExam) { toast.error('Select an exam first'); return; }
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

  return (
    <div>
      <h1 style={styles.pageTitle}>📄 Reports</h1>

      <div style={styles.grid}>
        {/* Class Marklist */}
        <div style={styles.card}>
          <div style={styles.cardIcon}>📋</div>
          <h3 style={styles.cardTitle}>Class Marklist</h3>
          <p style={styles.cardDesc}>Full marklist for a class with positions, averages and grades</p>

          <label style={styles.label}>Class</label>
          <select style={styles.select} value={selClass} onChange={e => setSelClass(e.target.value)}>
            <option value="">Select class</option>
            {classes.map(c => <option key={c.classId} value={c.classId}>{c.displayName} ({c.academicYear})</option>)}
          </select>

          <label style={styles.label}>Exam</label>
          <select style={styles.select} value={selExam} onChange={e => setSelExam(e.target.value)}>
            <option value="">Select exam</option>
            {exams.filter(e => !selClass || e.classRoom?.classId == selClass)
              .map(e => <option key={e.examId} value={e.examId}>{e.examName} T{e.term} {e.academicYear}</option>)}
          </select>

          <button style={styles.btn} onClick={dlMarklist} disabled={loading === 'list'}>
            {loading === 'list' ? 'Generating...' : '⬇️ Download PDF'}
          </button>
        </div>

        {/* Student Marksheet */}
        <div style={styles.card}>
          <div style={styles.cardIcon}>👤</div>
          <h3 style={styles.cardTitle}>Student Report Card</h3>
          <p style={styles.cardDesc}>Individual student marksheet with subject grades and class position</p>

          <label style={styles.label}>Class</label>
          <select style={styles.select} value={selClass} onChange={e => { setSelClass(e.target.value); setSelStudent(''); }}>
            <option value="">Select class</option>
            {classes.map(c => <option key={c.classId} value={c.classId}>{c.displayName} ({c.academicYear})</option>)}
          </select>

          <label style={styles.label}>Student</label>
          <select style={styles.select} value={selStudent} onChange={e => setSelStudent(e.target.value)}>
            <option value="">Select student</option>
            {students.map(s => <option key={s.studentId} value={s.studentId}>{s.firstName} {s.lastName} ({s.admissionNumber})</option>)}
          </select>

          <label style={styles.label}>Exam</label>
          <select style={styles.select} value={selExam} onChange={e => setSelExam(e.target.value)}>
            <option value="">Select exam</option>
            {exams.filter(e => !selClass || e.classRoom?.classId == selClass)
              .map(e => <option key={e.examId} value={e.examId}>{e.examName} T{e.term} {e.academicYear}</option>)}
          </select>

          <button style={styles.btn} onClick={dlMarksheet} disabled={loading === 'sheet'}>
            {loading === 'sheet' ? 'Generating...' : '⬇️ Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageTitle: { fontSize: 24, fontWeight: 700, color: '#1e3a5f', marginBottom: 24 },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 24 },
  card:      { background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', gap: 10 },
  cardIcon:  { fontSize: 36 },
  cardTitle: { fontSize: 17, fontWeight: 700, color: '#1e3a5f' },
  cardDesc:  { fontSize: 13, color: '#888', marginBottom: 8 },
  label:     { fontSize: 12, fontWeight: 600, color: '#555' },
  select:    { padding: '9px 12px', borderRadius: 8, border: '1.5px solid #dde3ea', fontSize: 13, background: '#fff' },
  btn:       { marginTop: 8, padding: '11px', background: '#1e5fa0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
};
