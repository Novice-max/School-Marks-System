/**
 * Shared page styles derived from theme tokens.
 * Import in any page: import { usePageStyles } from '../../styles/pageStyles';
 * Usage: const s = usePageStyles();
 */
import { useTheme } from '../context/ThemeContext';

export function usePageStyles() {
  const { tokens } = useTheme();

  return {
    /* ─── Page ─── */
    title:      { fontSize: 24, fontWeight: 700, color: tokens.text, marginBottom: 24 },

    /* ─── Cards ─── */
    card:       { background: tokens.surface, borderRadius: 12, padding: 24, marginBottom: 20,
                  boxShadow: `0 2px 12px ${tokens.shadow}`, border: `1px solid ${tokens.border}` },
    cardTitle:  { fontSize: 15, fontWeight: 700, color: tokens.text, marginBottom: 16 },

    /* ─── Forms ─── */
    form:       { display: 'flex', flexDirection: 'column', gap: 16 },
    grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 14 },
    field:      { display: 'flex', flexDirection: 'column', gap: 4 },
    label:      { fontSize: 13, fontWeight: 600, color: tokens.textMuted },
    input:      { padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${tokens.inputBorder}`,
                  fontSize: 14, background: tokens.inputBg, color: tokens.text, outline: 'none' },
    select:     { padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${tokens.inputBorder}`,
                  fontSize: 14, minWidth: 220, background: tokens.inputBg, color: tokens.text },

    /* ─── Buttons ─── */
    btn:        { padding: '11px 28px', background: tokens.accent, color: '#fff', border: 'none',
                  borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14, alignSelf: 'flex-start' },
    btnCancel:  { padding: '10px 24px', background: tokens.bg, color: tokens.textMuted,
                  border: `1.5px solid ${tokens.border}`, borderRadius: 8, fontWeight: 600,
                  cursor: 'pointer', fontSize: 14 },
    editBtn:    { padding: '6px 12px', background: tokens.accentSubtle, color: tokens.accent,
                  border: `1.5px solid ${tokens.infoBorder}`, borderRadius: 6, cursor: 'pointer',
                  fontWeight: 600, fontSize: 12 },
    removeBtn:  { padding: '5px 14px', background: tokens.dangerBg, color: tokens.danger,
                  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
    resetBtn:   { padding: '6px 12px', background: tokens.warningBg, color: tokens.warningText,
                  border: `1.5px solid ${tokens.warningBorder}`, borderRadius: 6, cursor: 'pointer',
                  fontWeight: 600, fontSize: 12 },

    /* ─── Tables ─── */
    tableWrap:  { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
    table:      { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
    th:         { background: tokens.accent, color: '#fff', padding: '10px 14px', textAlign: 'left',
                  fontWeight: 600, whiteSpace: 'nowrap' },
    td:         { padding: '10px 14px', borderBottom: `1px solid ${tokens.border}`, color: tokens.text },
    rowBg:      (i) => ({ background: i % 2 === 0 ? tokens.rowAlt : tokens.surface }),

    /* ─── States ─── */
    empty:      { color: tokens.textFaint, textAlign: 'center', padding: 32 },
    spinner:    { textAlign: 'center', padding: 40, color: tokens.accent, fontWeight: 600, fontSize: 15 },

    /* ─── Modals ─── */
    overlay:    { position: 'fixed', inset: 0, background: tokens.overlay, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', zIndex: 999 },
    modal:      { background: tokens.surface, borderRadius: 16, padding: 36, minWidth: 360,
                  maxWidth: '90vw', boxShadow: `0 20px 60px ${tokens.shadowHeavy}`, textAlign: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 700, color: tokens.text, marginBottom: 20 },
    modalBtn:   { padding: '10px 32px', background: tokens.accent, color: '#fff', border: 'none',
                  borderRadius: 8, fontWeight: 700, cursor: 'pointer' },

    /* ─── Semantic badges ─── */
    badge:      { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
    statusActive:   { background: tokens.successBg, color: tokens.successText },
    statusInactive: { background: tokens.dangerBg,  color: tokens.danger },

    /* ─── Raw tokens for custom usage ─── */
    tokens,
  };
}