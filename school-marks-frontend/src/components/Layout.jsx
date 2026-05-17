import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/* ─── nav definitions ─── */
const adminLinks = [
  { to: '/admin',             icon: '📊', label: 'Dashboard',   end: true },
  { to: '/admin/teachers',    icon: '👩‍🏫', label: 'Teachers'            },
  { to: '/admin/students',    icon: '👨‍🎓', label: 'Students'            },
  { to: '/admin/classes',     icon: '🏫', label: 'Classes'              },
  { to: '/admin/subjects',    icon: '📖', label: 'Subjects'             },
  { to: '/admin/exams',       icon: '📝', label: 'Exams'                },
  { to: '/admin/assignments', icon: '🔗', label: 'Assignments'          },
  { to: '/admin/reports',     icon: '📄', label: 'Reports'              },
];

const teacherLinks = [
  { to: '/teacher',           icon: '📊', label: 'Dashboard',   end: true },
  { to: '/teacher/marks',     icon: '✏️', label: 'Enter Marks'           },
  { to: '/teacher/analytics', icon: '📈', label: 'My Analytics'         },
  { to: '/teacher/reports',   icon: '📄', label: 'Reports'              },
];

/* ─── sidebar widths ─── */
const SIDEBAR_FULL = 240;
const SIDEBAR_MINI = 64;
const MOBILE_BP    = 768;
const COLLAPSE_KEY = 'santa-ana-sidebar';

/* ─── icons as inline SVG components ─── */
const ChevronLeft = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRight = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const BellIcon = ({ size = 20, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const SettingsIcon = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const SunIcon = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const MenuIcon = ({ size = 22, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = ({ size = 22, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const LogoutIcon = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);


export default function Layout({ children }) {
  const { user, logout }        = useAuth();
  const { tokens, isDark, toggleTheme } = useTheme();
  const navigate                = useNavigate();
  const location                = useLocation();
  const links                   = user?.role === 'ADMIN' ? adminLinks : teacherLinks;

  /* ─── sidebar state ─── */
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === 'true'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile]     = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BP : false
  );

  /* Track viewport */
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= MOBILE_BP;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* Persist collapse */
  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, String(collapsed)); } catch { /* noop */ }
  }, [collapsed]);

  /* Close mobile drawer on navigate */
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  /* Close mobile drawer on outside click */
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e) => {
      if (!e.target.closest('#sidebar') && !e.target.closest('#mobile-toggle')) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOpen]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const sidebarW = isMobile ? SIDEBAR_FULL : (collapsed ? SIDEBAR_MINI : SIDEBAR_FULL);

  /* ─── dynamic styles using tokens ─── */
  const S = {
    shell: {
      display: 'flex',
      minHeight: '100vh',
      background: tokens.bg,
      transition: 'background 0.3s ease',
    },

    /* ─ TOPBAR (mobile) ─ */
    topbar: {
      display: isMobile ? 'flex' : 'none',
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 200,
      height: 52,
      background: tokens.topbarBg,
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      borderBottom: `1px solid ${tokens.border}`,
      boxShadow: `0 1px 4px ${tokens.shadow}`,
    },
    topbarLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    },
    topbarRight: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },

    /* ─ OVERLAY ─ */
    overlay: {
      display: mobileOpen ? 'block' : 'none',
      position: 'fixed',
      inset: 0,
      background: tokens.overlay,
      zIndex: 149,
      transition: 'opacity 0.25s ease',
    },

    /* ─ SIDEBAR ─ */
    sidebar: {
      width: sidebarW,
      minWidth: sidebarW,
      background: tokens.sidebarBg,
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: isMobile ? 52 : 8,
      left: isMobile ? 0 : 8,
      height: isMobile ? 'calc(100vh - 52px)' : 'calc(100vh - 16px)',
      overflowY: 'auto',
      overflowX: 'hidden',
      zIndex: 150,
      borderRadius: isMobile ? 0 : 16,
      border: isMobile ? 'none' : `1px solid ${tokens.sidebarBorder}`,
      boxShadow: isMobile ? 'none' : `0 2px 12px ${tokens.shadow}`,
      transition: 'width 0.25s cubic-bezier(.4,0,.2,1), transform 0.25s cubic-bezier(.4,0,.2,1), background 0.3s ease',
      transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
    },

    /* ─ BRAND ─ */
    brand: {
      display: 'flex',
      alignItems: 'center',
      gap: collapsed && !isMobile ? 0 : 10,
      padding: collapsed && !isMobile ? '16px 0' : '16px',
      justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
      borderBottom: `1px solid ${tokens.sidebarBorder}`,
      minHeight: 60,
    },
    logo: {
      width: 36,
      height: 36,
      objectFit: 'contain',
      borderRadius: 8,
      flexShrink: 0,
    },
    brandText: {
      display: collapsed && !isMobile ? 'none' : 'block',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    },
    brandName: {
      color: tokens.sidebarText,
      fontWeight: 700,
      fontSize: 14,
      lineHeight: 1.2,
    },
    brandSub: {
      color: tokens.sidebarMuted,
      fontSize: 11,
    },

    /* ─ USER BADGE ─ */
    userBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: collapsed && !isMobile ? 0 : 10,
      padding: collapsed && !isMobile ? '12px 0' : '12px 16px',
      justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
      borderBottom: `1px solid ${tokens.sidebarBorder}`,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: tokens.accent,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: 14,
      flexShrink: 0,
    },
    userInfo: {
      display: collapsed && !isMobile ? 'none' : 'block',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    },
    userName: {
      color: tokens.sidebarText,
      fontSize: 13,
      fontWeight: 600,
    },
    userRole: {
      color: tokens.sidebarMuted,
      fontSize: 11,
    },

    /* ─ NAV ─ */
    nav: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      padding: collapsed && !isMobile ? '8px 6px' : '8px 10px',
      overflowY: 'auto',
    },
    navLink: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: collapsed && !isMobile ? '10px 0' : '9px 12px',
      justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
      borderRadius: 8,
      color: tokens.sidebarMuted,
      textDecoration: 'none',
      fontSize: 13,
      fontWeight: 500,
      transition: 'background 0.15s ease, color 0.15s ease',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    },
    navLinkActive: {
      background: tokens.sidebarActive,
      color: tokens.accent,
      fontWeight: 700,
    },
    navIcon: {
      fontSize: 16,
      flexShrink: 0,
      width: 24,
      textAlign: 'center',
    },
    navLabel: {
      display: collapsed && !isMobile ? 'none' : 'inline',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },

    /* ─ SIDEBAR FOOTER ─ */
    sidebarFooter: {
      padding: collapsed && !isMobile ? '8px 6px 12px' : '8px 10px 16px',
      borderTop: `1px solid ${tokens.sidebarBorder}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    },
    footerBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: collapsed && !isMobile ? '9px 0' : '9px 12px',
      justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
      background: 'none',
      border: 'none',
      borderRadius: 8,
      color: tokens.sidebarMuted,
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 500,
      width: '100%',
      textAlign: 'left',
      transition: 'background 0.15s ease, color 0.15s ease',
    },
    logoutBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: collapsed && !isMobile ? '9px 0' : '9px 12px',
      justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
      background: tokens.dangerBg,
      border: 'none',
      borderRadius: 8,
      color: tokens.danger,
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 600,
      width: '100%',
      textAlign: 'left',
      transition: 'background 0.15s ease',
    },
    footerLabel: {
      display: collapsed && !isMobile ? 'none' : 'inline',
    },

    /* ─ COLLAPSE TOGGLE (desktop only) ─ */
    collapseBtn: {
      display: isMobile ? 'none' : 'flex',
      position: 'absolute',
      top: 20,
      right: 12,
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: tokens.accent,
      border: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: `0 2px 8px ${tokens.shadowHeavy}`,
      zIndex: 160,
      transition: 'background 0.15s ease, opacity 0.15s ease',
      opacity: 0.85,
    },

    /* ─ MAIN CONTENT ─ */
    main: {
      marginLeft: isMobile ? 0 : (sidebarW + 24),
      flex: 1,
      padding: isMobile ? '68px 16px 24px' : '16px 16px 16px 0',
      transition: 'margin-left 0.25s cubic-bezier(.4,0,.2,1)',
      minHeight: '100vh',
    },
    contentWrapper: {
      background: tokens.surface,
      borderRadius: 16,
      padding: isMobile ? 16 : 28,
      minHeight: 'calc(100vh - 48px)',
      boxShadow: `0 1px 3px ${tokens.shadow}`,
      border: `1px solid ${tokens.border}`,
      transition: 'background 0.3s ease',
    },

    /* ─ SMALL BUTTON RESET ─ */
    iconBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 6,
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.15s ease',
    },

    /* ─ TOPBAR HEADER ─ */
    topbarTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    topbarLogo: {
      width: 26,
      height: 26,
      borderRadius: 6,
      objectFit: 'contain',
    },
    topbarName: {
      color: tokens.text,
      fontWeight: 700,
      fontSize: 14,
    },

    /* ─ NOTIFICATION DOT ─ */
    bellWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    notifDot: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: tokens.notifDot,
    },
  };

  return (
    <div style={S.shell}>

      {/* ══════ MOBILE TOPBAR ══════ */}
      <div style={S.topbar}>
        <div style={S.topbarLeft}>
          <button
            id="mobile-toggle"
            style={S.iconBtn}
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen
              ? <CloseIcon color={tokens.text} />
              : <MenuIcon color={tokens.text} />
            }
          </button>
          <div style={S.topbarTitle}>
            <img src="/favicon.ico" alt="" style={S.topbarLogo} />
            <span style={S.topbarName}>Santa Ana Academy</span>
          </div>
        </div>
        <div style={S.topbarRight}>
          <button style={S.iconBtn} onClick={toggleTheme} aria-label="Toggle theme">
            {isDark
              ? <SunIcon size={18} color={tokens.textMuted} />
              : <MoonIcon size={18} color={tokens.textMuted} />
            }
          </button>
          <button style={S.iconBtn} aria-label="Notifications">
            <div style={S.bellWrapper}>
              <BellIcon size={18} color={tokens.textMuted} />
              <span style={S.notifDot} />
            </div>
          </button>
        </div>
      </div>

      {/* ══════ OVERLAY ══════ */}
      <div style={S.overlay} onClick={() => setMobileOpen(false)} />

      {/* ══════ SIDEBAR ══════ */}
      <aside id="sidebar" style={S.sidebar}>
        {/* Brand */}
        <div style={S.brand}>
          <img src="/favicon.ico" alt="Logo" style={S.logo} />
          <div style={S.brandText}>
            <div style={S.brandName}>Santa Ana</div>
            <div style={S.brandSub}>Academy</div>
          </div>
        </div>

        {/* User */}
        <div style={S.userBadge}>
          <div style={S.avatar}>
            {user?.fullName?.[0] ?? 'U'}
          </div>
          <div style={S.userInfo}>
            <div style={S.userName}>{user?.fullName}</div>
            <div style={S.userRole}>{user?.role}</div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={S.nav}>
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              title={link.label}
              style={({ isActive }) => ({
                ...S.navLink,
                ...(isActive ? S.navLinkActive : {}),
              })}
            >
              <span style={S.navIcon}>{link.icon}</span>
              <span style={S.navLabel}>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={S.sidebarFooter}>
          {/* Theme toggle (desktop only — mobile has it in topbar) */}
          {!isMobile && (
            <button
              style={S.footerBtn}
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              onMouseEnter={e => e.currentTarget.style.background = tokens.sidebarActive}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {isDark
                ? <SunIcon size={18} color={tokens.sidebarMuted} />
                : <MoonIcon size={18} color={tokens.sidebarMuted} />
              }
              <span style={S.footerLabel}>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          )}

          {/* Settings placeholder */}
          <button
            style={S.footerBtn}
            onClick={() => { /* TODO: navigate to settings */ }}
            title="Settings"
            onMouseEnter={e => e.currentTarget.style.background = tokens.sidebarActive}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <SettingsIcon size={18} color={tokens.sidebarMuted} />
            <span style={S.footerLabel}>Settings</span>
          </button>

          {/* Logout */}
          <button style={S.logoutBtn} onClick={handleLogout} title="Sign Out">
            <LogoutIcon size={18} color={tokens.danger} />
            <span style={S.footerLabel}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ══════ COLLAPSE TOGGLE (outside sidebar to avoid overflow clip) ══════ */}
      <button
        style={S.collapseBtn}
        onClick={() => setCollapsed(c => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight size={14} color="#fff" />
          : <ChevronLeft size={14} color="#fff" />
        }
      </button>

      {/* ══════ MAIN CONTENT ══════ */}
      <main style={S.main}>
        <div style={S.contentWrapper}>
          {children}
        </div>
      </main>
    </div>
  );
}