import i18n from '../../i18n';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import Register from './Register';
import { authAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

jest.mock('../../utils/api', () => ({ authAPI: { verifyOTP: jest.fn(), resendOTP: jest.fn() } }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
let root, container, login;
beforeEach(() => {
  i18n.changeLanguage('en');
  jest.clearAllMocks();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  login = jest.fn();
  useAuth.mockReturnValue({ login });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<MemoryRouter
    initialEntries={[{ pathname: '/register', state: { verificationEmail: 'test@example.com' } }]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Register /></MemoryRouter>));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});
const fillCodes = () => act(() => {
  Simulate.change(container.querySelector('#email-otp'), { target: { value: '123456' } });
});

const showRegistration = () => act(() => root.render(
  <MemoryRouter key="registration" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Register /></MemoryRouter>
));

test('student fields appear only for Student registration', () => {
  showRegistration();
  expect(container.querySelector('[name="fatherName"]').type).toBe('text');
  expect(container.querySelector('[name="nidNumber"]').type).toBe('text');
  expect(container.querySelectorAll('input[type="file"]')).toHaveLength(0);
  act(() => Simulate.change(container.querySelector('[value="instructor"]'), { target: { name: 'role', value: 'instructor' } }));
  expect(container.querySelector('[name="fatherName"]')).toBeNull();
  expect(container.querySelector('[name="nidNumber"]')).toBeNull();
  expect(container.querySelectorAll('input[type="file"]')).toHaveLength(0);
});

test('returning user submits one shared code before receiving the registration session', async () => {
  const user = { role: 'student' };
  authAPI.verifyOTP.mockResolvedValue({ data: { token: 'verified-token', user } });
  expect(container.textContent).toContain('test@example.com');
  expect(container.querySelector('#email-otp').required).toBe(true);
  expect(container.querySelectorAll('input')).toHaveLength(1);
  fillCodes();
  await act(async () => Simulate.submit(container.querySelector('form')));
  expect(authAPI.verifyOTP).toHaveBeenCalledWith({ email: 'test@example.com', otp: '123456' });
  expect(login).toHaveBeenCalledWith('verified-token', user, true);
});

test('rejected code keeps the user on verification without creating a session', async () => {
  authAPI.verifyOTP.mockRejectedValue({ response: { data: { message: 'Invalid verification code' } } });
  fillCodes();
  await act(async () => Simulate.submit(container.querySelector('form')));
  expect(login).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalledWith('Invalid verification code');
  expect(container.querySelector('#email-otp')).not.toBeNull();
});

test('resending clears the shared code and shows server cooldown errors', async () => {
  fillCodes();
  const resend = [...container.querySelectorAll('button')].find(button => button.textContent === 'Resend Code');
  authAPI.resendOTP.mockResolvedValue({ data: { success: true } });
  await act(async () => resend.click());
  expect(authAPI.resendOTP).toHaveBeenCalledWith({ email: 'test@example.com' });
  expect(container.querySelector('#email-otp').value).toBe('');
  authAPI.resendOTP.mockRejectedValue({ response: { data: { message: 'Please wait 60 seconds' } } });
  await act(async () => resend.click());
  expect(toast.error).toHaveBeenCalledWith('Please wait 60 seconds');
});


test('SMS failure on resend keeps email verification available and allows completion', async () => {
  authAPI.resendOTP.mockResolvedValue({ data: { success: true, smsAccepted: false,
    message: 'Verification code sent to your email. SMS is currently unavailable; use the email code to complete registration.' } });
  const resend = [...container.querySelectorAll('button')].find(button => button.textContent === 'Resend Code');
  await act(async () => resend.click());
  expect(container.querySelector('[role="status"]').textContent).toContain('use the code from your email');
  expect(container.querySelector('#email-otp').disabled).toBe(false);
  authAPI.verifyOTP.mockResolvedValue({ data: { token: 'email-verified-token', user: { role: 'student' } } });
  fillCodes();
  await act(async () => Simulate.submit(container.querySelector('form')));
  expect(authAPI.verifyOTP).toHaveBeenCalledWith({ email: 'test@example.com', otp: '123456' });
  expect(login).toHaveBeenCalledWith('email-verified-token', { role: 'student' }, true);
});
