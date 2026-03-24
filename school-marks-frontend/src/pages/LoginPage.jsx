import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form,    setForm]    = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const { loginUser }         = useAuth();
  const navigate              = useNavigate();

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
      <div style={s.card}>
        {/* School logo */}
        <img src="/school_logo.png" alt="Santa Ana Academy" style={s.logo} />
        <h1 style={s.school}>Santa Ana Academy</h1>
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
            <input style={s.input} type="password" placeholder="Enter password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password" required />
          </div>
          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
            type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={s.footer}>Serving God & Humanity</p>
      </div>
    </div>
  );
}

const s = {
  wrapper:       { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1a1a6e 0%,#2d2d9f 50%,#1e3a5f 100%)' },
  card:          { background: '#fff', borderRadius: 16, padding: '40px 40px', width: 400, boxShadow: '0 20px 60px rgba(0,0,0,.3)', textAlign: 'center' },
  logo:          { width: 90, height: 90, objectFit: 'contain', marginBottom: 12 },
  school:        { fontSize: 20, fontWeight: 800, color: '#1a1a6e', marginBottom: 2 },
  system:        { fontSize: 13, color: '#888', marginBottom: 20, fontStyle: 'italic' },
  expiredBanner: { background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 16 },
  form:          { display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' },
  label:         { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 4 },
  input:         { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #dde3ea', fontSize: 14, boxSizing: 'border-box' },
  btn:           { marginTop: 4, padding: '12px', background: '#1a1a6e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  footer:        { marginTop: 20, fontSize: 12, color: '#aaa', fontStyle: 'italic' },
};
