import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, KeyRound, UserPlus, Copy, Check, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAdmins, createAdmin, updateAdmin, setAdminActive, resetAdminPassword } from '../../api/client';
import { useSuperTheme, fmtDateTime, timeAgo } from '../../components/superTheme';
import { PageHeader, Panel, Button, Pill, Field, Modal, Empty, useInputStyle } from '../../components/superUi';

export default function AdminsPage() {
  const th = useSuperTheme();
  const t = th.t;
  const input = useInputStyle();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState({ fullName: '', username: '' });
  const [saving, setSaving]     = useState(false);
  const [busyId, setBusyId]     = useState(null);
  const [creds, setCreds]       = useState(null);   // { username, tempPassword, fullName, reset }
  const [editing, setEditing]   = useState(null);   // { userId, fullName }
  const [confirm, setConfirm]   = useState(null);   // { account, activate }

  const load = () => {
    setLoading(true);
    getAdmins()
      .then(r => setAccounts(r.data))
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load admins'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await createAdmin({ fullName: form.fullName.trim(), username: form.username.trim() });
      setCreds({ ...data, reset: false });
      setForm({ fullName: '', username: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create admin');
    } finally {
      setSaving(false);
    }
  };

  const doToggle = async () => {
    const { account, activate } = confirm;
    setConfirm(null);
    setBusyId(account.userId);
    try {
      await setAdminActive(account.userId, activate);
      toast.success(`${account.fullName} ${activate ? 'reactivated' : 'deactivated'}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const doReset = async (account) => {
    if (!window.confirm(`Reset the password for ${account.fullName}? Their current password stops working immediately.`)) return;
    setBusyId(account.userId);
    try {
      const { data } = await resetAdminPassword(account.userId);
      setCreds({ ...data, reset: true });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setBusyId(null);
    }
  };

  const saveName = async () => {
    const name = editing.fullName.trim();
    if (name.length < 2) { toast.error('Name is too short'); return; }
    setBusyId(editing.userId);
    try {
      await updateAdmin(editing.userId, { fullName: name });
      toast.success('Name updated');
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const supers = accounts.filter(a => a.role === 'SUPERADMIN');
  const admins = accounts.filter(a => a.role === 'ADMIN');

  return (
    <div>
      <PageHeader
        eyebrow="Chain of command"
        title="Admins"
        subtitle="Register school administrators and control their access. Deactivation takes effect on their next click."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 16, alignItems: 'start' }}>
        {/* ── Register ── */}
        <Panel title="Register an admin">
          <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
            <Field label="Full name">
              <input style={input} value={form.fullName} required minLength={2} maxLength={80}
                placeholder="e.g. Grace Wanjiku"
                onChange={e => setForm({ ...form, fullName: e.target.value })} />
            </Field>
            <Field label="Username (login)" hint="3–30 characters: letters, numbers, . _ -">
              <input style={{ ...input, fontFamily: th.mono }} value={form.username} required
                pattern="[A-Za-z0-9._\-]{3,30}" placeholder="gwanjiku" autoCapitalize="none" spellCheck={false}
                onChange={e => setForm({ ...form, username: e.target.value.replace(/\s/g, '') })} />
            </Field>
            <div style={{ fontSize: 12.5, color: t.textMuted, background: th.goldSoft, border: `1px solid ${th.goldLine}`,
                          borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 }}>
              A random temporary password is generated and shown <strong>once</strong>. They must change it on first sign-in.
              Admins can manage teachers, students, classes, exams and reports, but not other admins, subjects or this log.
            </div>
            <Button type="submit" disabled={saving}><UserPlus size={15} /> {saving ? 'Creating…' : 'Create admin'}</Button>
          </form>
        </Panel>

        {/* ── Accounts ── */}
        <Panel title={`Accounts (${accounts.length})`} pad={0}>
          {loading && accounts.length === 0 && <Empty>Loading…</Empty>}

          {supers.map(a => (
            <AccountRow key={a.userId} a={a} th={th}
              badge={<Pill color={th.goldStrong} bg={th.goldSoft}><Lock size={11} /> Protected</Pill>}
              note="Superadmin accounts can't be deactivated or edited from the app." />
          ))}

          {!loading && admins.length === 0 && (
            <Empty>No admins yet. Register the first one on the left.</Empty>
          )}

          {admins.map(a => (
            <AccountRow key={a.userId} a={a} th={th}
              badge={a.isActive
                ? <Pill color={t.successText} bg={t.successBg}>Active</Pill>
                : <Pill color={t.danger} bg={t.dangerBg}>Deactivated</Pill>}
              editing={editing?.userId === a.userId ? editing : null}
              onEditChange={v => setEditing({ ...editing, fullName: v })}
              onEditSave={saveName}
              onEditCancel={() => setEditing(null)}
              actions={
                <>
                  <Button variant="ghost" style={{ padding: '6px 10px' }} disabled={busyId === a.userId}
                    onClick={() => setEditing({ userId: a.userId, fullName: a.fullName })} title="Rename">
                    <Pencil size={13} />
                  </Button>
                  <Button variant="ghost" style={{ padding: '6px 10px' }} disabled={busyId === a.userId || !a.isActive}
                    onClick={() => doReset(a)} title="Reset password">
                    <KeyRound size={13} /> Reset
                  </Button>
                  {a.isActive
                    ? <Button variant="danger" style={{ padding: '6px 10px' }} disabled={busyId === a.userId}
                        onClick={() => setConfirm({ account: a, activate: false })}>Deactivate</Button>
                    : <Button variant="success" style={{ padding: '6px 10px' }} disabled={busyId === a.userId}
                        onClick={() => setConfirm({ account: a, activate: true })}>Reactivate</Button>}
                </>
              }
            />
          ))}
        </Panel>
      </div>

      {/* ── Confirm deactivate / reactivate ── */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)}
        title={confirm?.activate ? 'Reactivate admin?' : 'Deactivate admin?'}>
        {confirm && (<>
          <p style={{ margin: '0 0 18px', fontSize: 14, color: t.textMuted, lineHeight: 1.55 }}>
            {confirm.activate
              ? <><strong style={{ color: t.text }}>{confirm.account.fullName}</strong> will be able to sign in again with their existing password.</>
              : <><strong style={{ color: t.text }}>{confirm.account.fullName}</strong> will be signed out on their next action and can't sign in until reactivated. Their past activity stays in the log.</>}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant={confirm.activate ? 'primary' : 'danger'} onClick={doToggle}>
              {confirm.activate ? 'Reactivate' : 'Deactivate'}
            </Button>
          </div>
        </>)}
      </Modal>

      {/* ── One-time credentials ── */}
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} />
    </div>
  );
}

function AccountRow({ a, th, badge, note, actions, editing, onEditChange, onEditSave, onEditCancel }) {
  const t = th.t;
  const initials = (a.fullName || a.username).split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const isSuper = a.role === 'SUPERADMIN';
  return (
    <div style={{ display: 'flex', gap: 14, padding: '14px 18px', borderBottom: `1px solid ${t.border}`,
                  alignItems: 'center', flexWrap: 'wrap', opacity: a.isActive ? 1 : 0.65 }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 800, fontSize: 13,
                    background: isSuper ? th.gold : t.accentSubtle, color: isSuper ? th.onGold : t.accent }}>
        {initials}
      </div>
      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
        {editing ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <input autoFocus value={editing.fullName} onChange={e => onEditChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onEditSave(); if (e.key === 'Escape') onEditCancel(); }}
              style={{ flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: 6, fontSize: 14,
                       border: `1.5px solid ${th.gold}`, background: t.inputBg, color: t.text }} />
            <Button style={{ padding: '6px 10px' }} onClick={onEditSave}>Save</Button>
            <Button variant="ghost" style={{ padding: '6px 10px' }} onClick={onEditCancel}>✕</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: t.text }}>{a.fullName}</span>
            {badge}
            {a.mustChangePassword && <Pill color={t.warningText} bg={t.warningBg}>Must set password</Pill>}
          </div>
        )}
        <div style={{ fontSize: 12.5, color: t.textFaint, marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to={`/superadmin/activity?actor=${encodeURIComponent(a.username)}`}
            style={{ fontFamily: th.mono, color: t.textMuted, textDecoration: 'none' }} title="See their activity">
            @{a.username}
          </Link>
          <span title={fmtDateTime(a.lastLogin)}>Last sign-in {timeAgo(a.lastLogin)}</span>
        </div>
        {note && <div style={{ fontSize: 12, color: t.textFaint, marginTop: 4 }}>{note}</div>}
      </div>
      {actions && !editing && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

function CredentialsModal({ creds, onClose }) {
  const th = useSuperTheme();
  const t = th.t;
  const [copied, setCopied] = useState(false);
  if (!creds) return null;

  const text = `Santa Ana school system\nUsername: ${creds.username}\nTemporary password: ${creds.tempPassword}\nYou will be asked to set a new password when you sign in.`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error('Copy failed — select the text manually'); }
  };

  return (
    <Modal open onClose={() => {}} title={creds.reset ? `New password for ${creds.fullName}` : `${creds.fullName} can now sign in`}>
      <div style={{ background: t.rowAlt, border: `1px solid ${t.border}`, borderRadius: 10, padding: '6px 14px', marginBottom: 12 }}>
        {[['Username', creds.username], ['Temporary password', creds.tempPassword]].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0',
                                borderBottom: k === 'Username' ? `1px solid ${t.border}` : 'none' }}>
            <span style={{ fontSize: 13, color: t.textFaint }}>{k}</span>
            <strong style={{ fontFamily: th.mono, fontSize: 15, color: t.text, letterSpacing: '0.02em', userSelect: 'all' }}>{v}</strong>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12.5, color: t.danger, margin: '0 0 16px', lineHeight: 1.5 }}>
        This password is shown only once and isn't stored anywhere readable. Copy it now and give it to them privately.
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={copy}>{copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy details</>}</Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}
