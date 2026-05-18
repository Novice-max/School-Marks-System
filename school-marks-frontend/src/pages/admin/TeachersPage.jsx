import { useEffect, useState } from 'react';
import { createTeacher } from '../../api/client';
import api from '../../api/client';
import { usePageStyles } from '../../styles/pageStyles';
import Avatar from '../../components/Avatar';
import SlideOutPanel from '../../components/SlideOutPanel';
import TableSkeleton from '../../components/TableSkeleton';
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
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', username: '' });

  const [panelTeacher, setPanelTeacher] = useState(null);
  const [editData,     setEditData]     = useState(null);
  const [editLoading,  setEditLoading]  = useState(false);

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

  const resetPassword = async (teacher, e) => {
    e.stopPropagation();
    if (!window.confirm(`Reset password for ${teacher.firstName} ${teacher.lastName}?`)) return;
    setResetting(teacher.teacherId);
    try {
      const { data } = await api.post(`/admin/teachers/${teacher.teacherId}/reset-password`);
      setShowCreds({ username: data.tempPassword.replace('123', ''), password: data.tempPassword, isReset: true, name: teacher.firstName });
      toast.success('Password reset');
    } catch { toast.error('Failed to reset password'); }
    finally { setResetting(null); }
  };

  const toggleActive = async (teacher, e) => {
    e.stopPropagation();
    const action = teacher.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`${action === 'deactivate' ? 'Deactivate' : 'Reactivate'} ${teacher.firstName}?`)) return;
    setToggling(teacher.teacherId);
    try { await api.post(`/admin/teachers/${teacher.teacherId}/${action}`); toast.success(`Teacher ${action}d`); load(); }
    catch { toast.error(`Failed to ${action} teacher`); }
    finally { setToggling(null); }
  };

  const openPanel = (tc) => {
    setPanelTeacher(tc);
    setEditData({ firstName: tc.firstName, lastName: tc.lastName, email: tc.email || '', phone: tc.phone || '' });
  };

  const saveEdit = async () => {
    setEditLoading(true);
    try {
      await api.put(`/admin/teachers/${panelTeacher.teacherId}`, editData);
      toast.success('Teacher updated'); load();
      setPanelTeacher(prev => ({ ...prev, ...editData }));
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

      {/* Detail panel */}
      <SlideOutPanel open={!!panelTeacher} onClose={() => setPanelTeacher(null)} title="Teacher Details">
        {panelTeacher && editData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 16, borderBottom: `1px solid ${t.border}` }}>
              <Avatar name={`${panelTeacher.firstName} ${panelTeacher.lastName}`} size={56} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: t.text }}>{panelTeacher.firstName} {panelTeacher.lastName}</div>
                <div style={{ fontSize: 13, color: t.textFaint }}>ID: {panelTeacher.teacherId}</div>
                <span style={{ ...s.badge, marginTop: 4, display: 'inline-block', ...(panelTeacher.isActive ? s.statusActive : s.statusInactive) }}>
                  {panelTeacher.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <InfoRow label="Username" value={panelTeacher.username || '—'} tokens={t} />
              <InfoRow label="Email" value={panelTeacher.email || '—'} tokens={t} />
              <InfoRow label="Phone" value={panelTeacher.phone || '—'} tokens={t} />
            </div>

            <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.textMuted, marginBottom: 12 }}>Edit Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'firstName', label: 'First Name' }, { key: 'lastName', label: 'Last Name' },
                  { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 3, display: 'block' }}>{f.label}</label>
                    <input style={{ ...s.input, width: '100%', boxSizing: 'border-box' }}
                      value={editData[f.key]} onChange={e => setEditData({ ...editData, [f.key]: e.target.value })} />
                  </div>
                ))}
              </div>
              <button style={{ ...s.btn, marginTop: 16, width: '100%', textAlign: 'center', justifyContent: 'center' }}
                onClick={saveEdit} disabled={editLoading}>
                {editLoading ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        )}
      </SlideOutPanel>

      {/* Create form */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>Add New Teacher</h3>
        <form onSubmit={submit} style={s.form}>
          <div style={{ ...s.grid, gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))' }}>
            {[
              { key: 'firstName', label: 'First Name', placeholder: 'John', req: true },
              { key: 'lastName', label: 'Last Name', placeholder: 'Doe', req: true },
              { key: 'username', label: 'Username (login)', placeholder: 'jdoe', req: true },
              { key: 'email', label: 'Email', placeholder: 'jdoe@school.ac.ke', req: false },
              { key: 'phone', label: 'Phone', placeholder: '0712345678', req: false },
            ].map(f => (
              <div key={f.key} style={s.field}>
                <label style={s.label}>{f.label}</label>
                <input style={s.input} type="text" placeholder={f.placeholder}
                  value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required={f.req} />
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
          <TableSkeleton rows={6} cols={5} />
        ) : teachers.length === 0 ? (
          <p style={s.empty}>No teachers yet.</p>
        ) : (
          <div style={s.tableWrap}>
            <table style={{ ...s.table, minWidth: 700 }}>
              <thead>
                <tr>{['Teacher', 'Email', 'Phone', 'Status', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {teachers.map((tc, i) => (
                  <tr key={tc.teacherId} onClick={() => openPanel(tc)}
                    style={{ ...s.rowBg(i), cursor: 'pointer', transition: 'background 0.1s ease', ...(!tc.isActive ? { opacity: 0.6 } : {}) }}
                    onMouseEnter={e => { if (tc.isActive) e.currentTarget.style.background = t.accentSubtle; }}
                    onMouseLeave={e => { e.currentTarget.style.background = s.rowBg(i).background; }}>
                    <td style={{ ...s.td, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={`${tc.firstName} ${tc.lastName}`} size={34} />
                        <div>
                          <div style={{ fontWeight: 600, color: t.text, whiteSpace: 'nowrap' }}>{tc.firstName} {tc.lastName}</div>
                          <div style={{ fontSize: 11, color: t.textFaint }}>ID: {tc.teacherId}</div>
                        </div>
                      </div>
                    </td>
                    <td style={s.td}>{tc.email || '—'}</td>
                    <td style={s.td}>{tc.phone || '—'}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, ...(tc.isActive ? s.statusActive : s.statusInactive) }}>
                        {tc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ ...s.td, width: 100 }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                        <button style={s.resetBtn} onClick={(e) => resetPassword(tc, e)}
                          disabled={resetting === tc.teacherId || !tc.isActive}>
                          {resetting === tc.teacherId ? '...' : '🔄'}
                        </button>
                        <button style={{
                            padding: '5px 8px', border: '1.5px solid', borderRadius: 6,
                            cursor: 'pointer', fontWeight: 600, fontSize: 12, background: 'transparent',
                            color: tc.isActive ? t.danger : t.successText,
                            borderColor: tc.isActive ? t.dangerBorder : t.successBorder,
                          }}
                          onClick={(e) => toggleActive(tc, e)} disabled={toggling === tc.teacherId}>
                          {toggling === tc.teacherId ? '...' : tc.isActive ? '🚫' : '✅'}
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

function InfoRow({ label, value, tokens }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${tokens.border}` }}>
      <span style={{ fontSize: 13, color: tokens.textFaint }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: tokens.text }}>{value}</span>
    </div>
  );
}