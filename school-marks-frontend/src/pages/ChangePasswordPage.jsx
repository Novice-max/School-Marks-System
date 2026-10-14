import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { homeFor } from '../utils/roles';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
  const [current,    setCurrent]    = useState('');
  const [newPass,    setNewPass]    = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [showCur,    setShowCur]    = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [showCon,    setShowCon]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const { user, clearFirstLogin }   = useAuth();
  const { tokens }                  = useTheme();
  const navigate                    = useNavigate();

  // Same rules the server enforces (PasswordPolicy.java) — shown live so nobody
  // has to guess. The server is still the final check.
  const uname = (user?.username || '').toLowerCase();
  const rules = [
    { ok: newPass.length >= 8,                                        text: 'At least 8 characters' },
    { ok: newPass.length > 0 && !(uname.length >= 3 && newPass.toLowerCase().includes(uname)),
                                                                      text: 'Does not contain your username' },
    { ok: newPass.length > 0 && newPass !== current,                  text: 'Different from your current password' },
    { ok: new Set(newPass.toLowerCase()).size >= 4,                   text: 'At least 4 different characters' },
    { ok: newPass.length > 0 && newPass === newPass.trim(),           text: 'No space at the start or end' },
  ];
  const allRulesOk = rules.every(r => r.ok) && newPass.length <= 72;

  const handle = async (e) => {
    e.preventDefault();
    if (!allRulesOk) { toast.error('New password does not meet the rules below it'); return; }
    if (newPass !== confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await changePassword({ currentPassword: current, newPassword: newPass });
      toast.success('Password changed!');
      clearFirstLogin();
      navigate(homeFor(user.role));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const s = {
    wrapper: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tokens.bg, transition: 'background 0.3s ease' },
    card:    { background: tokens.surface, borderRadius: 16, padding: '40px 36px', width: 400, boxShadow: `0 8px 30px ${tokens.shadowHeavy}`, border: `1px solid ${tokens.border}` },
    icon:    { fontSize: 40, textAlign: 'center', marginBottom: 12 },
    title:   { fontSize: 22, fontWeight: 700, color: tokens.text, marginBottom: 6, textAlign: 'center' },
    sub:     { fontSize: 13, color: tokens.textFaint, marginBottom: 24, textAlign: 'center', lineHeight: 1.5 },
    form:    { display: 'flex', flexDirection: 'column', gap: 16 },
    label:   { display: 'block', fontSize: 13, fontWeight: 600, color: tokens.textMuted, marginBottom: 4 },
    row:     { position: 'relative' },
    input:   { width: '100%', padding: '10px 44px 10px 14px', borderRadius: 8, border: `1.5px solid ${tokens.inputBorder}`, fontSize: 14, boxSizing: 'border-box', outline: 'none', background: tokens.inputBg, color: tokens.text },
    eye:     { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 },
    btn:     { padding: '12px', background: tokens.accent, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer' },
  };

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <div style={s.icon}>🔐</div>
        <h2 style={s.title}>Change Your Password</h2>
        <p style={s.sub}>
          {user?.isFirstLogin
            ? 'First login — set a new password before continuing.'
            : 'Update your account password.'}
        </p>

        <form onSubmit={handle} style={s.form} autoComplete="off">
          <div>
            <label style={s.label}>Current Password</label>
            <div style={s.row}>
              <input style={s.input} type={showCur ? 'text' : 'password'}
                value={current} onChange={e => setCurrent(e.target.value)}
                placeholder="Enter current password" autoComplete="current-password" required />
              <button type="button" style={s.eye} onClick={() => setShowCur(v => !v)}>
                {showCur ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div>
            <label style={s.label}>New Password</label>
            <div style={s.row}>
              <input style={s.input} type={showNew ? 'text' : 'password'}
                value={newPass} onChange={e => setNewPass(e.target.value)}
                placeholder="Enter new password" autoComplete="new-password" required minLength={8} maxLength={72} />
              <button type="button" style={s.eye} onClick={() => setShowNew(v => !v)}>
                {showNew ? '🙈' : '👁️'}
              </button>
            </div>
            {newPass && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'grid', gap: 2 }}>
                {rules.map(r => (
                  <li key={r.text} style={{ fontSize: 12, color: r.ok ? tokens.successText : tokens.textFaint }}>
                    {r.ok ? '✓' : '○'} {r.text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label style={s.label}>Confirm Password</label>
            <div style={s.row}>
              <input style={s.input} type={showCon ? 'text' : 'password'}
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm new password" autoComplete="new-password" required minLength={8} maxLength={72} />
              <button type="button" style={s.eye} onClick={() => setShowCon(v => !v)}>
                {showCon ? '🙈' : '👁️'}
              </button>
            </div>
            {confirm && newPass !== confirm && (
              <div style={{ fontSize: 12, color: tokens.danger, marginTop: 4 }}>❌ Passwords do not match</div>
            )}
            {confirm && newPass === confirm && allRulesOk && (
              <div style={{ fontSize: 12, color: tokens.successText, marginTop: 4 }}>✅ Passwords match</div>
            )}
          </div>

          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  );
}