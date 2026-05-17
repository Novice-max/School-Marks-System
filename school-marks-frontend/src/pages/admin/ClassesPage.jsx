import { useEffect, useState } from 'react';
import { getClasses, createClass } from '../../api/client';
import api from '../../api/client';
import { usePageStyles } from '../../styles/pageStyles';
import toast from 'react-hot-toast';

const GRADES = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const LEVEL  = g => g < 1 ? 'pre_primary' : g <= 3 ? 'lower_primary' : g <= 6 ? 'upper_primary' : 'junior_secondary';
const LABEL  = g => g === -1 ? 'PP1 (Pre-Primary 1)' : g === 0 ? 'PP2 (Pre-Primary 2)' : g <= 6 ? `Grade ${g} (Primary)` : `Grade ${g} (JSS)`;

export default function ClassesPage() {
  const s = usePageStyles();
  const t = s.tokens;

  const [classes,     setClasses]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [editModal,   setEditModal]   = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [form, setForm] = useState({ gradeLevel: 1, academicYear: new Date().getFullYear().toString() });

  const load = () => {
    setPageLoading(true);
    getClasses().then(r => setClasses(r.data))
      .catch(() => toast.error('Failed to load classes'))
      .finally(() => setPageLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await createClass({ gradeLevel: Number(form.gradeLevel), levelType: LEVEL(Number(form.gradeLevel)), academicYear: form.academicYear });
      toast.success('Class created'); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create class'); }
    finally { setLoading(false); }
  };

  const openEdit = (c) => setEditModal({ classId: c.classId, academicYear: c.academicYear, gradeLevel: c.gradeLevel });

  const saveEdit = async () => {
    setEditLoading(true);
    try {
      await api.put(`/admin/classes/${editModal.classId}`, { academicYear: editModal.academicYear });
      toast.success('Class updated'); setEditModal(null); load();
    } catch { toast.error('Failed to update class'); }
    finally { setEditLoading(false); }
  };

  const badgeColor = (lt) => {
    const map = {
      pre_primary:      { bg: t.warningBg,  color: t.warningText },
      lower_primary:    { bg: t.successBg,   color: t.successText },
      upper_primary:    { bg: t.infoBg,      color: t.infoText },
      junior_secondary: { bg: t.accentSubtle, color: t.accent },
    };
    return map[lt] || { bg: t.rowAlt, color: t.textMuted };
  };

  return (
    <div>
      <h1 style={s.title}>🏫 Classes</h1>

      {/* Edit modal */}
      {editModal && (
        <div style={s.overlay} onClick={() => setEditModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>✏️ Edit Class</h3>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 14, color: t.textMuted, marginBottom: 16 }}>
                <strong>{LABEL(editModal.gradeLevel)}</strong>
              </p>
              <label style={s.label}>Academic Year</label>
              <input style={{ ...s.input, width: '100%', boxSizing: 'border-box' }}
                value={editModal.academicYear}
                onChange={e => setEditModal({ ...editModal, academicYear: e.target.value })} />
              <p style={{ fontSize: 12, color: t.textFaint, marginTop: 8 }}>
                Grade level cannot be changed (marks depend on it).
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button style={s.btnCancel} onClick={() => setEditModal(null)}>Cancel</button>
              <button style={s.modalBtn} onClick={saveEdit} disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>Create New Class</h3>
        <form onSubmit={submit} style={s.form}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ ...s.field, minWidth: 200 }}>
              <label style={s.label}>Grade Level</label>
              <select style={s.input} value={form.gradeLevel}
                onChange={e => setForm({...form, gradeLevel: e.target.value})}>
                {GRADES.map(g => <option key={g} value={g}>{LABEL(g)}</option>)}
              </select>
            </div>
            <div style={{ ...s.field, minWidth: 200 }}>
              <label style={s.label}>Academic Year</label>
              <input style={s.input} type="text" value={form.academicYear}
                onChange={e => setForm({...form, academicYear: e.target.value})}
                placeholder="e.g. 2025" required />
            </div>
            <button style={{ ...s.btn, height: 40 }} type="submit" disabled={loading}>
              {loading ? 'Creating...' : '+ Create Class'}
            </button>
          </div>
        </form>
      </div>

      {/* Classes table */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>All Classes ({classes.length})</h3>
        {pageLoading ? (
          <div style={s.spinner}>Loading classes...</div>
        ) : classes.length === 0 ? (
          <p style={s.empty}>No classes yet. Create one above.</p>
        ) : (
          <div style={s.tableWrap}>
            <table style={{ ...s.table, minWidth: 550 }}>
              <thead>
                <tr>{['ID','Grade','Level','Academic Year','Actions'].map(h =>
                  <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {classes.map((c, i) => {
                  const bc = badgeColor(c.levelType);
                  return (
                    <tr key={c.classId} style={s.rowBg(i)}>
                      <td style={s.td}>{c.classId}</td>
                      <td style={s.td}>{LABEL(c.gradeLevel)}</td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: bc.bg, color: bc.color }}>{c.levelType}</span>
                      </td>
                      <td style={s.td}>{c.academicYear}</td>
                      <td style={s.td}>
                        <button style={s.editBtn} onClick={() => openEdit(c)}>✏️ Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}