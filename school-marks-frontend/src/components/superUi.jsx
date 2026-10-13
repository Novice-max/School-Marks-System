// Small building blocks shared by the Control Room pages.
import { useSuperTheme } from './superTheme';

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  const th = useSuperTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16,
                  flexWrap: 'wrap', marginBottom: 22 }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && (
          <div style={{ fontFamily: th.mono, fontSize: 11, letterSpacing: '0.12em', color: th.gold,
                        fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>
            {eyebrow}
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: th.t.text }}>{title}</h1>
        {subtitle && <p style={{ margin: '6px 0 0', fontSize: 14, color: th.t.textMuted, maxWidth: 640 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

export function Panel({ title, right, children, pad = 20, style }) {
  const th = useSuperTheme();
  return (
    <section style={{
      background: th.t.surface, border: `1px solid ${th.t.border}`, borderRadius: 14,
      boxShadow: `0 1px 2px ${th.t.shadow}`, minWidth: 0, overflow: 'hidden', ...style,
    }}>
      {(title || right) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      padding: `14px ${Math.max(pad, 16)}px`, borderBottom: `1px solid ${th.t.border}` }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.t.text }}>{title}</h2>
          {right}
        </div>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </section>
  );
}

export function Button({ variant = 'primary', children, style, ...rest }) {
  const th = useSuperTheme();
  const t = th.t;
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
    border: '1.5px solid transparent', transition: 'opacity .15s ease', whiteSpace: 'nowrap',
    opacity: rest.disabled ? 0.55 : 1,
  };
  const variants = {
    primary: { background: th.gold, color: th.onGold },
    ghost:   { background: 'transparent', color: t.textMuted, borderColor: t.border },
    danger:  { background: 'transparent', color: t.danger, borderColor: t.dangerBorder },
    success: { background: 'transparent', color: t.successText, borderColor: t.successBorder },
  };
  return <button style={{ ...base, ...variants[variant], ...style }} {...rest}>{children}</button>;
}

export function Pill({ children, color, bg, mono, style }) {
  const th = useSuperTheme();
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999,
      fontSize: 11, fontWeight: 700, color: color || th.t.textMuted, background: bg || th.t.rowAlt,
      fontFamily: mono ? th.mono : undefined, whiteSpace: 'nowrap', ...style,
    }}>
      {children}
    </span>
  );
}

export function CategoryTag({ category }) {
  const th = useSuperTheme();
  const c = th.category[category] || { label: category || 'Other', color: th.t.textMuted };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700,
                   color: th.t.textMuted, whiteSpace: 'nowrap' }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

export function Field({ label, children, hint }) {
  const th = useSuperTheme();
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: th.t.textMuted }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11.5, color: th.t.textFaint }}>{hint}</span>}
    </label>
  );
}

export function useInputStyle() {
  const th = useSuperTheme();
  return {
    padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${th.t.inputBorder}`, fontSize: 14,
    background: th.t.inputBg, color: th.t.text, outline: 'none', minWidth: 0, width: '100%', boxSizing: 'border-box',
  };
}

export function Modal({ open, onClose, title, children, width = 420 }) {
  const th = useSuperTheme();
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 900, background: th.t.overlay,
                                     display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{
        background: th.t.surface, color: th.t.text, borderRadius: 16, width: '100%', maxWidth: width,
        boxShadow: `0 20px 60px ${th.t.shadowHeavy}`, border: `1px solid ${th.t.border}`, padding: 24,
      }}>
        {title && <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 800 }}>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function Empty({ children }) {
  const th = useSuperTheme();
  return <div style={{ padding: '28px 12px', textAlign: 'center', color: th.t.textFaint, fontSize: 14 }}>{children}</div>;
}
