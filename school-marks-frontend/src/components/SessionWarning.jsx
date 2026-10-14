import { useAuth, WARNING_MS } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/**
 * "You'll be signed out" dialog — shown for the last 60 seconds of a
 * 20-minute idle period. Rendered once in App, above every layout.
 */
export default function SessionWarning() {
  const { user, warnSecsLeft, stayActive, logout } = useAuth();
  const { tokens } = useTheme();

  if (!user || warnSecsLeft == null) return null;

  const total   = WARNING_MS / 1000;
  const r       = 34;
  const circ    = 2 * Math.PI * r;
  const offset  = circ * (1 - warnSecsLeft / total);
  const urgent  = warnSecsLeft <= 15;
  const ring    = urgent ? tokens.danger : tokens.accent;

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="sw-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 10000, background: tokens.overlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
      <div style={{
        background: tokens.surface, color: tokens.text, borderRadius: 16, padding: '28px 28px 24px',
        width: '100%', maxWidth: 380, textAlign: 'center',
        boxShadow: `0 20px 60px ${tokens.shadowHeavy}`, border: `1px solid ${tokens.border}`,
      }}>
        <svg width="84" height="84" viewBox="0 0 84 84" style={{ display: 'block', margin: '0 auto 14px' }}>
          <circle cx="42" cy="42" r={r} fill="none" stroke={tokens.border} strokeWidth="6" />
          <circle cx="42" cy="42" r={r} fill="none" stroke={ring} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 42 42)"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }} />
          <text x="42" y="49" textAnchor="middle" fontSize="22" fontWeight="700" fill={ring}
            style={{ fontVariantNumeric: 'tabular-nums' }}>
            {warnSecsLeft}
          </text>
        </svg>

        <h3 id="sw-title" style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>Still there?</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: tokens.textMuted, lineHeight: 1.5 }}>
          You've been inactive for a while. For security you'll be signed out in{' '}
          <strong style={{ color: ring }}>{warnSecsLeft}s</strong>. Unsaved marks will be lost.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => logout('manual')}
            style={{
              padding: '10px 18px', borderRadius: 8, border: `1.5px solid ${tokens.border}`,
              background: 'transparent', color: tokens.textMuted, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}>
            Sign out
          </button>
          <button onClick={stayActive} autoFocus
            style={{
              padding: '10px 22px', borderRadius: 8, border: 'none', background: tokens.accent,
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
