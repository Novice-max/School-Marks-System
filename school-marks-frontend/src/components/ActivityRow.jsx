import { useState } from 'react';
import { useSuperTheme, fmtTime, fmtDateTime, ACTION_TEXT } from './superTheme';
import { CategoryTag, Pill } from './superUi';

/** One audit entry. `showDate` for feeds that span days without day headers. */
export default function ActivityRow({ e, showDate = false, compact = false }) {
  const th = useSuperTheme();
  const t = th.t;
  const [open, setOpen] = useState(false);

  const failed   = e.action === 'LOGIN_FAILED';
  const removal  = e.action === 'DELETE' || e.action === 'DEACTIVATE' || e.action === 'ARCHIVE';
  const hasDiff  = e.oldValue != null || e.newValue != null;
  const shortDiff = hasDiff && (e.oldValue || '').length <= 16 && (e.newValue || '').length <= 16;
  const canExpand = (hasDiff && !shortDiff) || e.ip;

  const roleColor = e.actorRole === 'SUPERADMIN' ? th.gold
                  : e.actorRole === 'ADMIN'      ? t.accent
                  : t.textMuted;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: compact ? '52px 1fr' : '64px 112px 1fr', gap: compact ? 10 : 14,
      alignItems: 'start', padding: '11px 4px', borderBottom: `1px solid ${t.border}`,
      background: failed ? t.dangerBg : 'transparent', borderRadius: failed ? 8 : 0,
    }}>
      <div style={{ fontFamily: th.mono, fontSize: 12, color: t.textFaint, paddingTop: 2,
                    fontVariantNumeric: 'tabular-nums' }}>
        {showDate ? fmtDateTime(e.at) : fmtTime(e.at)}
      </div>

      {!compact && <div style={{ paddingTop: 1 }}><CategoryTag category={e.category} /></div>}

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13.5 }}>
          {compact && <CategoryTag category={e.category} />}
          <span style={{ fontFamily: th.mono, fontWeight: 700, color: failed ? t.danger : t.text }}>
            {e.actor ? `@${e.actor}` : 'unknown'}
          </span>
          {e.actorRole && <Pill color={roleColor}>{e.actorRole.toLowerCase()}</Pill>}
          <span style={{ color: failed || removal ? t.danger : t.textMuted, fontWeight: failed ? 700 : 500 }}>
            {ACTION_TEXT[e.action] || e.action?.toLowerCase()}
          </span>
          {shortDiff && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: th.mono, fontSize: 12.5 }}>
              {e.oldValue != null && (
                <span style={{ color: t.textFaint, textDecoration: 'line-through' }}>{e.oldValue}</span>
              )}
              {e.oldValue != null && <span style={{ color: t.textFaint }}>→</span>}
              <span style={{ color: th.goldStrong, fontWeight: 800 }}>{e.newValue}</span>
            </span>
          )}
        </div>

        {e.description && (
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 3, lineHeight: 1.45, overflowWrap: 'anywhere' }}>
            {e.description}
          </div>
        )}

        {canExpand && (
          <button onClick={() => setOpen(o => !o)} style={{
            marginTop: 5, padding: 0, border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, color: th.gold,
          }}>
            {open ? 'Hide details' : 'Details'}
          </button>
        )}

        {open && (
          <div style={{ marginTop: 8, display: 'grid', gap: 6, fontFamily: th.mono, fontSize: 12 }}>
            {hasDiff && !shortDiff && (<>
              <DiffBlock label="Before" value={e.oldValue} color={t.danger} bg={t.dangerBg} />
              <DiffBlock label="After"  value={e.newValue} color={t.successText} bg={t.successBg} />
            </>)}
            {e.ip && <div style={{ color: t.textFaint }}>IP {e.ip}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function DiffBlock({ label, value, color, bg }) {
  const th = useSuperTheme();
  return (
    <div style={{ background: bg, borderRadius: 6, padding: '6px 10px', overflowWrap: 'anywhere' }}>
      <span style={{ color, fontWeight: 800, marginRight: 8 }}>{label}</span>
      <span style={{ color: th.t.text }}>{value ?? '—'}</span>
    </div>
  );
}
