import { useTheme } from '../context/ThemeContext';

/**
 * Initials-based avatar with deterministic background color.
 * Usage: <Avatar name="Jane Wanjiku" size={40} />
 */
const PALETTE = [
  '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#EF4444', '#F97316',
  '#EAB308', '#84CC16', '#22C55E', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#3B82F6', '#6D28D9',
];

function hashName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export default function Avatar({ name = '', size = 38, style: extraStyle }) {
  const { tokens } = useTheme();

  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (name[0] || '?').toUpperCase();

  const bg = PALETTE[hashName(name) % PALETTE.length];

  return (
    <div style={{
      width: size,
      height: size,
      minWidth: size,
      borderRadius: '50%',
      background: bg,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: size * 0.38,
      letterSpacing: 0.5,
      userSelect: 'none',
      flexShrink: 0,
      ...extraStyle,
    }}>
      {initials}
    </div>
  );
}