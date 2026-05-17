import { useEffect, useState } from 'react';
import { createTeacher } from '../../api/client';
import api from '../../api/client';
import { usePageStyles } from '../../styles/pageStyles';
import toast from 'react-hot-toast';

export default function TeachersPage() {
  const s = usePageStyles();
  const t = s.tokens;

  const [teachers,    setTeachers]    = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading,     setLoading]     = useState(false);
  const [resetting,   setResetting]   = useState(null);
  const [toggling,    setToggling]    = useState(null);
  const [showCreds,   setShowCreds]   = useState(null);
  const [editModal,   setEditModal]   = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', username: '' });

  const load = () => {
    setPageLoading(true);
    api.get('/admin/teachers/with-status')
      .then(r => setTeachers(r.data))
      .catch(() => toast.error('Failed to load teachers'))
      .finally(() => setPageLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await createTeacher(form);
      toast.success('Teacher created');
      setShowCreds({ username: data.username, password: data.defaultPassword });
      setForm({ firstName: '', lastName: '', email: '', phone: '', username: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create teacher'); }
    finally { setLoading(false); }
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
    try { await api.post(`/admin/teachers/${teacher.teacherId}/${action}`); toast.success(`Teacher ${action}d`); load(); }
    catch { toast.error(`Failed to ${action} teacher`); }
    finally { setToggling(null); }
  };

  const openEdit = (tc) => setEditModal({ teacherId: tc.teacherId, firstName: tc.firstName, lastName: tc.lastName, email: tc.email || '', phone: tc.phone || '' });

  const saveEdit = async () => {
    setEditLoading(true);
    try {
      await api.put(`/admin/teachers/${editModal.teacherId}`, {
        firstName: editModal.firstName, lastName: editModal.lastName,
        email: editModal.email, phone: editModal.phone,
      });
      toast.success('Teacher updated'); setEditModal(null); load();
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
            <div style={{ fontSize: 40, marginBottom: 12 }}>{showCreds.isReset ? '🔄' : '✅'}</div>
            <h3 style={s.modalTitle}>{showCreds.isReset ? `Password Reset — ${showCreds.name}` : 'Teacher Created'}</h3>
            <div style={{ background: t.rowAlt, borderRadius: 10, padding: '16px 20px', marginBottom: 12, textAlign: 'left', border: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${t.border}` }}>
                <span style={{ fontSize: 13, color: t.textFaint }}>Username</span>
                <strong style={{ fontSize: 14, color: t.text }}>{showCreds.username}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: 13, color: t.textFaint }}>Temp Password</span>
                <strong style={{ fontSize: 14, color: t.text }}>{showCreds.password}</strong>
              </div>
            </div>
            <p style={{ fontSize: 12, color: t.danger, marginBottom: 16 }}>⚠️ Teacher must change password on first login</p>
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
          <div style={{ ...s.grid, gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))' }}>
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
                <tr>{['ID', 'Name', 'Email', 'Phone', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ ...s.th, textAlign: 'center' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {teachers.map((tc, i) => (
                  <tr key={tc.teacherId} style={{
                    ...s.rowBg(i),
                    ...(!tc.isActive ? { background: t.dangerBg, opacity: 0.8 } : {}),
                  }}>
                    <td style={{ ...s.td, textAlign: 'center' }}>{tc.teacherId}</td>
                    <td style={{ ...s.td, textAlign: 'left', whiteSpace: 'nowrap' }}>
                      <strong>{tc.firstName} {tc.lastName}</strong>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>{tc.email || '—'}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>{tc.phone || '—'}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <span style={{
                        ...s.badge,
                        ...(tc.isActive ? s.statusActive : s.statusInactive),
                      }}>
                        {tc.isActive ? '✅ Active' : '🚫 Inactive'}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button style={s.editBtn} onClick={() => openEdit(tc)}>✏️ Edit</button>
                        <button style={s.resetBtn} onClick={() => resetPassword(tc)}
                          disabled={resetting === tc.teacherId || !tc.isActive}>
                          {resetting === tc.teacherId ? '...' : '🔄 Reset'}
                        </button>
                        <button
                          style={{
                            padding: '6px 12px', border: '1.5px solid', borderRadius: 6,
                            cursor: 'pointer', fontWeight: 600, fontSize: 12,
                            background: tc.isActive ? t.dangerBg : t.successBg,
                            color: tc.isActive ? t.danger : t.successText,
                            borderColor: tc.isActive ? t.dangerBorder : t.successBorder,
                          }}
                          onClick={() => toggleActive(tc)}
                          disabled={toggling === tc.teacherId}
                        >
                          {toggling === tc.teacherId ? '...' : tc.isActive ? '🚫 Deactivate' : '✅ Activate'}
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