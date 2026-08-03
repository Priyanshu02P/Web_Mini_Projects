import React, { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('todo_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('todo_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .fetchMe()
      .then((freshUser) => {
        setUser(freshUser);
        localStorage.setItem('todo_user', JSON.stringify(freshUser));
      })
      .catch(() => {
        localStorage.removeItem('todo_token');
        localStorage.removeItem('todo_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { token, user: loggedInUser } = await authApi.login(email, password);
    localStorage.setItem('todo_token', token);
    localStorage.setItem('todo_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }

  function logout() {
    localStorage.removeItem('todo_token');
    localStorage.removeItem('todo_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
