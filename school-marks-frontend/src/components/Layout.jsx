import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SCHOOL_NAME = 'Santa Ana Academy';

const adminLinks = [
  { to: '/admin',             label: '📊 Dashboard',   end: true },
  { to: '/admin/teachers',    label: '👩‍🏫 Teachers'            },
  { to: '/admin/students',    label: '👨‍🎓 Students'            },
  { to: '/admin/classes',     label: '🏫 Classes'              },
  { to: '/admin/subjects',    label: '📖 Subjects'             },
  { to: '/admin/exams',       label: '📝 Exams'                },
  { to: '/admin/assignments', label: '🔗 Assignments'          },
  { to: '/admin/reports',     label: '📄 Reports'              },
];

const teacherLinks = [
  { to: '/teacher',           label: '📊 Dashboard',   end: true },
  { to: '/teacher/marks',     label: '✏️ Enter Marks'           },
  { to: '/teacher/analytics', label: '📈 My Analytics'         },
  { to: '/teacher/reports',   label: '📄 Reports'              },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const links            = user?.role === 'ADMIN' ? adminLinks : teacherLinks;

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        {/* Logo + School name */}
        <div style={s.brand}>
          <img src="/school_logo.png" alt="Logo" style={s.logo} />
          <div>
            <div style={s.brandName}>Santa Ana</div>
            <div style={s.brandSub}>Academy</div>
          </div>
        </div>

        {/* User badge */}
        <div style={s.userBadge}>
          <div style={s.avatar}>{user?.fullName?.[0] ?? 'U'}</div>
          <div>
            <div style={s.userName}>{user?.fullName}</div>
            <div style={s.userRole}>{user?.role}</div>
          </div>
        </div>

        <nav style={s.nav}>
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              style={({ isActive }) => ({
                ...s.navLink,
                ...(isActive ? s.navLinkActive : {}),
              })}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button style={s.logoutBtn} onClick={() => { logout(); navigate('/login'); }}>
          🚪 Sign Out
        </button>
      </aside>

      <main style={s.main}>
        {children}
      </main>
    </div>
  );
}

const s = {
  shell:        { display: 'flex', minHeight: '100vh' },
  sidebar:      { width: 230, background: '#1e3a5f', display: 'flex', flexDirection: 'column', padding: '20px 0', position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto' },
  brand:        { display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px 16px', borderBottom: '1px solid rgba(255,255,255,.12)' },
  logo:         { width: 42, height: 42, objectFit: 'contain', borderRadius: 4 },
  brandName:    { color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 },
  brandSub:     { color: 'rgba(255,255,255,.6)', fontSize: 11 },
  userBadge:    { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.12)', marginBottom: 8 },
  avatar:       { width: 34, height: 34, borderRadius: '50%', background: '#2d6a9f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 },
  userName:     { color: '#fff', fontSize: 13, fontWeight: 600 },
  userRole:     { color: 'rgba(255,255,255,.5)', fontSize: 11 },
  nav:          { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 10px' },
  navLink:      { display: 'block', padding: '9px 12px', borderRadius: 8, color: 'rgba(255,255,255,.75)', textDecoration: 'none', fontSize: 13, fontWeight: 500 },
  navLinkActive:{ background: 'rgba(255,255,255,.18)', color: '#fff', fontWeight: 700 },
  logoutBtn:    { margin: '12px 14px 0', padding: '10px', background: 'rgba(255,80,80,.2)', color: '#ff8080', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  main:         { marginLeft: 230, flex: 1, padding: 32, overflowY: 'auto' },
};
