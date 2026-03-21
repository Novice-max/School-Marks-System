import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm]     = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { loginUser }       = useAuth();
  const navigate            = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await login(form);
      loginUser(data);
      if (data.firstLogin) {
        navigate('/change-password');
      } else {
        navigate(data.role === 'ADMIN' ? '/admin' : '/teacher');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.logo}>📚</div>
        <h1 style={styles.title}>School Marks System</h1>
        <p style={styles.sub}>Sign in to your account</p>

        <form onSubmit={handle} style={styles.form}>
          <label style={styles.label}>Username</label>
          <input
            style={styles.input}
            type="text"
            placeholder="Enter username"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            required
          />
          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="Enter password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
          />
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrapper: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1e3a5f 0%,#2d6a9f 100%)' },
  card:    { background: '#fff', borderRadius: 16, padding: '48px 40px', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,.25)' },
  logo:    { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  title:   { fontSize: 22, fontWeight: 700, textAlign: 'center', color: '#1e3a5f', marginBottom: 4 },
  sub:     { fontSize: 14, textAlign: 'center', color: '#888', marginBottom: 28 },
  form:    { display: 'flex', flexDirection: 'column', gap: 12 },
  label:   { fontSize: 13, fontWeight: 600, color: '#444' },
  input:   { padding: '10px 14px', borderRadius: 8, border: '1.5px solid #dde3ea', fontSize: 14, outline: 'none' },
  btn:     { marginTop: 8, padding: '12px', background: '#1e5fa0', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
};
