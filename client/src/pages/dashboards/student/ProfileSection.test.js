import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { toast } from 'react-toastify';
import i18n from '../../../i18n';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../utils/api';
import ProfileSection from './ProfileSection';

jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../utils/api', () => ({ __esModule: true, default: { put: jest.fn() }, resolveAssetUrl: url => url }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

let container, root, user, setUser;
const showModal = HTMLDialogElement.prototype.showModal;
const close = HTMLDialogElement.prototype.close;
const button = text => [...container.querySelectorAll('button')].find(item => item.textContent === text);
const field = id => container.querySelector(`#${id}`);
const value = label => [...container.querySelectorAll('.profile-detail')].find(item => item.querySelector('dt').textContent === label)?.querySelector('dd').textContent;
beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  user = { _id: '507f1f77bcf86cd799439011', name: 'Alfat Tasnim Hasan', email: 'a.very.long.email.address@example.com',
    phone: '+8801736276082', gender: 'male', fatherName: 'Md. Zillul Hasan', nidNumber: '001234567890',
    role: 'student', status: 'active', isVerified: true, phoneVerified: false,
    createdAt: '2026-01-22T00:00:00Z', updatedAt: '2026-10-13T00:00:00Z' };
  setUser = jest.fn();
  useAuth.mockImplementation(() => ({ user, setUser }));
  await i18n.changeLanguage('en');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<ProfileSection />));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.resetAllMocks();
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = close;
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test('renders existing user information and distinguishes verification statuses', () => {
  expect(value('Full Name')).toBe(user.name);
  expect(value('Email Address')).toBe(user.email);
  expect(value('Phone Number')).toBe(user.phone);
  expect(value('Father’s Name')).toBe(user.fatherName);
  expect(value('NID Number')).toBe('001234567890');
  expect(value('Account ID')).toBe(user._id);
  expect(value('Gender')).toBe('Male');
  expect(value('Account Status')).toBe('Active');
  expect(value('Account verification')).toBe('Verified');
  expect(value('Phone verification')).toBe('Not Verified');
  expect(value('Member since')).toContain('2026');
  expect(value('Last updated')).toContain('2026');
});

test('missing data stays unset instead of claiming verification or an active account', async () => {
  user = { name: 'New Student', role: 'student', createdAt: 'invalid' };
  await act(async () => root.render(<ProfileSection />));
  for (const label of ['Account Status', 'Account verification', 'Phone verification', 'Gender', 'Member since', 'NID Number']) {
    expect(value(label)).toBe('Not Set');
  }
});

test('edit opens with current data, saves user changes, and discards canceled changes', async () => {
  act(() => button('Edit Profile').click());
  expect(field('profile-name').value).toBe(user.name);
  act(() => Simulate.change(field('profile-name'), { target: { name: 'name', value: 'Unsaved' } }));
  act(() => button('Cancel').click());
  user = { ...user, name: 'Updated Student' };
  await act(async () => root.render(<ProfileSection />));
  act(() => button('Edit Profile').click());
  expect(field('profile-name').value).toBe('Updated Student');
  act(() => Simulate.change(field('profile-gender'), { target: { name: 'gender', value: 'female' } }));
  const saved = { ...user, gender: 'female' };
  api.put.mockResolvedValue({ data: { data: saved } });
  await act(async () => Simulate.submit(container.querySelector('form')));
  expect(api.put).toHaveBeenCalledWith('/auth/me', expect.objectContaining({ name: 'Updated Student', gender: 'female' }));
  expect(setUser).toHaveBeenCalledWith(saved);
  expect(container.querySelector('dialog')).toBeNull();
});

test('failed profile save preserves the form and entered details', async () => {
  act(() => button('Edit Profile').click());
  api.put.mockRejectedValue(new Error('Network unavailable'));
  await act(async () => Simulate.submit(container.querySelector('form')));
  expect(container.querySelector('dialog')).not.toBeNull();
  expect(field('profile-name').value).toBe(user.name);
  expect(toast.error).toHaveBeenCalledWith('Failed to update profile');
});

test('password mismatch prevents requests and closing clears password inputs', async () => {
  act(() => button('Change Password').click());
  for (const [id, value] of [['currentPassword', 'current-password'], ['newPassword', 'new-password'], ['confirmPassword', 'different-password']]) {
    act(() => Simulate.change(field(`profile-${id}`), { target: { value } }));
  }
  await act(async () => Simulate.submit(container.querySelector('form')));
  expect(api.put).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalledWith('Passwords do not match');
  act(() => button('Cancel').click());
  act(() => button('Change Password').click());
  expect(field('profile-currentPassword').value).toBe('');
});

test('profile labels and stored gender are translated in Bangla', async () => {
  await act(async () => i18n.changeLanguage('bn'));
  expect(container.textContent).toContain('ব্যক্তিগত তথ্য');
  expect(container.textContent).toContain('পুরুষ');
  expect(container.textContent).toContain(user.email);
});
