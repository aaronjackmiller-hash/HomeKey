import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  updateUserProfile: () => {},
  isAuthenticated: false,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

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
    clearSession();
  };

  const updateUserProfile = useCallback((nextUserData) => {
    if (!nextUserData || typeof nextUserData !== 'object') return;
    localStorage.setItem('user', JSON.stringify(nextUserData));
    setUser(nextUserData);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleSessionExpired = () => {
      clearSession();
    };
    window.addEventListener('homekey:auth-session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('homekey:auth-session-expired', handleSessionExpired);
    };
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUserProfile, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
