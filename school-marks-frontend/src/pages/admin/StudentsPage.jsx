import { useEffect, useState } from 'react';
import { getClasses, getStudentsByClass, createStudent } from '../../api/client';
import api from '../../api/client';
import { usePageStyles } from '../../styles/pageStyles';
import toast from 'react-hot-toast';

const classLabel = (c) =>
  c.gradeLevel === -1 ? `PP1 (Pre-Primary 1) — ${c.academicYear}` :
  c.gradeLevel === 0  ? `PP2 (Pre-Primary 2) — ${c.academicYear}` :
  c.gradeLevel <= 6   ? `Grade ${c.gradeLevel} (Primary) — ${c.academicYear}` :
                        `Grade ${c.gradeLevel} (JSS) — ${c.academicYear}`;

export default function StudentsPage() {
  const s = usePageStyles();
  const t = s.tokens;

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
      toast.success('Student updated'); setEditModal(null); loadStudents(selClass);
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
    try { await api.post(`/admin/students/${st.studentId}/${action}`); toast.success(`Student ${action}d`); loadStudents(selClass); }
    catch { toast.error(`Failed to ${action} student`); }
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
                  <option>Male</option><option>Female</option>
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
          {classes.map(c => <option key={c.classId} value={c.classId}>{classLabel(c)}</option>)}
        </select>
        {classes.length === 0 && <p style={{ color: t.danger, fontSize: 13, marginTop: 8 }}>⚠️ No classes found. Create classes first.</p>}
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

      {/* Students list */}
      {selClass && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <h3 style={{ ...s.cardTitle, marginBottom: 0 }}>Students ({filtered.length})</h3>
            <label style={{ fontSize: 13, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
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
              <table style={{ ...s.table, minWidth: 650 }}>
                <thead>
                  <tr>{['#','Adm No.','Name','Gender','Parent Contact','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.map((st, i) => (
                    <tr key={st.studentId} style={{
                      ...s.rowBg(i),
                      ...(st.isActive === false ? { background: t.dangerBg, opacity: 0.7 } : {}),
                    }}>
                      <td style={s.td}>{i + 1}</td>
                      <td style={s.td}>{st.admissionNumber}</td>
                      <td style={{ ...s.td, textAlign: 'left', whiteSpace: 'nowrap' }}>
                        <strong>{st.firstName} {st.lastName}</strong>
                        {st.isActive === false && <span style={{ color: t.danger, fontSize: 11, marginLeft: 8 }}>Inactive</span>}
                      </td>
                      <td style={s.td}>{st.gender}</td>
                      <td style={s.td}>{st.parentContact || '—'}</td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button style={s.editBtn} onClick={() => openEdit(st)}>✏️ Edit</button>
                          <button
                            style={{
                              padding: '6px 10px', border: '1.5px solid', borderRadius: 6,
                              cursor: 'pointer', fontWeight: 600, fontSize: 12,
                              background: st.isActive !== false ? t.dangerBg : t.successBg,
                              color: st.isActive !== false ? t.danger : t.successText,
                              borderColor: st.isActive !== false ? t.dangerBorder : t.successBorder,
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