import { useEffect, useState, useMemo } from 'react';
import { getClasses, getStudentsByClass, createStudent } from '../../api/client';
import api from '../../api/client';
import { usePageStyles } from '../../styles/pageStyles';
import Avatar from '../../components/Avatar';
import SlideOutPanel from '../../components/SlideOutPanel';
import toast from 'react-hot-toast';

const classLabel = (c) =>
  c.gradeLevel === -1 ? `PP1 (Pre-Primary 1) — ${c.academicYear}` :
  c.gradeLevel === 0  ? `PP2 (Pre-Primary 2) — ${c.academicYear}` :
  c.gradeLevel <= 6   ? `Grade ${c.gradeLevel} (Primary) — ${c.academicYear}` :
                        `Grade ${c.gradeLevel} (JSS) — ${c.academicYear}`;

const SearchIcon = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const gradeColor = (g) => {
  if (!g) return '#888';
  if (g.startsWith('EE')) return '#22c55e';
  if (g.startsWith('ME')) return '#3b82f6';
  if (g.startsWith('AE')) return '#f59e0b';
  if (g.startsWith('BE')) return '#ef4444';
  return '#888';
};

export default function StudentsPage() {
  const s = usePageStyles();
  const t = s.tokens;

  const [classes,      setClasses]      = useState([]);
  const [students,     setStudents]     = useState([]);
  const [selClass,     setSelClass]     = useState('');
  const [loading,      setLoading]      = useState(false);
  const [pageLoading,  setPageLoading]  = useState(false);
  const [toggling,     setToggling]     = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [search,       setSearch]       = useState('');
  const [form, setForm] = useState({
    firstName: '', lastName: '', admissionNumber: '',
    gender: 'Male', dateOfBirth: '', parentContact: ''
  });

  /* ─── Detail panel state ─── */
  const [panelStudent, setPanelStudent] = useState(null);
  const [editData,     setEditData]     = useState(null);
  const [editLoading,  setEditLoading]  = useState(false);
  const [marksData,    setMarksData]    = useState(null);
  const [marksLoading, setMarksLoading] = useState(false);

  useEffect(() => { getClasses().then(r => setClasses(r.data)); }, []);

  const loadStudents = (classId) => {
    if (!classId) return;
    setPageLoading(true);
    api.get(`/admin/students/class/${classId}`)
      .then(r => setStudents(r.data))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setPageLoading(false));
  };

  useEffect(() => { if (selClass) loadStudents(selClass); }, [selClass]);

  const submit = async (e) => {
    e.preventDefault();
    if (!selClass) { toast.error('Select a class first'); return; }
    setLoading(true);
    try {
      await createStudent({
        ...form, classRoom: { classId: Number(selClass) },
        dateOfBirth: form.dateOfBirth || null,
      });
      toast.success('Student added'); loadStudents(selClass);
      setForm({ firstName: '', lastName: '', admissionNumber: '', gender: 'Male', dateOfBirth: '', parentContact: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add student'); }
    finally { setLoading(false); }
  };

  const toggleActive = async (st, e) => {
    e.stopPropagation();
    const action = st.isActive !== false ? 'deactivate' : 'activate';
    const msg = st.isActive !== false
      ? `Deactivate ${st.firstName} ${st.lastName}?`
      : `Reactivate ${st.firstName} ${st.lastName}?`;
    if (!window.confirm(msg)) return;
    setToggling(st.studentId);
    try { await api.post(`/admin/students/${st.studentId}/${action}`); toast.success(`Student ${action}d`); loadStudents(selClass); }
    catch { toast.error(`Failed to ${action} student`); }
    finally { setToggling(null); }
  };

  /* ─── Panel: open student detail + fetch marks ─── */
  const openPanel = (st) => {
    setPanelStudent(st);
    setEditData({
      firstName: st.firstName, lastName: st.lastName,
      admissionNumber: st.admissionNumber, gender: st.gender || 'Male',
      parentContact: st.parentContact || '',
    });
    // Fetch latest marks
    setMarksData(null);
    setMarksLoading(true);
    api.get(`/admin/students/${st.studentId}/latest-marks`)
      .then(r => setMarksData(r.data))
      .catch(() => setMarksData(null))
      .finally(() => setMarksLoading(false));
  };

  const saveEdit = async () => {
    setEditLoading(true);
    try {
      await api.put(`/admin/students/${panelStudent.studentId}`, editData);
      toast.success('Student updated');
      loadStudents(selClass);
      setPanelStudent(prev => ({ ...prev, ...editData }));
    } catch { toast.error('Failed to update student'); }
    finally { setEditLoading(false); }
  };

  /* ─── Filtered + searched students ─── */
  const filtered = useMemo(() => {
    let list = showInactive ? students : students.filter(st => st.isActive !== false);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(st =>
        st.firstName.toLowerCase().includes(q) ||
        st.lastName.toLowerCase().includes(q) ||
        st.admissionNumber?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [students, showInactive, search]);

  return (
    <div>
      <h1 style={s.title}>👨‍🎓 Students</h1>

      {/* ══════ DETAIL PANEL ══════ */}
      <SlideOutPanel open={!!panelStudent} onClose={() => setPanelStudent(null)} title="Student Details">
        {panelStudent && editData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header with avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 16, borderBottom: `1px solid ${t.border}` }}>
              <Avatar name={`${panelStudent.firstName} ${panelStudent.lastName}`} size={56} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: t.text }}>
                  {panelStudent.firstName} {panelStudent.lastName}
                </div>
                <div style={{ fontSize: 13, color: t.textFaint }}>Adm #{panelStudent.admissionNumber}</div>
                <span style={{
                  ...s.badge, marginTop: 4, display: 'inline-block',
                  ...(panelStudent.isActive !== false ? s.statusActive : s.statusInactive),
                }}>
                  {panelStudent.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Info rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <InfoRow label="Gender" value={panelStudent.gender || '—'} tokens={t} />
              <InfoRow label="Date of Birth" value={panelStudent.dateOfBirth || '—'} tokens={t} />
              <InfoRow label="Parent Contact" value={panelStudent.parentContact || '—'} tokens={t} />
              <InfoRow label="Class" value={panelStudent.classRoom ? classLabel(panelStudent.classRoom) : '—'} tokens={t} />
            </div>

            {/* ─── Latest Marks Section ─── */}
            <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.textMuted, marginBottom: 12 }}>
                Latest Exam {marksData?.examName ? `— ${marksData.examName}` : ''}
              </div>

              {marksLoading ? (
                <div style={{ fontSize: 13, color: t.textFaint, padding: '8px 0' }}>Loading marks...</div>
              ) : marksData && marksData.marks?.length > 0 ? (
                <>
                  {/* Average + Grade */}
                  <div style={{
                    display: 'flex', gap: 12, marginBottom: 14,
                  }}>
                    <div style={{
                      flex: 1, background: t.rowAlt, borderRadius: 10, padding: '12px 16px',
                      textAlign: 'center', border: `1px solid ${t.border}`,
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>{marksData.average}</div>
                      <div style={{ fontSize: 11, color: t.textFaint }}>Average</div>
                    </div>
                    <div style={{
                      flex: 1, background: t.rowAlt, borderRadius: 10, padding: '12px 16px',
                      textAlign: 'center', border: `1px solid ${t.border}`,
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: gradeColor(marksData.grade) }}>{marksData.grade}</div>
                      <div style={{ fontSize: 11, color: t.textFaint }}>Grade</div>
                    </div>
                  </div>

                  {/* Subject marks */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {marksData.marks.map((m, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 0', borderBottom: `1px solid ${t.border}`,
                      }}>
                        <span style={{ fontSize: 13, color: t.text }}>{m.subject}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{m.score}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: '#fff',
                            background: gradeColor(m.grade), padding: '2px 8px', borderRadius: 10,
                          }}>{m.grade}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: t.textFaint, padding: '8px 0' }}>No marks available yet.</div>
              )}
            </div>

            {/* ─── Editable fields ─── */}
            <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.textMuted, marginBottom: 12 }}>Edit Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'firstName',       label: 'First Name' },
                  { key: 'lastName',        label: 'Last Name' },
                  { key: 'admissionNumber', label: 'Admission No.' },
                  { key: 'parentContact',   label: 'Parent Contact' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 3, display: 'block' }}>{f.label}</label>
                    <input style={{ ...s.input, width: '100%', boxSizing: 'border-box' }}
                      value={editData[f.key]}
                      onChange={e => setEditData({ ...editData, [f.key]: e.target.value })} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 3, display: 'block' }}>Gender</label>
                  <select style={{ ...s.input, width: '100%', boxSizing: 'border-box' }}
                    value={editData.gender}
                    onChange={e => setEditData({ ...editData, gender: e.target.value })}>
                    <option>Male</option><option>Female</option>
                  </select>
                </div>
              </div>
              <button
                style={{ ...s.btn, marginTop: 16, width: '100%', textAlign: 'center', justifyContent: 'center' }}
                onClick={saveEdit} disabled={editLoading}
              >
                {editLoading ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        )}
      </SlideOutPanel>

      {/* ══════ CLASS SELECTOR ══════ */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>Select Class</h3>
        <select style={s.input} value={selClass} onChange={e => { setSelClass(e.target.value); setSearch(''); }}>
          <option value="">— Choose a class —</option>
          {classes.map(c => <option key={c.classId} value={c.classId}>{classLabel(c)}</option>)}
        </select>
        {classes.length === 0 && <p style={{ color: t.danger, fontSize: 13, marginTop: 8 }}>⚠️ No classes found.</p>}
      </div>

      {/* ══════ ADD STUDENT FORM ══════ */}
      {selClass && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>Add Student</h3>
          <form onSubmit={submit} style={s.form}>
            <div style={s.grid}>
              {[
                { key: 'firstName',       label: 'First Name',     type: 'text', req: true },
                { key: 'lastName',        label: 'Last Name',      type: 'text', req: true },
                { key: 'admissionNumber', label: 'Admission No.',  type: 'text', req: true },
                { key: 'parentContact',   label: 'Parent Contact', type: 'text', req: false },
                { key: 'dateOfBirth',     label: 'Date of Birth',  type: 'date', req: false },
              ].map(f => (
                <div key={f.key} style={s.field}>
                  <label style={s.label}>{f.label}</label>
                  <input style={s.input} type={f.type} value={form[f.key]}
                    onChange={e => setForm({...form, [f.key]: e.target.value})} required={f.req} />
                </div>
              ))}
              <div style={s.field}>
                <label style={s.label}>Gender</label>
                <select style={s.input} value={form.gender}
                  onChange={e => setForm({...form, gender: e.target.value})}>
                  <option>Male</option><option>Female</option>
                </select>
              </div>
            </div>
            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? 'Adding...' : '+ Add Student'}
            </button>
          </form>
        </div>
      )}

      {/* ══════ STUDENTS LIST ══════ */}
      {selClass && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <h3 style={{ ...s.cardTitle, marginBottom: 0 }}>Students ({filtered.length})</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <SearchIcon size={16} color={t.textFaint} />
                <input
                  style={{ ...s.input, paddingLeft: 8, width: 180, fontSize: 13 }}
                  placeholder="Search name or adm no..."
                  value={search} onChange={e => setSearch(e.target.value)}
                />
              </div>
              <label style={{ fontSize: 13, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
                Show deactivated
              </label>
            </div>
          </div>

          {pageLoading ? (
            <div style={s.spinner}>Loading students...</div>
          ) : filtered.length === 0 ? (
            <p style={s.empty}>{search ? 'No students match your search.' : 'No students yet. Add one above.'}</p>
          ) : (
            <div style={s.tableWrap}>
              <table style={{ ...s.table, minWidth: 600 }}>
                <thead>
                  <tr>{['#','Student','Adm No.','Gender','Parent Contact',''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.map((st, i) => (
                    <tr key={st.studentId} onClick={() => openPanel(st)}
                      style={{
                        ...s.rowBg(i), cursor: 'pointer', transition: 'background 0.1s ease',
                        ...(st.isActive === false ? { opacity: 0.6 } : {}),
                      }}
                      onMouseEnter={e => { if (st.isActive !== false) e.currentTarget.style.background = t.accentSubtle; }}
                      onMouseLeave={e => { e.currentTarget.style.background = s.rowBg(i).background; }}
                    >
                      <td style={{ ...s.td, width: 40 }}>{i + 1}</td>
                      <td style={{ ...s.td, textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={`${st.firstName} ${st.lastName}`} size={32} />
                          <div>
                            <div style={{ fontWeight: 600, color: t.text, whiteSpace: 'nowrap' }}>
                              {st.firstName} {st.lastName}
                            </div>
                            {st.isActive === false && <span style={{ fontSize: 11, color: t.danger }}>Inactive</span>}
                          </div>
                        </div>
                      </td>
                      <td style={s.td}>{st.admissionNumber}</td>
                      <td style={s.td}>{st.gender}</td>
                      <td style={s.td}>{st.parentContact || '—'}</td>
                      <td style={{ ...s.td, width: 50 }}>
                        <button
                          style={{
                            padding: '5px 8px', border: '1.5px solid', borderRadius: 6,
                            cursor: 'pointer', fontWeight: 600, fontSize: 12, background: 'transparent',
                            color: st.isActive !== false ? t.danger : t.successText,
                            borderColor: st.isActive !== false ? t.dangerBorder : t.successBorder,
                          }}
                          onClick={(e) => toggleActive(st, e)}
                          disabled={toggling === st.studentId}
                          title={st.isActive !== false ? 'Deactivate' : 'Activate'}
                        >
                          {toggling === st.studentId ? '...' : st.isActive !== false ? '🚫' : '✅'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, tokens }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${tokens.border}` }}>
      <span style={{ fontSize: 13, color: tokens.textFaint }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: tokens.text }}>{value}</span>
    </div>
  );
}