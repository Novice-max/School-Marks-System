import { useEffect, useState, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Gauge, Activity, ShieldCheck, BookOpen, Sun, Moon, LogOut, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSuperTheme } from './superTheme';

const NAV = [
  { to: '/superadmin',          label: 'Overview',  icon: Gauge,       end: true },
  { to: '/superadmin/activity', label: 'Activity',  icon: Activity },
  { to: '/superadmin/admins',   label: 'Admins',    icon: ShieldCheck },
  { to: '/superadmin/subjects', label: 'Subjects',  icon: BookOpen },
];

function useNairobiClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleTimeString('en-GB', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' });
}

function useWidth() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

/**
 * Control Room shell — deliberately NOT the admin sidebar. A single command bar
 * across the top, brass accent, full-width canvas. Same theme tokens underneath,
 * so light/dark mode still applies.
 */
export default function SuperLayout({ children }) {
  const { user, logout } = useAuth();
  const th = useSuperTheme();
  const { t } = th;
  const navigate = useNavigate();
  const clock = useNairobiClock();
  const width = useWidth();
  const compact = width < 760;

  const signOut = useCallback(async () => {
    await logout('manual');
    navigate('/login');
  }, [logout, navigate]);

  const initials = (user?.fullName || user?.username || 'S')
    .split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  const iconBtn = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 34, padding: '0 10px', borderRadius: 8, border: `1px solid ${th.barBorder}`,
    background: 'transparent', color: t.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    textDecoration: 'none', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ minHeight: '100vh', background: th.canvas, color: t.text, transition: 'background .3s ease' }}>
      {/* ═══ Command bar ═══ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100, background: th.barBg,
        borderBottom: `1px solid ${th.barBorder}`,
        boxShadow: `0 1px 0 ${th.goldLine}`,
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: compact ? '10px 16px 0' : '0 24px',
          display: 'flex', alignItems: 'center', gap: compact ? 10 : 20, flexWrap: compact ? 'wrap' : 'nowrap',
          minHeight: 60,
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <img src="/favicon.ico" alt="" style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 6 }} />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em' }}>Santa Ana</div>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: th.gold,
                fontFamily: th.mono, marginTop: 2,
              }}>
                CONTROL ROOM
              </div>
            </div>
          </div>

          {/* Right cluster (top row on mobile) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', order: compact ? 0 : 2 }}>
            {!compact && (
              <div title="Nairobi time" style={{
                fontFamily: th.mono, fontSize: 13, color: t.textMuted, padding: '0 10px',
                borderRight: `1px solid ${th.barBorder}`, marginRight: 2, fontVariantNumeric: 'tabular-nums',
              }}>
                EAT {clock}
              </div>
            )}
            <NavLink to="/admin" style={iconBtn} title="Open the school admin area">
              {compact ? 'School' : 'School admin'} <ArrowUpRight size={14} />
            </NavLink>
            <button style={{ ...iconBtn, padding: 0, width: 34 }} onClick={th.toggleTheme}
              aria-label={th.isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {th.isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div title={`${user?.fullName} · @${user?.username}`} style={{
              width: 34, height: 34, borderRadius: '50%', background: th.gold, color: th.onGold,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12,
              flexShrink: 0,
            }}>
              {initials}
            </div>
            <button style={{ ...iconBtn, color: t.danger, borderColor: t.dangerBorder }} onClick={signOut}
              aria-label="Sign out">
              <LogOut size={15} />{!compact && 'Sign out'}
            </button>
          </div>

          {/* Tabs */}
          <nav style={{
            display: 'flex', gap: 2, order: 1, overflowX: 'auto', WebkitOverflowScrolling: 'touch',
            width: compact ? '100%' : 'auto', alignSelf: 'stretch', scrollbarWidth: 'none',
          }}>
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 7, padding: compact ? '10px 12px' : '0 14px',
                minHeight: compact ? 0 : 60, textDecoration: 'none', fontSize: 13.5, whiteSpace: 'nowrap',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? t.text : t.textMuted,
                borderBottom: `2px solid ${isActive ? th.gold : 'transparent'}`,
                marginBottom: -1, transition: 'color .15s ease, border-color .15s ease',
              })}>
                {({ isActive }) => (<>
                  <Icon size={16} color={isActive ? th.gold : 'currentColor'} />
                  {label}
                </>)}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* ═══ Canvas ═══ */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: compact ? '18px 16px 40px' : '28px 24px 56px' }}>
        {children}
      </main>
    </div>
  );
}
