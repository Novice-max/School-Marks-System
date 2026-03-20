import { useEffect, useState } from 'react';
import { getMyAssignments, getTeacherStudents, getExams, enterMarksBulk } from '../../api/client';
import toast from 'react-hot-toast';

export default function MarkEntryPage() {
  const [assignments,    setAssignments]    = useState([]);
  const [selected,       setSelected]       = useState(null); // { subjectId, classId, subjectName, className }
  const [exams,          setExams]          = useState([]);
  const [selectedExam,   setSelectedExam]   = useState('');
  const [students,       setStudents]       = useState([]);
  const [marks,          setMarks]          = useState({}); // { studentId: score }
  const [saving,         setSaving]         = useState(false);

  useEffect(() => {
    getMyAssignments().then(r => setAssignments(r.data)).catch(() => toast.error('Failed to load assignments'));
  }, []);

  const selectAssignment = async (a) => {
    setSelected(a);
    setSelectedExam('');
    setMarks({});

    const [studRes, examRes] = await Promise.all([
      getTeacherStudents(a.classRoom.classId),
      getExams(),
    ]);
    setStudents(studRes.data);
    setExams(examRes.data.filter(e => e.classRoom?.classId === a.classRoom.classId));
  };

  const handleScore = (studentId, value) => {
    if (value === '' || (Number(value) >= 0 && Number(value) <= 100)) {
      setMarks(prev => ({ ...prev, [studentId]: value }));
    }
  };

  const getGrade = (score, gradeLevel) => {
    const s = Number(score);
    if (isNaN(s)) return '';
    if (gradeLevel <= 3) return s >= 75 ? 'EE' : s >= 50 ? 'ME' : s >= 25 ? 'AE' : 'BE';
    return s >= 80 ? 'EE' : s >= 60 ? 'ME' : s >= 40 ? 'AE' : 'BE';
  };

  const gradeColor = g => ({ EE: '#22c55e', ME: '#3b82f6', AE: '#f59e0b', BE: '#ef4444' }[g] || '#666');

  const save = async () => {
    const entries = students
      .filter(s => marks[s.studentId] !== undefined && marks[s.studentId] !== '')
      .map(s => ({
        studentId: s.studentId,
        subjectId: selected.subject.subjectId,
        examId:    Number(selectedExam),
        score:     Number(marks[s.studentId]),
      }));

    if (!entries.length) { toast.error('No marks to save'); return; }
    setSaving(true);
    try {
      await enterMarksBulk(entries);
      toast.success(`✅ ${entries.length} marks saved successfully`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={styles.pageTitle}>✏️ Enter Marks</h1>

      {/* Assignment picker */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>1. Select Subject & Class</h3>
        <div style={styles.assignmentGrid}>
          {assignments.map(a => (
            <button
              key={a.assignmentId}
              style={{ ...styles.assignCard, ...(selected?.assignmentId === a.assignmentId ? styles.assignCardActive : {}) }}
              onClick={() => selectAssignment(a)}
            >
              <div style={styles.assignSubject}>{a.subject.subjectName}</div>
              <div style={styles.assignClass}>{a.classRoom.displayName}</div>
              <div style={styles.assignTerm}>Term {a.term} · {a.academicYear}</div>
            </button>
          ))}
          {assignments.length === 0 && (
            <p style={{ color: '#aaa' }}>No subjects assigned to you yet. Contact admin.</p>
          )}
        </div>
      </div>

      {/* Exam picker */}
      {selected && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>2. Select Exam</h3>
          <select style={styles.select} value={selectedExam}
            onChange={e => setSelectedExam(e.target.value)}>
            <option value="">— Choose exam —</option>
            {exams.map(e => (
              <option key={e.examId} value={e.examId}>{e.examName} · Term {e.term} · {e.academicYear}</option>
            ))}
          </select>
        </div>
      )}

      {/* Mark entry table */}
      {selected && selectedExam && (
        <div style={styles.section}>
          <div style={styles.tableHeader}>
            <h3 style={styles.sectionTitle}>
              3. Enter Marks — {selected.subject.subjectName} · {selected.classRoom.displayName}
            </h3>
            <span style={styles.totalBadge}>{students.length} students</span>
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                {['#', 'Adm No.', 'Student Name', 'Score (0–100)', 'Grade', 'Points'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const score = marks[s.studentId] ?? '';
                const grade = score !== '' ? getGrade(score, s.classRoom?.gradeLevel || selected.classRoom.gradeLevel) : '';
                const pts   = { EE: 4, ME: 3, AE: 2, BE: 1 }[grade] || '';
                return (
                  <tr key={s.studentId} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                    <td style={styles.td}>{i + 1}</td>
                    <td style={styles.td}>{s.admissionNumber}</td>
                    <td style={{ ...styles.td, textAlign: 'left', fontWeight: 500 }}>{s.firstName} {s.lastName}</td>
                    <td style={styles.td}>
                      <input
                        style={styles.scoreInput}
                        type="number"
                        min={0} max={100}
                        value={score}
                        onChange={e => handleScore(s.studentId, e.target.value)}
                        placeholder="—"
                      />
                    </td>
                    <td style={{ ...styles.td, fontWeight: 700, color: gradeColor(grade) }}>{grade}</td>
                    <td style={styles.td}>{pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <button style={styles.saveBtn} onClick={save} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save All Marks'}
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  pageTitle:       { fontSize: 24, fontWeight: 700, color: '#1e3a5f', marginBottom: 24 },
  section:         { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,.06)' },
  sectionTitle:    { fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 16 },
  assignmentGrid:  { display: 'flex', gap: 12, flexWrap: 'wrap' },
  assignCard:      { padding: '14px 20px', borderRadius: 10, border: '2px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', textAlign: 'left', minWidth: 180 },
  assignCardActive:{ borderColor: '#1e5fa0', background: '#eff6ff' },
  assignSubject:   { fontWeight: 700, color: '#1e3a5f', fontSize: 14 },
  assignClass:     { color: '#555', fontSize: 13, marginTop: 2 },
  assignTerm:      { color: '#999', fontSize: 12, marginTop: 2 },
  select:          { padding: '10px 14px', borderRadius: 8, border: '1.5px solid #dde3ea', fontSize: 14, minWidth: 280, background: '#fff' },
  tableHeader:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalBadge:      { background: '#eff6ff', color: '#1e5fa0', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 },
  table:           { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th:              { background: '#1e3a5f', color: '#fff', padding: '10px 12px', textAlign: 'center', fontWeight: 600, fontSize: 13 },
  td:              { padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid #f0f4f8' },
  scoreInput:      { width: 80, padding: '6px 8px', borderRadius: 6, border: '1.5px solid #dde3ea', textAlign: 'center', fontSize: 14 },
  saveBtn:         { marginTop: 20, padding: '12px 32px', background: '#1e5fa0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer' },
};
