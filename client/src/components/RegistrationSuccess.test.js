import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import RegistrationSuccess from './RegistrationSuccess';
import i18n from '../i18n';

jest.mock('../utils/api', () => ({ authAPI: { getMe: () => new Promise(() => {}) } }));

let container, root, auth, setMounted;
const student = { _id: 'student-1', name: 'রহিম', role: 'student' };
function Harness() {
  auth = useAuth();
  const [mounted, updateMounted] = React.useState(true);
  setMounted = updateMounted;
  const location = useLocation();
  return <><span data-path>{location.pathname}</span>{mounted && auth.user && <RegistrationSuccess />}</>;
}

beforeEach(() => {
  localStorage.clear();
  i18n.changeLanguage('en');
  global.IS_REACT_ACT_ENVIRONMENT = true;
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<React.StrictMode><AuthProvider><MemoryRouter initialEntries={['/student-dashboard']}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Harness /></MemoryRouter></AuthProvider></React.StrictMode>));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test.each(['Enroll', 'Cancel'])('%s dismisses the personalized pop-up permanently for this registration', label => {
  act(() => auth.login('token', student, true));
  expect(container.querySelector('dialog').open).toBe(true);
  expect(container.textContent).toContain('Dear রহিম,');
  expect(container.textContent).toContain('Your registration was successful. Please enroll in your preferred course.');
  act(() => [...container.querySelectorAll('button')].find(button => button.textContent === label).click());
  expect(container.querySelector('dialog')).toBeNull();
  expect(container.querySelector('[data-path]').textContent).toBe(
    label === 'Enroll' ? '/student-dashboard/enrollments' : '/student-dashboard'
  );
  act(() => setMounted(false));
  act(() => setMounted(true));
  expect(container.querySelector('dialog')).toBeNull();
  act(() => auth.logout());
  act(() => auth.login('token', student));
  expect(container.querySelector('dialog')).toBeNull();
});

test('ordinary login and dashboard remount never show the pop-up', () => {
  act(() => auth.login('token', student));
  expect(container.querySelector('dialog')).toBeNull();
});

test('leaving before dismissal consumes the pop-up', () => {
  act(() => auth.login('token', student, true));
  act(() => setMounted(false));
  act(() => setMounted(true));
  expect(container.querySelector('dialog')).toBeNull();
});
