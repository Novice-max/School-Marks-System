import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { refreshSession, logoutSession } from '../api/client';

const AuthContext = createContext(null);

/* ─── Session rules (must match backend jwt.idle-minutes = 16) ───
   • 15 min with no activity  → logged out, must sign in again
   • warning appears 60 s before that, with a "Stay signed in" button
   • while active, the token is refreshed at most once a minute, so the
     server-side token always outlives the frontend timer by ~1 min        */
export const IDLE_LIMIT_MS    = 15 * 60 * 1000;
export const WARNING_MS       = 60 * 1000;
const REFRESH_EVERY_MS        = 60 * 1000;
const TICK_MS                 = 1000;

// Passive events count as activity, except while the warning is showing —
// then only a deliberate click/keypress (or the button) keeps the session.
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'input', 'scroll', 'touchstart', 'click', 'wheel'];
const DELIBERATE      = new Set(['mousedown', 'keydown', 'touchstart', 'click']);

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [warnSecsLeft, setWarnSecsLeft] = useState(null); // null = no warning

  const lastActivityRef = useRef(Date.now());
  const lastRefreshRef  = useRef(Date.now());
  const refreshingRef   = useRef(false);
  const loggingOutRef   = useRef(false);
  const warningRef      = useRef(false);

  /* ─── logout ─── reason: 'manual' | 'timeout' */
  const logout = useCallback(async (reason = 'manual') => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;

    // Tell the backend first (needs the token) — best effort, max 2 s
    if (sessionStorage.getItem('token')) {
      try {
        await Promise.race([
          logoutSession(reason),
          new Promise(resolve => setTimeout(resolve, 2000)),
        ]);
      } catch { /* token may already be dead — fine */ }
    }

    sessionStorage.clear();
    if (reason === 'timeout') sessionStorage.setItem('sessionExpired', 'true');
    setUser(null);
    setWarnSecsLeft(null);
    warningRef.current = false;
    loggingOutRef.current = false;

    if (reason === 'timeout') window.location.href = '/login';
  }, []);

  /* ─── sliding token refresh ─── */
  const maybeRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    if (Date.now() - lastRefreshRef.current < REFRESH_EVERY_MS) return;
    if (!sessionStorage.getItem('token')) return;

    refreshingRef.current = true;
    try {
      const { data } = await refreshSession();
      if (data?.token) {
        sessionStorage.setItem('token', data.token);
        setUser(prev => (prev ? { ...prev, token: data.token } : prev));
      }
      lastRefreshRef.current = Date.now();
    } catch {
      // 401 is handled by the axios interceptor (redirect to login).
      // Network blips: try again on the next activity.
      lastRefreshRef.current = Date.now() - REFRESH_EVERY_MS + 15_000;
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  /* ─── explicit "Stay signed in" ─── */
  const stayActive = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningRef.current = false;
    setWarnSecsLeft(null);
    lastRefreshRef.current = 0; // force an immediate refresh
    maybeRefresh();
  }, [maybeRefresh]);

  /* ─── activity tracking + idle clock ─── */
  const loggedIn = !!user;
  useEffect(() => {
    if (!loggedIn) return;

    lastActivityRef.current = Date.now();

    const onActivity = (e) => {
      if (warningRef.current && !DELIBERATE.has(e.type)) return;
      lastActivityRef.current = Date.now();
      if (warningRef.current) {
        warningRef.current = false;
        setWarnSecsLeft(null);
      }
      maybeRefresh();
    };

    // Compares wall-clock time every second, so it also catches a laptop that
    // slept or a background tab whose timers were throttled.
    const tick = () => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= IDLE_LIMIT_MS) {
        logout('timeout');
      } else if (idle >= IDLE_LIMIT_MS - WARNING_MS) {
        warningRef.current = true;
        setWarnSecsLeft(Math.ceil((IDLE_LIMIT_MS - idle) / 1000));
      }
    };

    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }));
    const interval = setInterval(tick, TICK_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, onActivity));
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loggedIn, logout, maybeRefresh]);

  /* ─── restore from sessionStorage (survives reload, cleared when the tab closes) ─── */
  useEffect(() => {
    const token    = sessionStorage.getItem('token');
    const role     = sessionStorage.getItem('role');
    const username = sessionStorage.getItem('username');
    const fullName = sessionStorage.getItem('fullName');
    const isFirst  = sessionStorage.getItem('isFirstLogin') === 'true';

    if (token) setUser({ token, role, username, fullName, isFirstLogin: isFirst });
    setLoading(false);
  }, []);

  const loginUser = (data) => {
    sessionStorage.setItem('token',        data.token);
    sessionStorage.setItem('role',         data.role);
    sessionStorage.setItem('username',     data.username);
    sessionStorage.setItem('fullName',     data.fullName);
    sessionStorage.setItem('isFirstLogin', data.firstLogin);
    lastActivityRef.current = Date.now();
    lastRefreshRef.current  = Date.now();
    setUser({ ...data, isFirstLogin: data.firstLogin });
  };

  const clearFirstLogin = () => {
    sessionStorage.setItem('isFirstLogin', 'false');
    setUser(prev => ({ ...prev, isFirstLogin: false }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout, clearFirstLogin, warnSecsLeft, stayActive }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
