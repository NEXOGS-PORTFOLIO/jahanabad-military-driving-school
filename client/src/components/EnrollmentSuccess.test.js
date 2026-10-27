import i18n from '../i18n';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import EnrollmentsSection from '../pages/dashboards/student/EnrollmentsSection';
import api from '../utils/api';

jest.mock('../utils/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { _id: 'student', role: 'student' } }) }));
jest.mock('react-toastify', () => ({ toast: { error: jest.fn() } }));
const confirmation = {
  studentName: 'রহিম', courseName: 'Light Vehicle Training',
  greeting: 'প্রিয় রহিম,',
  message: 'আপনি সফলভাবে ‘Light Vehicle Training’ কোর্সটিতে এনরোল করেছেন। পরবর্তী কার্যক্রমের জন্য সরাসরি নিম্নলিখিত ঠিকানায় যোগাযোগ করুন।',
  contactNumber: '01769-564999', address: 'Jahanabad Cantonment, Khan Jahan Ali, Khulna'
};
let root, container;
beforeEach(async () => {
  i18n.changeLanguage('en');
  global.IS_REACT_ACT_ENVIRONMENT = true;
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  api.get.mockImplementation(async path => ({ data: { data: path === '/batches'
    ? [{ _id: 'batch', name: 'October Batch', course: { _id: 'course', title: 'Light Vehicle Training' } }] : [] } }));
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<EnrollmentsSection />));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.clearAllMocks();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});
test('Apply for Training shows confirmation only after success and Close dismisses it', async () => {
  let resolve;
  api.post.mockImplementation(() => new Promise(done => { resolve = done; }));
  await act(async () => container.querySelector('button').click());
  expect(container.querySelector('dialog')).toBeNull();
  expect(container.querySelector('button').disabled).toBe(true);
  await act(async () => resolve({ data: { confirmation } }));
  expect(api.post).toHaveBeenCalledWith('/enrollments', { course: 'course', batch: 'batch' });
  const dialog = container.querySelector('dialog');
  expect(dialog.open).toBe(true);
  expect(dialog.textContent).toContain('Dear রহিম,');
  expect(dialog.textContent).toContain('You have successfully enrolled in “Light Vehicle Training”');
  expect(dialog.textContent).toContain(confirmation.contactNumber);
  expect(dialog.textContent).toContain(confirmation.address);
  await act(async () => i18n.changeLanguage('bn'));
  expect(dialog.textContent).toContain('প্রিয় রহিম,');
  expect(dialog.textContent).toContain('আপনি সফলভাবে');
  expect(dialog.querySelector('button').textContent).toBe('বন্ধ করুন');
  act(() => dialog.querySelector('button').click());
  expect(container.querySelector('dialog')).toBeNull();
});
test('failed application never opens the success dialog', async () => {
  api.post.mockRejectedValue(new Error('Application failed'));
  await act(async () => container.querySelector('button').click());
  expect(container.querySelector('dialog')).toBeNull();
  expect(container.querySelector('button').disabled).toBe(false);
});
