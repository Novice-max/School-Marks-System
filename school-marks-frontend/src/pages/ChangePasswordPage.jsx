import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../api/client';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const { user, clearFirstLogin } = useAuth();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed successfully');
      clearFirstLogin();
      navigate(user.role === 'ADMIN' ? '/admin' : '/teacher');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>🔐 Change Your Password</h2>
        <p style={styles.sub}>You must change your password before continuing.</p>
        <form onSubmit={handle} style={styles.form}>
          {['currentPassword', 'newPassword', 'confirm'].map((field, i) => (
            <div key={field}>
              <label style={styles.label}>
                {['Current Password', 'New Password', 'Confirm New Password'][i]}
              </label>
              <input
                style={styles.input}
                type="password"
                value={form[field]}
                onChange={e => setForm({ ...form, [field]: e.target.value })}
                required
                minLength={field !== 'currentPassword' ? 6 : 1}
              />
            </div>
          ))}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrapper: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' },
  card:    { background: '#fff', borderRadius: 16, padding: '40px 36px', width: 380, boxShadow: '0 8px 30px rgba(0,0,0,.12)' },
  title:   { fontSize: 20, fontWeight: 700, color: '#1e3a5f', marginBottom: 6 },
  sub:     { fontSize: 13, color: '#888', marginBottom: 24 },
  form:    { display: 'flex', flexDirection: 'column', gap: 14 },
  label:   { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 4 },
  input:   { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #dde3ea', fontSize: 14 },
  btn:     { padding: '12px', background: '#1e5fa0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' },
};
