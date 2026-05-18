import { useTheme } from '../context/ThemeContext';

/**
 * Animated skeleton loader for tables.
 * Usage: <TableSkeleton rows={6} cols={5} />
 */
export default function TableSkeleton({ rows = 5, cols = 4 }) {
  const { tokens } = useTheme();

  return (
    <>
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Header skeleton */}
        <div style={{
          display: 'flex', gap: 12, padding: '12px 14px',
          background: tokens.accent, borderRadius: '8px 8px 0 0',
        }}>
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} style={{
              flex: i === 1 ? 2 : 1, height: 14, borderRadius: 4,
              background: 'rgba(255,255,255,0.3)',
            }} />
          ))}
        </div>

        {/* Row skeletons */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} style={{
            display: 'flex', gap: 12, padding: '14px 14px',
            alignItems: 'center',
            background: r % 2 === 0 ? tokens.rowAlt : tokens.surface,
            borderBottom: `1px solid ${tokens.border}`,
            animation: 'skeletonPulse 1.5s ease-in-out infinite',
            animationDelay: `${r * 0.1}s`,
          }}>
            {/* Avatar placeholder for first data column */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: tokens.border, flexShrink: 0,
            }} />
            {Array.from({ length: cols - 1 }).map((_, c) => (
              <div key={c} style={{
                flex: c === 0 ? 2 : 1,
                height: 12,
                borderRadius: 4,
                background: tokens.border,
                maxWidth: c === 0 ? 160 : 100,
              }} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Simple card skeleton for non-table loading states.
 * Usage: <CardSkeleton lines={3} />
 */
export function CardSkeleton({ lines = 3 }) {
  const { tokens } = useTheme();

  return (
    <>
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0',
        animation: 'skeletonPulse 1.5s ease-in-out infinite',
      }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} style={{
            height: 14, borderRadius: 4,
            background: tokens.border,
            width: i === lines - 1 ? '60%' : i === 0 ? '80%' : '100%',
          }} />
        ))}
      </div>
    </>
  );
}