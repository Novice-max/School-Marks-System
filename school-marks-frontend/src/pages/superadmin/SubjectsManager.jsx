import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Archive, RotateCcw, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllSubjects, createSubject, renameSubject, archiveSubject, restoreSubject } from '../../api/client';
import { useSuperTheme } from '../../components/superTheme';
import { PageHeader, Panel, Button, Pill, Modal, Empty } from '../../components/superUi';

const LEVELS = [
  { key: 'pre_primary',      label: 'Pre-Primary',      sub: 'Playgroup, PP1 & PP2' },
  { key: 'lower_primary',    label: 'Lower Primary',    sub: 'Grade 1–3' },
  { key: 'upper_primary',    label: 'Upper Primary',    sub: 'Grade 4–6' },
  { key: 'junior_secondary', label: 'Junior Secondary', sub: 'Grade 7–9' },
];

export default function SubjectsManager() {
  const th = useSuperTheme();
  const t = th.t;

  const [subjects, setSubjects]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy]               = useState(null);
  const [editing, setEditing]         = useState(null); // { subjectId, name }
  const [adding, setAdding]           = useState({});   // levelKey → text
  const [confirm, setConfirm]         = useState(null); // subject to archive

  const load = () => {
    setLoading(true);
    getAllSubjects()
      .then(r => setSubjects(r.data))
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load subjects'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const byLevel = useMemo(() => {
    const m = {};
    LEVELS.forEach(l => { m[l.key] = subjects.filter(s => s.levelType === l.key); });
    return m;
  }, [subjects]);

  const archivedCount = subjects.filter(s => !s.isActive).length;

  const add = async (levelKey) => {
    const name = (adding[levelKey] || '').trim();
    if (name.length < 2) { toast.error('Enter a subject name'); return; }
    setBusy(`add-${levelKey}`);
    try {
      await createSubject({ subjectName: name, levelType: levelKey });
      toast.success(`${name} added`);
      setAdding(a => ({ ...a, [levelKey]: '' }));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add subject');
    } finally { setBusy(null); }
  };

  const saveRename = async () => {
    const name = editing.name.trim();
    if (name.length < 2) { toast.error('Name is too short'); return; }
    setBusy(editing.subjectId);
    try {
      await renameSubject(editing.subjectId, { subjectName: name });
      toast.success('Renamed');
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rename failed');
    } finally { setBusy(null); }
  };

  const doArchive = async () => {
    const s = confirm;
    setConfirm(null);
    setBusy(s.subjectId);
    try {
      await archiveSubject(s.subjectId);
      toast.success(`${s.subjectName} archived`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Archive failed');
    } finally { setBusy(null); }
  };

  const doRestore = async (s) => {
    setBusy(s.subjectId);
    try {
      await restoreSubject(s.subjectId);
      toast.success(`${s.subjectName} restored`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Restore failed');
    } finally { setBusy(null); }
  };

  const iconBtn = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28,
    borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: t.textFaint, flexShrink: 0,
  };

  return (
    <div>
      <PageHeader
        eyebrow="Curriculum"
        title="Subjects"
        subtitle="Changes apply instantly to mark entry, teacher assignments and new report cards. Subjects are archived, never deleted, so past marks stay intact."
        actions={archivedCount > 0 && (
          <Button variant="ghost" onClick={() => setShowArchived(v => !v)}>
            {showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}
          </Button>
        )}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 270px), 1fr))', gap: 16 }}>
        {LEVELS.map(level => {
          const list = byLevel[level.key] || [];
          const visible = list.filter(s => s.isActive || showArchived);
          const activeN = list.filter(s => s.isActive).length;
          return (
            <Panel key={level.key} pad={0} style={{ borderTop: `3px solid ${th.gold}` }}
              title={<span>{level.label} <span style={{ fontWeight: 500, color: t.textFaint }}>· {level.sub}</span></span>}
              right={<Pill mono>{activeN}</Pill>}>
              <div>
                {loading && list.length === 0 && <Empty>Loading…</Empty>}
                {!loading && visible.length === 0 && <Empty>No subjects yet</Empty>}

                {visible.map((s, i) => {
                  const isEditing = editing?.subjectId === s.subjectId;
                  return (
                    <div key={s.subjectId} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
                      borderBottom: `1px solid ${t.border}`, opacity: s.isActive ? 1 : 0.55,
                    }}>
                      <span style={{ fontFamily: th.mono, fontSize: 11, color: t.textFaint, width: 18, flexShrink: 0 }}>
                        {s.isActive ? i + 1 : '–'}
                      </span>

                      {isEditing ? (
                        <>
                          <input autoFocus value={editing.name}
                            onChange={e => setEditing({ ...editing, name: e.target.value })}
                            onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setEditing(null); }}
                            style={{ flex: 1, minWidth: 0, padding: '5px 8px', borderRadius: 6, fontSize: 14,
                                     border: `1.5px solid ${th.gold}`, background: t.inputBg, color: t.text }} />
                          <button style={{ ...iconBtn, color: t.successText }} onClick={saveRename} aria-label="Save"><Check size={15} /></button>
                          <button style={iconBtn} onClick={() => setEditing(null)} aria-label="Cancel"><X size={15} /></button>
                        </>
                      ) : (
                        <>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: t.text,
                                          textDecoration: s.isActive ? 'none' : 'line-through' }}>
                              {s.subjectName}
                            </div>
                            <div style={{ fontSize: 11.5, color: t.textFaint }}>
                              {s.markCount > 0 ? `${s.markCount.toLocaleString()} marks recorded` : 'No marks yet'}
                              {!s.isActive && ' · archived'}
                            </div>
                          </div>
                          {s.isActive ? (
                            <>
                              <button style={iconBtn} disabled={busy === s.subjectId} title="Rename"
                                onClick={() => setEditing({ subjectId: s.subjectId, name: s.subjectName })}
                                aria-label={`Rename ${s.subjectName}`}><Pencil size={14} /></button>
                              <button style={iconBtn} disabled={busy === s.subjectId} title="Archive"
                                onClick={() => setConfirm(s)} aria-label={`Archive ${s.subjectName}`}><Archive size={14} /></button>
                            </>
                          ) : (
                            <button style={{ ...iconBtn, width: 'auto', padding: '0 8px', gap: 4, color: th.gold, fontWeight: 700, fontSize: 12 }}
                              disabled={busy === s.subjectId} onClick={() => doRestore(s)}>
                              <RotateCcw size={13} /> Restore
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}

                {/* add */}
                <form onSubmit={e => { e.preventDefault(); add(level.key); }}
                  style={{ display: 'flex', gap: 6, padding: 12 }}>
                  <input value={adding[level.key] || ''} maxLength={80}
                    onChange={e => setAdding(a => ({ ...a, [level.key]: e.target.value }))}
                    placeholder="Add a subject…"
                    style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, fontSize: 13.5,
                             border: `1.5px dashed ${t.inputBorder}`, background: 'transparent', color: t.text }} />
                  <Button type="submit" style={{ padding: '7px 10px' }} disabled={busy === `add-${level.key}`}
                    aria-label={`Add subject to ${level.label}`}>
                    <Plus size={15} />
                  </Button>
                </form>
              </div>
            </Panel>
          );
        })}
      </div>

      <p style={{ fontSize: 12.5, color: t.textFaint, marginTop: 16, lineHeight: 1.6 }}>
        Renaming changes the name everywhere, including report cards for past terms. To start a different subject, add a new one and archive the old.
      </p>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={`Archive ${confirm?.subjectName}?`}>
        {confirm && (<>
          <ul style={{ margin: '0 0 18px', paddingLeft: 18, fontSize: 14, color: t.textMuted, lineHeight: 1.6 }}>
            <li>It disappears from mark entry and new teacher assignments.</li>
            <li>{confirm.markCount > 0
              ? <><strong style={{ color: t.text }}>{confirm.markCount.toLocaleString()} recorded marks are kept</strong> and still appear on report cards for terms that have them.</>
              : 'It has no marks, so no report card is affected.'}</li>
            <li>You can restore it at any time.</li>
          </ul>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={doArchive}><Archive size={14} /> Archive</Button>
          </div>
        </>)}
      </Modal>
    </div>
  );
}
