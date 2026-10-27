import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { toast } from 'react-toastify';
import i18n from '../../../i18n';
import api from '../../../utils/api';
import { todayInDhaka } from '../../../utils/attendance';
import AttendanceSection from './AttendanceSection';

jest.mock('../../../utils/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
let root, container, enrollments;
const courses = [{ _id: 'course-1', title: 'Light Vehicle Training' }, { _id: 'course-2', title: 'Heavy Vehicle Training' }];
const batches = [{ _id: 'batch-1', course: { _id: 'course-1' }, name: 'Light batch' }];
const button = label => [...container.querySelectorAll('button')].find(item => item.textContent === label);
const change = async (selector, value) => { await act(async () => Simulate.change(container.querySelector(selector), { target: { value } })); };
const mark = async (id, status) => { await act(async () => Simulate.change(container.querySelector(`input[name="attendance-${id}"][value="${status}"]`))); };
const selected = id => container.querySelector(`input[name="attendance-${id}"]:checked`)?.value;
beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  await i18n.changeLanguage('en');
  enrollments = [
    { _id: 'enrollment-1', student: { name: 'Ayesha Rahman', email: 'a.very.long.student.email@example.com', phone: '+8801712345678' }, batch: batches[0], attendance: [{ date: todayInDhaka(), status: 'absent' }, { date: '2026-01-01', status: 'present' }, { date: '2026-01-01', status: 'present' }] },
    { _id: 'enrollment-2', student: { name: 'Rahim Ahmed', email: 'rahim@example.com' }, attendance: [{ date: todayInDhaka(), status: 'late' }] },
    { _id: 'enrollment-3', student: { name: 'New Student', email: 'new@example.com' }, attendance: [] }
  ];
  api.get.mockImplementation(async path => ({ data: { data: path === '/enrollments/my-courses' ? courses : path === '/batches/my-batches' ? batches : enrollments } }));
  api.post.mockImplementation(async (path, payload) => ({ data: { data: payload.attendance.map(item => ({ enrollmentId: item.enrollmentId, success: true, attendance: { date: item.date, status: item.status } })) } }));
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<AttendanceSection />));
});
afterEach(() => { act(() => root.unmount()); container.remove(); jest.resetAllMocks(); delete global.IS_REACT_ACT_ENVIRONMENT; });

test('loads saved absent and late statuses for the selected date and counts distinct present days', async () => {
  await change('#attendance-course', 'course-1');
  expect(selected('enrollment-1')).toBe('absent');
  expect(selected('enrollment-2')).toBe('late');
  expect(selected('enrollment-3')).toBe('present');
  expect(container.textContent).toContain('Present days: 1');
  expect(container.textContent).toContain('Not saved for this date');
  expect(container.querySelector('#attendance-date').value).toBe(todayInDhaka());
});

test('date changes show the correct saved record and retain drafts when returning to a date', async () => {
  await change('#attendance-course', 'course-1');
  await mark('enrollment-1', 'late');
  await change('#attendance-date', '2026-01-01');
  expect(selected('enrollment-1')).toBe('present');
  await change('#attendance-date', todayInDhaka());
  expect(selected('enrollment-1')).toBe('late');
  act(() => button('Reset').click());
  expect(selected('enrollment-1')).toBe('absent');
});

test('search does not restrict class-wide bulk marking or submission', async () => {
  await change('#attendance-course', 'course-1');
  await change('.attendance-search input', 'Ayesha');
  expect(container.querySelectorAll('.attendance-student-row')).toHaveLength(1);
  act(() => button('Mark All Absent').click());
  await act(async () => Simulate.submit(container.querySelector('form')));
  expect(api.post).toHaveBeenCalledWith('/enrollments/attendance/bulk', { attendance: enrollments.map(enrollment => ({ enrollmentId: enrollment._id, date: todayInDhaka(), status: 'absent' })) });
  expect(container.textContent).toContain('All records saved');
  expect(button('Save Attendance').disabled).toBe(true);
});

test('saving a correction replaces that day locally and preserves the selected statuses', async () => {
  await change('#attendance-course', 'course-1');
  await mark('enrollment-1', 'present');
  await act(async () => Simulate.submit(container.querySelector('form')));
  expect(selected('enrollment-1')).toBe('present');
  expect(selected('enrollment-2')).toBe('late');
  expect(container.textContent).toContain('Present days: 2');
  expect(toast.success).toHaveBeenCalledWith('Attendance marked successfully');
});

test('partial success leaves failed students pending and never reports all records saved', async () => {
  await change('#attendance-course', 'course-1');
  api.post.mockResolvedValueOnce({ data: { data: [{ enrollmentId: 'enrollment-1', success: true }, { enrollmentId: 'enrollment-2', success: true }, { enrollmentId: 'enrollment-3', success: false }] } });
  await act(async () => Simulate.submit(container.querySelector('form')));
  expect(container.textContent).toContain('Pending records: 1');
  expect(button('Save Attendance').disabled).toBe(false);
  expect(toast.success).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalled();
});

test('failed save retains changes and enables retry', async () => {
  await change('#attendance-course', 'course-1');
  await mark('enrollment-1', 'late');
  api.post.mockRejectedValueOnce(new Error('Unavailable'));
  await act(async () => Simulate.submit(container.querySelector('form')));
  expect(selected('enrollment-1')).toBe('late');
  expect(button('Save Attendance').disabled).toBe(false);
});

test('changing courses clears the previous batch and ignores stale roster responses', async () => {
  await change('#attendance-course', 'course-1');
  await change('#attendance-batch', 'batch-1');
  let oldResponse;
  api.get.mockImplementationOnce(() => new Promise(resolve => { oldResponse = resolve; }));
  await change('#attendance-batch', 'all');
  api.get.mockResolvedValueOnce({ data: { data: [{ _id: 'other', student: { name: 'Heavy vehicle student' } }] } });
  await change('#attendance-course', 'course-2');
  await act(async () => oldResponse({ data: { data: enrollments } }));
  expect(container.querySelector('#attendance-batch').value).toBe('all');
  expect(container.textContent).toContain('Heavy vehicle student');
  expect(container.textContent).not.toContain('Ayesha Rahman');
});

test('future dates cannot submit and Bangla status labels render correctly', async () => {
  await change('#attendance-course', 'course-1');
  await change('#attendance-date', '2099-01-01');
  expect(button('Save Attendance').disabled).toBe(true);
  await act(async () => i18n.changeLanguage('bn'));
  expect(container.textContent).toContain('দেরিতে উপস্থিত');
});
