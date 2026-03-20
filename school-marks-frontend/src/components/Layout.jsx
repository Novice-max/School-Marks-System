import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const adminLinks = [
  { to: '/admin',              label: '📊 Dashboard',    end: true },
  { to: '/admin/teachers',     label: '👩‍🏫 Teachers'             },
  { to: '/admin/students',     label: '👨‍🎓 Students'             },
  { to: '/admin/classes',      label: '🏫 Classes'               },
  { to: '/admin/subjects',     label: '📖 Subjects'              },
  { to: '/admin/exams',        label: '📝 Exams'                 },
  { to: '/admin/assignments',  label: '🔗 Assignments'           },
  { to: '/admin/reports',      label: '📄 Reports'               },
];

const teacherLinks = [
  { to: '/teacher',            label: '📊 Dashboard',    end: true },
  { to: '/teacher/marks',      label: '✏️ Enter Marks'            },
  { to: '/teacher/analytics',  label: '📈 My Analytics'          },
  { to: '/teacher/reports',    label: '📄 Reports'               },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const links            = user?.role === 'ADMIN' ? adminLinks : teacherLinks;

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={{ fontSize: 22 }}>📚</span>
          <span style={styles.brandText}>Marks System</span>
        </div>

        <div style={styles.userBadge}>
          <div style={styles.avatar}>{user?.fullName?.[0] ?? 'U'}</div>
          <div>
            <div style={styles.userName}>{user?.fullName}</div>
            <div style={styles.userRole}>{user?.role}</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button style={styles.logoutBtn} onClick={() => { logout(); navigate('/login'); }}>
          🚪 Sign Out
        </button>
      </aside>

      {/* Main content */}
      <main style={styles.main}>
        {children}
      </main>
    </div>
  );
}

const styles = {
  shell:         { display: 'flex', minHeight: '100vh' },
  sidebar:       { width: 230, background: '#1e3a5f', display: 'flex', flexDirection: 'column', padding: '20px 0', position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto' },
  brand:         { display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,.12)' },
  brandText:     { color: '#fff', fontWeight: 700, fontSize: 16 },
  userBadge:     { display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.12)', marginBottom: 8 },
  avatar:        { width: 36, height: 36, borderRadius: '50%', background: '#2d6a9f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 },
  userName:      { color: '#fff', fontSize: 13, fontWeight: 600 },
  userRole:      { color: 'rgba(255,255,255,.5)', fontSize: 11 },
  nav:           { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 12px' },
  navLink:       { display: 'block', padding: '10px 12px', borderRadius: 8, color: 'rgba(255,255,255,.75)', textDecoration: 'none', fontSize: 13, fontWeight: 500, transition: 'all .15s' },
  navLinkActive: { background: 'rgba(255,255,255,.18)', color: '#fff', fontWeight: 700 },
  logoutBtn:     { margin: '12px 16px 0', padding: '10px', background: 'rgba(255,80,80,.2)', color: '#ff8080', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  main:          { marginLeft: 230, flex: 1, padding: 32, overflowY: 'auto' },
};
