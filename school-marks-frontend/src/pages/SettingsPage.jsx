import { usePageStyles } from '../styles/pageStyles';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

const APP_VERSION = '2.1.0';
const BUILD_DATE  = 'May 2026';

const ShieldIcon = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const InfoIcon = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const DatabaseIcon = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

export default function SettingsPage() {
  const s = usePageStyles();
  const t = s.tokens;
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const section = {
    ...s.card,
    padding: 24,
  };

  const sectionHeader = {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
  };

  const sectionIcon = {
    width: 36, height: 36, borderRadius: 10, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  };

  const row = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: `1px solid ${t.border}`,
  };

  const rowLabel = { fontSize: 13, color: t.textMuted };
  const rowValue = { fontSize: 13, fontWeight: 600, color: t.text };

  return (
    <div>
      <h1 style={s.title}>⚙️ Settings</h1>

      {/* ─── Profile ─── */}
      <div style={section}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 16, borderBottom: `1px solid ${t.border}` }}>
          <Avatar name={user?.fullName || 'User'} size={52} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: t.text }}>{user?.fullName}</div>
            <div style={{ fontSize: 13, color: t.textFaint }}>{user?.role}</div>
          </div>
        </div>
      </div>

      {/* ─── Appearance ─── */}
      <div style={section}>
        <div style={sectionHeader}>
          <div style={{ ...sectionIcon, background: t.accentSubtle }}>
            {isDark ? '🌙' : '☀️'}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Appearance</div>
            <div style={{ fontSize: 12, color: t.textFaint }}>Customize the look and feel</div>
          </div>
        </div>
        <div style={row}>
          <span style={rowLabel}>Theme</span>
          <button
            onClick={toggleTheme}
            style={{
              padding: '6px 16px', borderRadius: 20, border: `1.5px solid ${t.border}`,
              background: t.rowAlt, color: t.text, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {isDark ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
          </button>
        </div>
      </div>

      {/* ─── App Info ─── */}
      <div style={section}>
        <div style={sectionHeader}>
          <div style={{ ...sectionIcon, background: t.infoBg }}>
            <InfoIcon size={18} color={t.infoText} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>About</div>
            <div style={{ fontSize: 12, color: t.textFaint }}>Application information</div>
          </div>
        </div>
        <div style={row}>
          <span style={rowLabel}>Application</span>
          <span style={rowValue}>Santa Ana Student Management System(Teacher Portal)</span>
        </div>
        <div style={row}>
          <span style={rowLabel}>Version</span>
          <span style={rowValue}>{APP_VERSION}</span>
        </div>
        <div style={row}>
          <span style={rowLabel}>Build</span>
          <span style={rowValue}>{BUILD_DATE}</span>
        </div>
        <div style={row}>
          <span style={rowLabel}>Developer</span>
          <span style={rowValue}>Stuff N'Tuff</span>
        </div>
        <div style={row}>
          <span style={rowLabel}>Platform</span>
          <span style={rowValue}>React + Spring Boot</span>
        </div>
        <div style={{ ...row, borderBottom: 'none' }}>
          <span style={rowLabel}>School</span>
          <span style={rowValue}>Santa Ana Calm Waters Academy</span>
        </div>
      </div>

      {/* ─── Privacy & Data ─── */}
      <div style={section}>
        <div style={sectionHeader}>
          <div style={{ ...sectionIcon, background: t.successBg }}>
            <ShieldIcon size={18} color={t.successText} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Privacy & Data</div>
            <div style={{ fontSize: 12, color: t.textFaint }}>How your information is handled</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7 }}>
          <p style={{ marginBottom: 12 }}>
            This system is designed for internal school use only. All data is stored securely on encrypted servers
            and is only accessible by authorized school administrators and teachers.
          </p>
          <p style={{ marginBottom: 12 }}>
            The system does not share any personal information with third parties. Data is used exclusively for
            academic record keeping, performance tracking, and report generation.
          </p>
        </div>
      </div>

      {/* ─── Data Collected ─── */}
      <div style={section}>
        <div style={sectionHeader}>
          <div style={{ ...sectionIcon, background: t.warningBg }}>
            <DatabaseIcon size={18} color={t.warningText} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Data Collected</div>
            <div style={{ fontSize: 12, color: t.textFaint }}>Information stored in this system</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { category: 'Student Records', items: 'Name, admission number, gender, date of birth, parent contact, class enrollment' },
            { category: 'Academic Data', items: 'Exam scores, grades, grade points, subject averages, class rankings' },
            { category: 'Teacher Records', items: 'Name, email, phone number, subject-class assignments' },
            { category: 'Authentication', items: 'Username, encrypted password (never stored in plain text)' },
          ].map((d, i) => (
            <div key={i} style={{
              padding: '10px 14px', borderRadius: 8, background: t.rowAlt,
              border: `1px solid ${t.border}`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 2 }}>{d.category}</div>
              <div style={{ fontSize: 12, color: t.textFaint }}>{d.items}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div style={{ textAlign: 'center', padding: '20px 0', color: t.textFaint, fontSize: 12 }}>
        Santa Ana Calm Waters Academy — Serving God & Humanity
      </div>
    </div>
  );
}