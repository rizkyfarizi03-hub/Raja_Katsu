import { createContext, useContext, useEffect, useState } from 'react';
import api, { getToken, setToken } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api.get('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    setToken(res.data.data.token);
    setUser(res.data.data.user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, checking, login, logout }}>{children}</AuthContext.Provider>;
}
