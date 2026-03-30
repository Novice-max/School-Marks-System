import { useEffect, useState } from 'react';
import { createTeacher } from '../../api/client';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function TeachersPage() {
  const [teachers,    setTeachers]    = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading,     setLoading]     = useState(false);
  const [resetting,   setResetting]   = useState(null);
  const [toggling,    setToggling]    = useState(null);
  const [showCreds,   setShowCreds]   = useState(null);
  const [editModal,   setEditModal]   = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', username: ''
  });

  const load = () => {
    setPageLoading(true);
    api.get('/admin/teachers/with-status')
      .then(r => setTeachers(r.data))
      .catch(() => toast.error('Failed to load teachers'))
      .finally(() => setPageLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await createTeacher(form);
      toast.success('Teacher created');
      setShowCreds({ username: data.username, password: data.defaultPassword });
      setForm({ firstName: '', lastName: '', email: '', phone: '', username: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create teacher');
    } finally { setLoading(false); }
  };

  const resetPassword = async (teacher) => {
    if (!window.confirm(`Reset password for ${teacher.firstName} ${teacher.lastName}?`)) return;
    setResetting(teacher.teacherId);
    try {
      const { data } = await api.post(`/admin/teachers/${teacher.teacherId}/reset-password`);
      setShowCreds({ username: data.tempPassword.replace('123', ''), password: data.tempPassword, isReset: true, name: teacher.firstName });
      toast.success('Password reset');
    } catch { toast.error('Failed to reset password'); }
    finally { setResetting(null); }
  };

  const toggleActive = async (teacher) => {
    const action = teacher.isActive ? 'deactivate' : 'activate';
    const msg = teacher.isActive
      ? `Deactivate ${teacher.firstName}? They will not be able to login.`
      : `Reactivate ${teacher.firstName}? They will be able to login again.`;
    if (!window.confirm(msg)) return;
    setToggling(teacher.teacherId);
    try {
      await api.post(`/admin/teachers/${teacher.teacherId}/${action}`);
      toast.success(`Teacher ${action}d successfully`);
      load();
    } catch { toast.error(`Failed to ${action} teacher`); }
    finally { setToggling(null); }
  };

  const openEdit = (t) => setEditModal({ teacherId: t.teacherId, firstName: t.firstName, lastName: t.lastName, email: t.email || '', phone: t.phone || '' });

  const saveEdit = async () => {
    setEditLoading(true);
    try {
      await api.put(`/admin/teachers/${editModal.teacherId}`, {
        firstName: editModal.firstName, lastName: editModal.lastName,
        email: editModal.email, phone: editModal.phone,
      });
      toast.success('Teacher updated');
      setEditModal(null);
      load();
    } catch { toast.error('Failed to update teacher'); }
    finally { setEditLoading(false); }
  };

  return (
    <div>
      <h1 style={s.title}>👩‍🏫 Teachers</h1>

      {/* Credentials popup */}
      {showCreds && (
        <div style={s.overlay} onClick={() => setShowCreds(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalIcon}>{showCreds.isReset ? '🔄' : '✅'}</div>
            <h3 style={s.modalTitle}>{showCreds.isReset ? `Password Reset — ${showCreds.name}` : 'Teacher Created'}</h3>
            <div style={s.credBox}>
              <div style={s.credRow}><span style={s.credLabel}>Username</span><strong style={s.credValue}>{showCreds.username}</strong></div>
              <div style={s.credRow}><span style={s.credLabel}>Temp Password</span><strong style={s.credValue}>{showCreds.password}</strong></div>
            </div>
            <p style={s.credNote}>⚠️ Teacher must change password on first login</p>
            <button style={s.modalBtn} onClick={() => setShowCreds(null)}>Done</button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div style={s.overlay} onClick={() => setEditModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>✏️ Edit Teacher</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
              {[
                { key: 'firstName', label: 'First Name' },
                { key: 'lastName',  label: 'Last Name' },
                { key: 'email',     label: 'Email' },
                { key: 'phone',     label: 'Phone' },
              ].map(f => (
                <div key={f.key}>
                  <label style={s.label}>{f.label}</label>
                  <input style={{ ...s.input, width: '100%', boxSizing: 'border-box' }}
                    value={editModal[f.key]}
                    onChange={e => setEditModal({ ...editModal, [f.key]: e.target.value })} />
                </div>
              ))}
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

      {/* Create form */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>Add New Teacher</h3>
        <form onSubmit={submit} style={s.form}>
          <div style={s.grid}>
            {[
              { key: 'firstName', label: 'First Name',       placeholder: 'John',              req: true },
              { key: 'lastName',  label: 'Last Name',        placeholder: 'Doe',               req: true },
              { key: 'username',  label: 'Username (login)', placeholder: 'jdoe',              req: true },
              { key: 'email',     label: 'Email',            placeholder: 'jdoe@school.ac.ke', req: false },
              { key: 'phone',     label: 'Phone',            placeholder: '0712345678',        req: false },
            ].map(f => (
              <div key={f.key} style={s.field}>
                <label style={s.label}>{f.label}</label>
                <input style={s.input} type="text" placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  required={f.req} />
              </div>
            ))}
          </div>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Creating...' : '+ Add Teacher'}
          </button>
        </form>
      </div>

      {/* Teachers table */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>All Teachers ({teachers.length})</h3>
        {pageLoading ? (
          <div style={s.spinner}>Loading teachers...</div>
        ) : teachers.length === 0 ? (
          <p style={s.empty}>No teachers yet.</p>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['ID', 'Name', 'Email', 'Phone', 'Status', 'Actions'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teachers.map((t, i) => (
                  <tr key={t.teacherId} style={{
                    background: !t.isActive ? '#fef2f2' : i % 2 === 0 ? '#f8fafc' : '#fff',
                    opacity: !t.isActive ? 0.8 : 1,
                  }}>
                    <td style={s.td}>{t.teacherId}</td>
                    <td style={{ ...s.td, textAlign: 'left', whiteSpace: 'nowrap' }}>
                      <strong>{t.firstName} {t.lastName}</strong>
                    </td>
                    <td style={s.td}>{t.email || '—'}</td>
                    <td style={s.td}>{t.phone || '—'}</td>
                    <td style={s.td}>
                      <span style={{
                        ...s.statusBadge,
                        background: t.isActive ? '#dcfce7' : '#fee2e2',
                        color: t.isActive ? '#16a34a' : '#dc2626',
                      }}>
                        {t.isActive ? '✅ Active' : '🚫 Inactive'}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button style={s.editBtn} onClick={() => openEdit(t)}>✏️ Edit</button>
                        <button style={s.resetBtn} onClick={() => resetPassword(t)}
                          disabled={resetting === t.teacherId || !t.isActive}>
                          {resetting === t.teacherId ? '...' : '🔄 Reset'}
                        </button>
                        <button
                          style={{ ...s.toggleBtn, background: t.isActive ? '#fee2e2' : '#dcfce7',
                            color: t.isActive ? '#dc2626' : '#16a34a',
                            borderColor: t.isActive ? '#fca5a5' : '#86efac' }}
                          onClick={() => toggleActive(t)}
                          disabled={toggling === t.teacherId}
                        >
                          {toggling === t.teacherId ? '...' : t.isActive ? '🚫 Deactivate' : '✅ Activate'}
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
    </div>
  );
}

const s = {
  title:       { fontSize: 24, fontWeight: 700, color: '#1e3a5f', marginBottom: 24 },
  card:        { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,.06)' },
  cardTitle:   { fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 16 },
  form:        { display: 'flex', flexDirection: 'column', gap: 16 },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 14 },
  field:       { display: 'flex', flexDirection: 'column', gap: 4 },
  label:       { fontSize: 13, fontWeight: 600, color: '#555' },
  input:       { padding: '9px 12px', borderRadius: 8, border: '1.5px solid #dde3ea', fontSize: 14 },
  btn:         { padding: '11px 28px', background: '#1e5fa0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14, alignSelf: 'flex-start' },
  btnCancel:   { padding: '10px 24px', background: '#f1f5f9', color: '#555', border: '1.5px solid #dde3ea', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  editBtn:     { padding: '6px 12px', background: '#dbeafe', color: '#1e5fa0', border: '1.5px solid #93c5fd', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  resetBtn:    { padding: '6px 12px', background: '#fef3c7', color: '#92400e', border: '1.5px solid #fcd34d', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  toggleBtn:   { padding: '6px 12px', border: '1.5px solid', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  statusBadge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  tableWrap:   { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 700 },
  th:          { background: '#1e3a5f', color: '#fff', padding: '10px 14px', textAlign: 'center', fontWeight: 600, whiteSpace: 'nowrap' },
  td:          { padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid #f0f4f8' },
  empty:       { color: '#aaa', textAlign: 'center', padding: 32 },
  spinner:     { textAlign: 'center', padding: 40, color: '#1e5fa0', fontWeight: 600, fontSize: 15 },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modal:       { background: '#fff', borderRadius: 16, padding: 36, minWidth: 360, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,.2)', textAlign: 'center' },
  modalIcon:   { fontSize: 40, marginBottom: 12 },
  modalTitle:  { fontSize: 18, fontWeight: 700, color: '#1e3a5f', marginBottom: 20 },
  credBox:     { background: '#f8fafc', borderRadius: 10, padding: '16px 20px', marginBottom: 12, textAlign: 'left' },
  credRow:     { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' },
  credLabel:   { fontSize: 13, color: '#888' },
  credValue:   { fontSize: 14, color: '#1e3a5f' },
  credNote:    { fontSize: 12, color: '#e55', marginBottom: 16 },
  modalBtn:    { padding: '10px 32px', background: '#1e5fa0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' },
};