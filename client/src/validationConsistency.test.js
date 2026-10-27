import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import Contact from './pages/public/Contact';
import Register from './pages/auth/Register';
import { contactAPI, authAPI } from './utils/api';
import i18n from './i18n';

jest.mock('./utils/api', () => ({ contactAPI: { submitContactForm: jest.fn() }, authAPI: { register: jest.fn() } }));
jest.mock('./context/AuthContext', () => ({ useAuth: () => ({ login: jest.fn() }) }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
let root, container;
beforeEach(async () => {
  await i18n.changeLanguage('en');
  jest.clearAllMocks();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Register /><Contact /></MemoryRouter>));
});
afterEach(() => { act(() => root.unmount()); container.remove(); delete global.IS_REACT_ACT_ENVIRONMENT; });
const change = (prefix, name, value) => act(() => Simulate.change(container.querySelector(`#${prefix}-${name}`), { target: { name, value } }));

test('both forms share rules, hints, field highlighting and correction feedback', () => {
  for (const [name, invalid, valid] of [['name', 'Jo', 'Jane Doe'], ['email', 'bad@example..com', 'jane+driving@example.technology'], ['phone', '01212345678', '+8801712345678']]) {
    const contact = container.querySelector(`#contact-${name}`);
    const register = container.querySelector(`#register-${name}`);
    for (const attribute of ['required', 'minlength', 'maxlength', 'autocomplete']) expect(contact.getAttribute(attribute)).toBe(register.getAttribute(attribute));
    for (const prefix of ['contact', 'register']) change(prefix, name, invalid);
    expect(contact.className).toBe(register.className);
    expect(contact.getAttribute('aria-invalid')).toBe('true');
    expect(container.querySelector(`#contact-${name}-error`).textContent).toBe(container.querySelector(`#register-${name}-error`).textContent);
    for (const prefix of ['contact', 'register']) change(prefix, name, valid);
    expect(contact.className).toBe(register.className);
    expect(contact.className).toContain('field-valid');
    expect(container.querySelector(`#contact-${name}-error`)).toBeNull();
    expect(container.querySelector(`#register-${name}-error`)).toBeNull();
    expect(container.querySelector(`#contact-${name}-feedback`).textContent).toBe(container.querySelector(`#register-${name}-feedback`).textContent);
  }
});

test('blur and submission reveal the same required-field errors and focus the first error', async () => {
  for (const prefix of ['contact', 'register']) {
    act(() => Simulate.blur(container.querySelector(`#${prefix}-phone`)));
    expect(container.querySelector(`#${prefix}-phone-error`).textContent).toContain('mobile number');
    await act(async () => Simulate.submit(container.querySelector(`#${prefix}-name`).closest('form')));
    expect(document.activeElement.id).toBe(`${prefix}-name`);
    for (const name of ['name', 'email', 'phone']) expect(container.querySelector(`#${prefix}-${name}`).getAttribute('aria-invalid')).toBe('true');
  }
  expect(authAPI.register).not.toHaveBeenCalled();
  expect(contactAPI.submitContactForm).not.toHaveBeenCalled();
});

test('valid-field feedback uses the same Bangla translation on both forms', async () => {
  await act(async () => i18n.changeLanguage('bn'));
  for (const prefix of ['contact', 'register']) change(prefix, 'name', 'Jane Doe');
  const feedback = container.querySelector('#contact-name-feedback').textContent;
  expect(feedback).toMatch(/[\u0980-\u09ff]/);
  expect(container.querySelector('#register-name-feedback').textContent).toBe(feedback);
});

test('registration still checks passwords and agreements, then sends normalized identity data', async () => {
  for (const [name, value] of [['name', ' Jane Doe '], ['email', 'Jane@example.com'], ['phone', '01712-345678']]) change('register', name, value);
  const form = container.querySelector('#register-name').closest('form');
  await act(async () => Simulate.submit(form));
  expect(authAPI.register).not.toHaveBeenCalled();
  for (const name of ['password', 'confirmPassword']) {
    act(() => Simulate.change(form.querySelector(`[name="${name}"]`), { target: { name, value: 'Password123' } }));
  }
  await act(async () => Simulate.submit(form));
  expect(authAPI.register).not.toHaveBeenCalled();
  for (const checkbox of form.querySelectorAll('input[type="checkbox"]')) act(() => Simulate.change(checkbox, { target: { checked: true } }));
  authAPI.register.mockResolvedValue({ data: { smsAccepted: true } });
  await act(async () => Simulate.submit(form));
  const payload = authAPI.register.mock.calls[0][0];
  expect(payload.get('name')).toBe('Jane Doe');
  expect(payload.get('email')).toBe('jane@example.com');
  expect(payload.get('phone')).toBe('+8801712345678');
  expect(container.querySelector('#email-otp')).not.toBeNull();
});
