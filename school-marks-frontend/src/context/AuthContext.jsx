import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token    = localStorage.getItem('token');
    const role     = localStorage.getItem('role');
    const username = localStorage.getItem('username');
    const fullName = localStorage.getItem('fullName');
    const isFirst  = localStorage.getItem('isFirstLogin') === 'true';

    if (token) setUser({ token, role, username, fullName, isFirstLogin: isFirst });
    setLoading(false);
  }, []);

  const loginUser = (data) => {
    localStorage.setItem('token',        data.token);
    localStorage.setItem('role',         data.role);
    localStorage.setItem('username',     data.username);
    localStorage.setItem('fullName',     data.fullName);
    localStorage.setItem('isFirstLogin', data.isFirstLogin);
    setUser({ ...data });
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  const clearFirstLogin = () => {
    localStorage.setItem('isFirstLogin', 'false');
    setUser(prev => ({ ...prev, isFirstLogin: false }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout, clearFirstLogin }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
