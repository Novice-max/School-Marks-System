import { useEffect, useState } from 'react';
import { getClasses, downloadMarklist, downloadTermReport } from '../api/client';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePageStyles } from '../styles/pageStyles';
import toast from 'react-hot-toast';

function savePdf(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function previewPdf(blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const classLabel = c =>
  c.gradeLevel === -2 ? `Playgroup — ${c.academicYear}` :
  c.gradeLevel === -1 ? 'PP1 (Pre-Primary 1)' :
  c.gradeLevel === 0  ? 'PP2 (Pre-Primary 2)' :
  c.gradeLevel <= 6   ? `Grade ${c.gradeLevel} (Primary)` :
                        `Grade ${c.gradeLevel} (JSS)`;

// ── Bouncing dots — shown inside the active button while it's loading ──
function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 6 }}>
      <span className="rp-dot" />
      <span className="rp-dot rp-dot-2" />
      <span className="rp-dot rp-dot-3" />
    </span>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const s = usePageStyles();
  const t = s.tokens;
  const isAdmin = user?.role === 'ADMIN';

  const [classes,     setClasses]     = useState([]);
  const [exams,       setExams]       = useState([]);
  const [students,    setStudents]    = useState([]);
  const [loading,     setLoading]     = useState('');

  const [listClass,   setListClass]   = useState('');
  const [listExam,    setListExam]    = useState('');

  const [cardClass,   setCardClass]   = useState('');
  const [cardStudent, setCardStudent] = useState('');
  const [cardTerm,    setCardTerm]    = useState('1');
  const [cardYear,    setCardYear]    = useState(new Date().getFullYear().toString());

  const [schoolYear,  setSchoolYear]  = useState(new Date().getFullYear().toString());
  const [schoolTerm,  setSchoolTerm]  = useState('1');
  const [schoolExam,  setSchoolExam]  = useState('Opener');

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
    if (!listClass) { setExams([]); return; }
    const endpoint = isAdmin ? `/admin/exams` : `/teacher/exams/class/${listClass}`;
    api.get(endpoint).then(r => {
      const filtered = isAdmin ? r.data.filter(e => e.classRoom?.classId == listClass) : r.data;
      setExams(filtered);
    });
  }, [listClass, isAdmin]);

  useEffect(() => {
    if (!cardClass) { setStudents([]); return; }
    const endpoint = isAdmin ? `/admin/students/class/${cardClass}` : `/teacher/students/class/${cardClass}`;
    api.get(endpoint).then(r => setStudents(r.data));
  }, [cardClass, isAdmin]);

  const dlMarklist = async () => {
    if (!listExam) { toast.error('Select an exam'); return; }
    setLoading('list');
    try {
      const { data } = await downloadMarklist(listExam);
      savePdf(data, `marklist_exam_${listExam}.pdf`);
      toast.success('Marklist downloaded');
    } catch { toast.error('Failed to generate marklist'); }
    finally { setLoading(''); }
  };

  const previewMarklist = async () => {
    if (!listExam) { toast.error('Select an exam'); return; }
    setLoading('listPreview');
    try {
      const { data } = await downloadMarklist(listExam);
      previewPdf(data);
    } catch { toast.error('Failed to generate marklist preview'); }
    finally { setLoading(''); }
  };

  const dlTermReport = async () => {
    if (!cardClass || !cardStudent) { toast.error('Select class and student'); return; }
    setLoading('sheet');
    try {
      const { data } = await downloadTermReport(cardStudent, cardClass, cardTerm, cardYear);
      savePdf(data, `report_student_${cardStudent}_term${cardTerm}.pdf`);
      toast.success('Report card downloaded');
    } catch { toast.error('No exam data found for this term — ensure marks are entered'); }
    finally { setLoading(''); }
  };

  const previewTermReport = async () => {
    if (!cardClass || !cardStudent) { toast.error('Select class and student'); return; }
    setLoading('sheetPreview');
    try {
      const { data } = await downloadTermReport(cardStudent, cardClass, cardTerm, cardYear);
      previewPdf(data);
    } catch { toast.error('No exam data found — ensure marks are entered'); }
    finally { setLoading(''); }
  };

  const dlAllReportCards = async () => {
    if (!cardClass) { toast.error('Select a class'); return; }
    setLoading('allCards');
    try {
      const { data } = await api.get(
        `/reports/termreport/class/${cardClass}/${cardTerm}/${cardYear}`,
        { responseType: 'blob' }
      );
      const cls = classes.find(c => c.classId == cardClass);
      const label = cls ? classLabel(cls).replace(/[^a-zA-Z0-9]/g, '_') : `class_${cardClass}`;
      savePdf(data, `all_reports_${label}_term${cardTerm}_${cardYear}.pdf`);
      toast.success('All report cards downloaded');
    } catch { toast.error('Failed — ensure marks are entered for this term'); }
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

  const busy = !!loading;

  // Active button: full opacity + animated dots
  // Idle button during busy: muted so user knows it's not their turn
  const btnStyle = (base, key) => ({
    ...base,
    opacity: busy && loading !== key ? 0.45 : 1,
    cursor: busy ? 'not-allowed' : 'pointer',
    transition: 'opacity 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  // Label + animated dots if this button is the active one
  const btnContent = (key, idleLabel) =>
    loading === key
      ? <><span>Generating</span><LoadingDots /></>
      : idleLabel;

  const rc = {
    grid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: 24 },
    card:     { ...s.card, padding: 28, display: 'flex', flexDirection: 'column', gap: 10, borderRadius: 14 },
    cardIcon: { fontSize: 36 },
    cardDesc: { fontSize: 13, color: t.textFaint, marginBottom: 8 },
    label:    { fontSize: 12, fontWeight: 600, color: t.textMuted },
    select:   { ...s.input, fontSize: 13 },
    btn:      { ...s.btn, marginTop: 8, width: '100%', textAlign: 'center', justifyContent: 'center' },
    btnGreen: { ...s.btn, marginTop: 8, background: t.successText, width: '100%', textAlign: 'center', justifyContent: 'center' },
    btnOutline: {
      ...s.btn, marginTop: 8,
      background: 'transparent',
      border: `1.5px solid ${t.border}`,
      color: t.textMuted,
      width: '100%', textAlign: 'center', justifyContent: 'center',
    },
  };

  return (
    <div>
      {/* ── Keyframes injected once — bouncing dot animation ── */}
      <style>{`
        @keyframes rpDotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
        .rp-dot {
          display: inline-block;
          width: 5px; height: 5px;
          border-radius: 50%;
          background: currentColor;
          animation: rpDotBounce 1.2s ease-in-out infinite;
        }
        .rp-dot-2 { animation-delay: 0.15s; }
        .rp-dot-3 { animation-delay: 0.30s; }
      `}</style>

      <h1 style={s.title}>📄 Reports</h1>

      <div style={rc.grid}>

        {/* ── CLASS MARKLIST ── */}
        <div style={rc.card}>
          <div style={rc.cardIcon}>📋</div>
          <h3 style={s.cardTitle}>Class Marklist</h3>
          <p style={rc.cardDesc}>Full marklist with positions, averages and grades</p>

          <label style={rc.label}>Class</label>
          <select style={rc.select} value={listClass}
            onChange={e => { setListClass(e.target.value); setListExam(''); }}
            disabled={busy}>
            <option value="">Select class</option>
            {classes.map(c => (
              <option key={c.classId} value={c.classId}>
                {classLabel(c)} {c.academicYear ? `(${c.academicYear})` : ''}
              </option>
            ))}
          </select>

          <label style={rc.label}>Exam</label>
          <select style={rc.select} value={listExam}
            onChange={e => setListExam(e.target.value)}
            disabled={busy}>
            <option value="">Select exam</option>
            {exams.map(e => (
              <option key={e.examId} value={e.examId}>
                {e.examName} T{e.term} {e.academicYear}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...btnStyle(rc.btn, 'list'), flex: 1 }}
              onClick={dlMarklist} disabled={busy}>
              {btnContent('list', '⬇️ Download')}
            </button>
            <button style={{ ...btnStyle(rc.btnOutline, 'listPreview'), flex: 1 }}
              onClick={previewMarklist} disabled={busy}>
              {btnContent('listPreview', '👁️ Preview')}
            </button>
          </div>
        </div>

        {/* ── STUDENT REPORT CARD ── */}
        <div style={rc.card}>
          <div style={rc.cardIcon}>👤</div>
          <h3 style={s.cardTitle}>Student Report Card</h3>
          <p style={rc.cardDesc}>Full term report combining all exam marks for the selected term</p>

          <label style={rc.label}>Class</label>
          <select style={rc.select} value={cardClass}
            onChange={e => { setCardClass(e.target.value); setCardStudent(''); }}
            disabled={busy}>
            <option value="">Select class</option>
            {classes.map(c => (
              <option key={c.classId} value={c.classId}>
                {classLabel(c)} {c.academicYear ? `(${c.academicYear})` : ''}
              </option>
            ))}
          </select>

          <label style={rc.label}>Student</label>
          <select style={rc.select} value={cardStudent}
            onChange={e => setCardStudent(e.target.value)}
            disabled={busy}>
            <option value="">Select student</option>
            {students.map(st => (
              <option key={st.studentId} value={st.studentId}>
                {st.firstName} {st.lastName} ({st.admissionNumber})
              </option>
            ))}
          </select>

          <label style={rc.label}>Term</label>
          <select style={rc.select} value={cardTerm}
            onChange={e => setCardTerm(e.target.value)}
            disabled={busy}>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>

          <label style={rc.label}>Academic Year</label>
          <input style={rc.select} type="text" value={cardYear}
            onChange={e => setCardYear(e.target.value)}
            placeholder="e.g. 2026" disabled={busy} />

          {/* Single student row: Download + Preview */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...btnStyle(rc.btn, 'sheet'), flex: 1 }}
              onClick={dlTermReport} disabled={busy}>
              {btnContent('sheet', '⬇️ Download')}
            </button>
            <button style={{ ...btnStyle(rc.btnOutline, 'sheetPreview'), flex: 1 }}
              onClick={previewTermReport} disabled={busy}>
              {btnContent('sheetPreview', '👁️ Preview')}
            </button>
          </div>

          {/* Entire class — full width */}
          <button style={btnStyle(rc.btnGreen, 'allCards')}
            onClick={dlAllReportCards}
            disabled={busy || !cardClass}>
            {btnContent('allCards', '📦 Download Entire Class')}
          </button>

          <p style={{ fontSize: 11, color: t.textFaint, marginTop: 2 }}>
            Use <strong>Preview</strong> to confirm a student's marks before downloading.
            "Entire Class" generates one print-ready PDF for the whole class.
          </p>
        </div>

        {/* ── SCHOOL-WIDE REPORT (admin only) ── */}
        {isAdmin && (
          <div style={{ ...rc.card, borderTop: `4px solid ${t.accent}` }}>
            <div style={rc.cardIcon}>🏫</div>
            <h3 style={s.cardTitle}>School-Wide Report</h3>
            <p style={rc.cardDesc}>
              Complete report for all classes (PP1–Grade 9) for a given exam period
            </p>

            <label style={rc.label}>Academic Year</label>
            <input style={rc.select} type="text" value={schoolYear}
              onChange={e => setSchoolYear(e.target.value)}
              placeholder="e.g. 2026" disabled={busy} />

            <label style={rc.label}>Term</label>
            <select style={rc.select} value={schoolTerm}
              onChange={e => setSchoolTerm(e.target.value)}
              disabled={busy}>
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>

            <label style={rc.label}>Exam</label>
            <select style={rc.select} value={schoolExam}
              onChange={e => setSchoolExam(e.target.value)}
              disabled={busy}>
              <option>Opener</option>
              <option>Mid-Term</option>
              <option>End-Term</option>
            </select>

            <button style={btnStyle({ ...rc.btn, background: t.accent }, 'school')}
              onClick={dlSchoolReport} disabled={busy}>
              {btnContent('school', '⬇️ Download School Report')}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}