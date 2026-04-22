import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({ user: null, token: null, login: () => {}, logout: () => {}, isAuthenticated: false });

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = (responseData) => {
    localStorage.setItem('token', responseData.token);
    localStorage.setItem('user', JSON.stringify(responseData.data));
    setToken(responseData.token);
    setUser(responseData.data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
