import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import Contact from './Contact';
import i18n from '../../i18n';
import { contactAPI } from '../../utils/api';

jest.mock('../../utils/api', () => ({ contactAPI: { submitContactForm: jest.fn() } }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
let root, container;
beforeEach(async () => {
  await i18n.changeLanguage('en');
  jest.clearAllMocks();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<Contact />));
});
afterEach(() => { act(() => root.unmount()); container.remove(); delete global.IS_REACT_ACT_ENVIRONMENT; });
const change = (name, value) => act(() => Simulate.change(container.querySelector(`[name="${name}"]`), { target: { name, value } }));
const submit = () => act(async () => Simulate.submit(container.querySelector('form')));
const fill = () => { change('name', ' Jane Doe '); change('email', 'Jane+contact@example.com'); change('message', 'Please tell me about course schedules.'); change('phone', '01712345678'); };

test('blocks empty submissions, focuses errors, and clears errors as fields are corrected', async () => {
  expect(container.querySelectorAll('[placeholder]')).toHaveLength(4);
  expect(container.querySelectorAll('[required]')).toHaveLength(4);
  await submit();
  expect(contactAPI.submitContactForm).not.toHaveBeenCalled();
  expect(document.activeElement.id).toBe('contact-name');
  expect(container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(4);
  change('name', 'A');
  expect(container.querySelector('#contact-name-error').textContent).toContain('at least 3');
  change('name', 'Jane Doe');
  expect(container.querySelector('#contact-name-error')).toBeNull();
  change('email', 'bad');
  expect(container.querySelector('#contact-email-error')).not.toBeNull();
  change('phone', '123');
  expect(container.querySelector('#contact-phone-error')).not.toBeNull();
  change('phone', '01712-345678');
  expect(container.querySelector('#contact-phone-error')).toBeNull();
});

test('requires a mobile number and a three-character name before submitting', async () => {
  fill();
  change('phone', '');
  change('name', 'Jo');
  await submit();
  expect(contactAPI.submitContactForm).not.toHaveBeenCalled();
  expect(container.querySelector('#contact-phone-error').textContent).toContain('mobile number');
  expect(container.querySelector('#contact-name-error').textContent).toContain('at least 3');
});

test('normalizes successful submissions, prevents duplicate requests, and resets the form', async () => {
  let resolve;
  contactAPI.submitContactForm.mockImplementation(() => new Promise(done => { resolve = done; }));
  fill();
  change('phone', '01712-345678');
  await submit();
  expect(container.querySelector('button[type="submit"]').disabled).toBe(true);
  await submit();
  expect(contactAPI.submitContactForm).toHaveBeenCalledTimes(1);
  expect(contactAPI.submitContactForm).toHaveBeenCalledWith({ name: 'Jane Doe', email: 'jane+contact@example.com', phone: '+8801712345678', message: 'Please tell me about course schedules.' });
  await act(async () => resolve({ data: { success: true } }));
  expect(container.querySelector('[role="status"]').textContent).toContain('Message sent successfully');
  expect(container.querySelector('[name="name"]').value).toBe('');
  expect(container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
});

test('preserves input on failure and displays server field errors that clear on correction', async () => {
  contactAPI.submitContactForm.mockRejectedValue({ response: { status: 400, data: { errors: { email: 'Please enter your email address.' } } } });
  fill();
  await submit();
  expect(container.querySelector('[role="alert"]').textContent).toContain('Unable to send');
  expect(container.querySelector('[name="name"]').value).toBe(' Jane Doe ');
  expect(container.querySelector('#contact-email-error')).not.toBeNull();
  change('email', 'correct@example.com');
  expect(container.querySelector('#contact-email-error')).toBeNull();
  change('email', 'bad');
  expect(container.querySelector('#contact-email-error')).not.toBeNull();
});

test('shows rate limit feedback with all required fields supplied', async () => {
  contactAPI.submitContactForm.mockRejectedValue({ response: { status: 429 } });
  fill();
  await submit();
  expect(contactAPI.submitContactForm).toHaveBeenCalledWith(expect.objectContaining({ phone: '+8801712345678' }));
  expect(container.querySelector('[role="alert"]').textContent).toContain('15 minutes');
});

test('email delivery failure retains form data and explains that the submission was saved', async () => {
  contactAPI.submitContactForm.mockRejectedValue({ response: { status: 503, data: { code: 'CONTACT_EMAIL_FAILED' } } });
  fill();
  await submit();
  expect(container.querySelector('[role="alert"]').textContent).toContain('saved, but the email could not be sent');
  expect(container.querySelector('[name="email"]').value).toBe('Jane+contact@example.com');
  expect(container.querySelector('[role="status"]')).toBeNull();
});

test('accepts short messages without length validation and uses the new mobile error', async () => {
  fill();
  change('phone', '017123');
  expect(container.querySelector('#contact-phone-error').textContent).toBe('Enter a Bangladesh mobile number with 11 digits');
  change('phone', '01712345678');
  change('message', 'Hi');
  const message = container.querySelector('[name="message"]');
  expect(message.hasAttribute('minlength')).toBe(false);
  expect(message.hasAttribute('maxlength')).toBe(false);
  expect(container.querySelector('#contact-message-error')).toBeNull();
  contactAPI.submitContactForm.mockResolvedValue({ data: {} });
  await submit();
  expect(contactAPI.submitContactForm).toHaveBeenCalledWith(expect.objectContaining({ message: 'Hi' }));
});
