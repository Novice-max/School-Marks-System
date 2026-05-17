import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Right-side slide-out panel for detail views.
 * Usage:
 *   <SlideOutPanel open={!!selected} onClose={() => setSelected(null)} title="Student Details">
 *     <div>...content...</div>
 *   </SlideOutPanel>
 */

const CloseIcon = ({ size = 20, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function SlideOutPanel({ open, onClose, title, width = 420, children }) {
  const { tokens } = useTheme();

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: tokens.overlay,
          zIndex: 500,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: Math.min(width, window.innerWidth - 20),
        height: '100vh',
        background: tokens.surface,
        borderLeft: `1px solid ${tokens.border}`,
        boxShadow: `-8px 0 30px ${tokens.shadowHeavy}`,
        zIndex: 501,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(.4,0,.2,1)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${tokens.border}`,
          position: 'sticky',
          top: 0,
          background: tokens.surface,
          zIndex: 1,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: tokens.text, margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 6, borderRadius: 8, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <CloseIcon color={tokens.textMuted} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </>
  );
}