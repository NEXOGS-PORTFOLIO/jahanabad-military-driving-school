import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { AuthProvider, useAuth } from './AuthContext';

jest.mock('../utils/api', () => ({ authAPI: { getMe: jest.fn() } }));

test('profile updates through the shared context update the displayed user', () => {
  localStorage.clear();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  let auth;
  const Profile = () => {
    auth = useAuth();
    return <span>{auth.user?.name}</span>;
  };
  try {
    act(() => root.render(<AuthProvider><Profile /></AuthProvider>));
    act(() => auth.setUser({ name: 'Updated Student' }));
    expect(container.textContent).toBe('Updated Student');
  } finally {
    act(() => root.unmount());
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
