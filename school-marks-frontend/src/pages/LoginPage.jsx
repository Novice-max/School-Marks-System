import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form,       setForm]       = useState({ username: '', password: '' });
  const [loading,    setLoading]    = useState(false);
  const [expired,    setExpired]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const { loginUser }               = useAuth();
  const navigate                    = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem('sessionExpired') === 'true') {
      setExpired(true);
      sessionStorage.removeItem('sessionExpired');
    }
  }, []);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setExpired(false);
    try {
      const { data } = await login(form);
      loginUser(data);
      if (data.firstLogin) {
        navigate('/change-password');
      } else {
        navigate(data.role === 'ADMIN' ? '/admin' : '/teacher');
      }
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error('Too many attempts. Wait 1 minute and try again.');
      } else {
        toast.error('Invalid username or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.wrapper}>
      <div style={s.wavyOuter}>
        <svg style={s.wavySvg} viewBox="0 0 420 560" preserveAspectRatio="none">
          <defs>
            <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="rgba(0,0,0,0.2)" />
            </filter>

            <filter id="wavySnake" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence
                type="turbulence"
                baseFrequency="0.02"
                numOctaves="3"
                result="turbulence"
              >
                <animate
                  attributeName="seed"
                  from="1"
                  to="100"
                  dur="8s"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap
                in="SourceGraphic"
                in2="turbulence"
                scale="4"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>

            <filter id="snakeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* White card fill */}
          <path d={wavyPath} fill="#fff" filter="url(#cardShadow)" />

          {/* Snake border — continuous dark blue line, wobbling */}
          <path
            d={wavyPath}
            fill="none"
            stroke="#1a1a6e"
            strokeWidth="2.5"
            strokeLinejoin="round"
            filter="url(#wavySnake)"
          />
        </svg>

        <div style={s.cardContent}>
          <img src="/new logo.jpeg" alt="Calm Waters Academy" style={s.logo} />
          <h1 style={s.school}>Santa Ana Calm Waters Academy</h1>
          <p style={s.system}>Student Management System</p>

          {expired && (
            <div style={s.expiredBanner}>
              ⏱️ Session expired due to inactivity. Please log in again.
            </div>
          )}

          <form onSubmit={handle} style={s.form} autoComplete="off">
            <div>
              <label style={s.label}>Username</label>
              <input style={s.input} type="text" placeholder="Enter username"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                autoComplete="username" required />
            </div>
            <div>
              <label style={s.label}>Password</label>
              <div style={s.passWrap}>
                <input
                  style={{ ...s.input, paddingRight: 44 }}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password" required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={s.eyeBtn}
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
              type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={s.footer}>Serving God & Humanity</p>
        </div>
      </div>
    </div>
  );
}

const wavyPath = `
  M 14,8
  Q 105,5  210,8
  Q 315,5  406,8
  Q 416,10 416,20
  Q 418,140 414,280
  Q 416,420 416,540
  Q 416,554 406,556
  Q 315,559 210,556
  Q 105,559 14,556
  Q 4,554  4,540
  Q 2,420  6,280
  Q 4,140  4,20
  Q 4,10   14,8
  Z
`;

const s = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg,#1a1a6e 0%,#2d2d9f 50%,#1e3a5f 100%)',
  },
  wavyOuter: {
    position: 'relative',
    width: 420,
    height: 560,
  },
  wavySvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  cardContent: {
    position: 'relative',
    zIndex: 1,
    padding: '44px 44px',
    textAlign: 'center',
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  logo:          { width: 90, height: 90, objectFit: 'contain', marginBottom: 12, alignSelf: 'center' },
  school:        { fontSize: 20, fontWeight: 800, color: '#1a1a6e', marginBottom: 2 },
  system:        { fontSize: 13, color: '#888', marginBottom: 20, fontStyle: 'italic' },
  expiredBanner: { background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 16 },
  form:          { display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' },
  label:         { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 4 },
  input:         { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #dde3ea', fontSize: 14, boxSizing: 'border-box' },
  passWrap:      { position: 'relative' },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn:    { marginTop: 4, padding: '12px', background: '#1a1a6e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  footer: { marginTop: 20, fontSize: 12, color: '#aaa', fontStyle: 'italic' },
};