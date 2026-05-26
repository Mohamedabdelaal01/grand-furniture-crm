import { createContext, useContext, useState, useEffect } from 'react';
import { fetchMe, loginUser, logoutUser } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = loading, null = unauthenticated, object = authenticated user
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const token = localStorage.getItem('gf_token');
    if (!token) {
      setUser(null);
      return;
    }
    fetchMe()
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('gf_token');
        setUser(null);
      });
  }, []);

  const login = async (email, password) => {
    const data = await loginUser(email, password);
    localStorage.setItem('gf_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await logoutUser(); } catch (_) { /* ignore */ }
    localStorage.removeItem('gf_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading: user === undefined }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
