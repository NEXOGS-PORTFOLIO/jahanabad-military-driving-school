import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setRegistrationSuccess(null);
    setLoading(false);
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading user:', error);
      logout();
    }
  }, [logout]);

  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token, loadUser]);

  const login = (token, userData, justRegistered = false) => {
    setRegistrationSuccess(justRegistered && userData.role === 'student' ? userData._id : null);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(token);
    setUser(userData);
  };

  const clearRegistrationSuccess = useCallback(() => setRegistrationSuccess(null), []);

  const value = {
    user,
    setUser,
    token,
    loading,
    login,
    logout,
    registrationSuccess,
    clearRegistrationSuccess,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isInstructor: user?.role === 'instructor',
    isStudent: user?.role === 'student'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
