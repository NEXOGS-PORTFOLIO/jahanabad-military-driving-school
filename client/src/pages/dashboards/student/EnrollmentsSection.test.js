import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import api from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';
import i18n from '../../../i18n';
import EnrollmentsSection from './EnrollmentsSection';

jest.mock('../../../utils/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('react-toastify', () => ({ toast: { error: jest.fn() } }));
const batch = { _id: 'batch', course: { _id: 'course', title: 'Driving' }, name: 'Batch One', status: 'upcoming', capacity: 10 };
const otherBatch = { ...batch, _id: 'other', name: 'Batch Two' };
const record = status => ({ _id: 'existing', course: batch.course, batch, status, progress: 0 });
let root, container, records;
beforeEach(async () => {
  jest.resetAllMocks();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  await i18n.changeLanguage('en');
  useAuth.mockReturnValue({ user: { _id: 'student-one', role: 'student' } });
  records = [];
  api.get.mockImplementation(url => Promise.resolve({ data: { data: url.includes('my-enrollments') ? records : [batch, otherBatch] } }));
  api.post.mockImplementation(async () => {
    const created = record('pending');
    records = [created];
    return { data: { data: created } };
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
const render = () => act(async () => root.render(<EnrollmentsSection />));
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});
test.each(['pending', 'approved', 'completed', 'rejected'])('%s enrollment disables the matching batch but leaves other batches available', async status => {
  records = [record(status)];
  await render();
  const buttons = container.querySelectorAll('.batch-card button');
  expect(buttons[0].textContent).toBe('Already Enrolled');
  expect(buttons[0].disabled).toBe(true);
  expect(buttons[1].textContent).toBe('Apply for Training');
  expect(buttons[1].disabled).toBe(false);
  await act(async () => buttons[0].click());
  expect(api.post).not.toHaveBeenCalled();
});
test('successful application immediately changes the button and cannot be submitted twice', async () => {
  await render();
  await act(async () => container.querySelector('.batch-card button').click());
  const button = container.querySelector('.batch-card button');
  expect(button.textContent).toBe('Already Enrolled');
  expect(button.disabled).toBe(true);
  await act(async () => button.click());
  expect(api.post).toHaveBeenCalledTimes(1);
});
test('changing accounts retrieves that student’s records instead of retaining previous enrollment state', async () => {
  records = [record('completed')];
  await render();
  expect(container.querySelector('.batch-card button').disabled).toBe(true);
  useAuth.mockReturnValue({ user: { _id: 'student-two', role: 'student' } });
  records = [];
  await render();
  expect(container.querySelector('.batch-card button').disabled).toBe(false);
});
test('legacy course-only enrollment blocks another application for that course', async () => {
  records = [{ ...record('pending'), batch: undefined }];
  await render();
  expect([...container.querySelectorAll('.batch-card button')].every(button => button.textContent === 'Already Enrolled' && button.disabled)).toBe(true);
});
