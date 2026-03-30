import { useEffect, useState } from 'react';
import { getClasses, getStudentsByClass, createStudent } from '../../api/client';
import api from '../../api/client';
import toast from 'react-hot-toast';

const classLabel = (c) =>
  c.gradeLevel === -1 ? `PP1 (Pre-Primary 1) — ${c.academicYear}` :
  c.gradeLevel === 0  ? `PP2 (Pre-Primary 2) — ${c.academicYear}` :
  c.gradeLevel <= 6   ? `Grade ${c.gradeLevel} (Primary) — ${c.academicYear}` :
                        `Grade ${c.gradeLevel} (JSS) — ${c.academicYear}`;

export default function StudentsPage() {
  const [classes,      setClasses]      = useState([]);
  const [students,     setStudents]     = useState([]);
  const [selClass,     setSelClass]     = useState('');
  const [loading,      setLoading]      = useState(false);
  const [pageLoading,  setPageLoading]  = useState(false);
  const [editModal,    setEditModal]    = useState(null);
  const [editLoading,  setEditLoading]  = useState(false);
  const [toggling,     setToggling]     = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', admissionNumber: '',
    gender: 'Male', dateOfBirth: '', parentContact: ''
  });

  useEffect(() => { getClasses().then(r => setClasses(r.data)); }, []);

  const loadStudents = (classId) => {
    if (!classId) return;
    setPageLoading(true);
    // Load ALL students (active + inactive) so admin can see deactivated ones
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
        ...form,
        classRoom: { classId: Number(selClass) },
        dateOfBirth: form.dateOfBirth || null,
      });
      toast.success('Student added');
      loadStudents(selClass);
      setForm({ firstName: '', lastName: '', admissionNumber: '', gender: 'Male', dateOfBirth: '', parentContact: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add student');
    } finally { setLoading(false); }
  };

  const openEdit = (st) => setEditModal({
    studentId: st.studentId, firstName: st.firstName, lastName: st.lastName,
    admissionNumber: st.admissionNumber, gender: st.gender || 'Male',
    parentContact: st.parentContact || '',
  });

  const saveEdit = async () => {
    setEditLoading(true);
    try {
      await api.put(`/admin/students/${editModal.studentId}`, {
        firstName: editModal.firstName, lastName: editModal.lastName,
        admissionNumber: editModal.admissionNumber, gender: editModal.gender,
        parentContact: editModal.parentContact,
      });
      toast.success('Student updated');
      setEditModal(null);
      loadStudents(selClass);
    } catch { toast.error('Failed to update student'); }
    finally { setEditLoading(false); }
  };

  const toggleActive = async (st) => {
    const action = st.isActive !== false ? 'deactivate' : 'activate';
    const msg = st.isActive !== false
      ? `Deactivate ${st.firstName} ${st.lastName}? They will be hidden from mark entry.`
      : `Reactivate ${st.firstName} ${st.lastName}?`;
    if (!window.confirm(msg)) return;
    setToggling(st.studentId);
    try {
      await api.post(`/admin/students/${st.studentId}/${action}`);
      toast.success(`Student ${action}d`);
      loadStudents(selClass);
    } catch { toast.error(`Failed to ${action} student`); }
    finally { setToggling(null); }
  };

  const filtered = showInactive ? students : students.filter(st => st.isActive !== false);

  return (
    <div>
      <h1 style={s.title}>👨‍🎓 Students</h1>

      {/* Edit modal */}
      {editModal && (
        <div style={s.overlay} onClick={() => setEditModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>✏️ Edit Student</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
              {[
                { key: 'firstName',       label: 'First Name' },
                { key: 'lastName',        label: 'Last Name' },
                { key: 'admissionNumber', label: 'Admission No.' },
                { key: 'parentContact',   label: 'Parent Contact' },
              ].map(f => (
                <div key={f.key}>
                  <label style={s.label}>{f.label}</label>
                  <input style={{ ...s.input, width: '100%', boxSizing: 'border-box' }}
                    value={editModal[f.key]}
                    onChange={e => setEditModal({ ...editModal, [f.key]: e.target.value })} />
                </div>
              ))}
              <div>
                <label style={s.label}>Gender</label>
                <select style={{ ...s.input, width: '100%', boxSizing: 'border-box' }}
                  value={editModal.gender}
                  onChange={e => setEditModal({ ...editModal, gender: e.target.value })}>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button style={s.btnCancel} onClick={() => setEditModal(null)}>Cancel</button>
              <button style={s.modalBtn} onClick={saveEdit} disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Class selector */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>Select Class</h3>
        <select style={s.input} value={selClass} onChange={e => setSelClass(e.target.value)}>
          <option value="">— Choose a class —</option>
          {classes.map(c => (
            <option key={c.classId} value={c.classId}>{classLabel(c)}</option>
          ))}
        </select>
        {classes.length === 0 && <p style={{color:'#e55',fontSize:13,marginTop:8}}>⚠️ No classes found. Create classes first.</p>}
      </div>

      {/* Add student form */}
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
                  <input style={s.input} type={f.type}
                    value={form[f.key]}
                    onChange={e => setForm({...form, [f.key]: e.target.value})}
                    required={f.req} />
                </div>
              ))}
              <div style={s.field}>
                <label style={s.label}>Gender</label>
                <select style={s.input} value={form.gender}
                  onChange={e => setForm({...form, gender: e.target.value})}>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
            </div>
            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? 'Adding...' : '+ Add Student'}
            </button>
          </form>
        </div>
      )}

      {/* Students list */}
      {selClass && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <h3 style={{ ...s.cardTitle, marginBottom: 0 }}>Students ({filtered.length})</h3>
            <label style={{ fontSize: 13, color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
              Show deactivated
            </label>
          </div>
          {pageLoading ? (
            <div style={s.spinner}>Loading students...</div>
          ) : filtered.length === 0 ? (
            <p style={s.empty}>No students yet. Add one above.</p>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>{['#','Adm No.','Name','Gender','Parent Contact','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.map((st, i) => (
                    <tr key={st.studentId} style={{
                      background: st.isActive === false ? '#fef2f2' : i % 2 === 0 ? '#f8fafc' : '#fff',
                      opacity: st.isActive === false ? 0.7 : 1,
                    }}>
                      <td style={s.td}>{i + 1}</td>
                      <td style={s.td}>{st.admissionNumber}</td>
                      <td style={{ ...s.td, textAlign: 'left', whiteSpace: 'nowrap' }}>
                        <strong>{st.firstName} {st.lastName}</strong>
                        {st.isActive === false && <span style={{ color: '#dc2626', fontSize: 11, marginLeft: 8 }}>Inactive</span>}
                      </td>
                      <td style={s.td}>{st.gender}</td>
                      <td style={s.td}>{st.parentContact || '—'}</td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button style={s.editBtn} onClick={() => openEdit(st)}>✏️ Edit</button>
                          <button
                            style={{
                              ...s.toggleBtn,
                              background: st.isActive !== false ? '#fee2e2' : '#dcfce7',
                              color: st.isActive !== false ? '#dc2626' : '#16a34a',
                              borderColor: st.isActive !== false ? '#fca5a5' : '#86efac',
                            }}
                            onClick={() => toggleActive(st)}
                            disabled={toggling === st.studentId}
                          >
                            {toggling === st.studentId ? '...' : st.isActive !== false ? '🚫' : '✅'}
                          </button>
                        </div>
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

const s = {
  title:      { fontSize: 24, fontWeight: 700, color: '#1e3a5f', marginBottom: 24 },
  card:       { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,.06)' },
  cardTitle:  { fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 16 },
  form:       { display: 'flex', flexDirection: 'column', gap: 16 },
  grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 14 },
  field:      { display: 'flex', flexDirection: 'column', gap: 4 },
  label:      { fontSize: 13, fontWeight: 600, color: '#555' },
  input:      { padding: '9px 12px', borderRadius: 8, border: '1.5px solid #dde3ea', fontSize: 14, background: '#fff' },
  btn:        { padding: '11px 28px', background: '#1e5fa0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14, alignSelf: 'flex-start' },
  btnCancel:  { padding: '10px 24px', background: '#f1f5f9', color: '#555', border: '1.5px solid #dde3ea', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  editBtn:    { padding: '6px 10px', background: '#dbeafe', color: '#1e5fa0', border: '1.5px solid #93c5fd', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  toggleBtn:  { padding: '6px 10px', border: '1.5px solid', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  tableWrap:  { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 650 },
  th:         { background: '#1e3a5f', color: '#fff', padding: '10px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' },
  td:         { padding: '10px 14px', borderBottom: '1px solid #f0f4f8' },
  empty:      { color: '#aaa', textAlign: 'center', padding: 32 },
  spinner:    { textAlign: 'center', padding: 40, color: '#1e5fa0', fontWeight: 600, fontSize: 15 },
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modal:      { background: '#fff', borderRadius: 16, padding: 36, minWidth: 360, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,.2)', textAlign: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#1e3a5f', marginBottom: 20 },
  modalBtn:   { padding: '10px 32px', background: '#1e5fa0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' },
};