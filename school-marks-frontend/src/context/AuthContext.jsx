import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const AuthContext = createContext(null);

const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes in milliseconds

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  // Auto-logout function
  const logout = useCallback(() => {
    sessionStorage.clear();
    setUser(null);
    clearTimeout(timerRef.current);
  }, []);

  // Reset inactivity timer on any user activity
  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      logout();
      // Show message after redirect
      sessionStorage.setItem('sessionExpired', 'true');
      window.location.href = '/login';
    }, INACTIVITY_LIMIT);
  }, [logout]);

  // Attach activity listeners
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // Start the timer

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearTimeout(timerRef.current);
    };
  }, [user, resetTimer]);

  // On mount — read from sessionStorage (clears on reload automatically)
  useEffect(() => {
    const token      = sessionStorage.getItem('token');
    const role       = sessionStorage.getItem('role');
    const username   = sessionStorage.getItem('username');
    const fullName   = sessionStorage.getItem('fullName');
    const isFirst    = sessionStorage.getItem('isFirstLogin') === 'true';

    if (token) setUser({ token, role, username, fullName, isFirstLogin: isFirst });
    setLoading(false);
  }, []);

  const loginUser = (data) => {
    // Use sessionStorage — clears on browser reload/close
    sessionStorage.setItem('token',        data.token);
    sessionStorage.setItem('role',         data.role);
    sessionStorage.setItem('username',     data.username);
    sessionStorage.setItem('fullName',     data.fullName);
    sessionStorage.setItem('isFirstLogin', data.firstLogin);
    setUser({ ...data, isFirstLogin: data.firstLogin });
  };

  const clearFirstLogin = () => {
    sessionStorage.setItem('isFirstLogin', 'false');
    setUser(prev => ({ ...prev, isFirstLogin: false }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout, clearFirstLogin }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
