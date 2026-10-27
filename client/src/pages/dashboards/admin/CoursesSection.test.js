import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { toast } from 'react-toastify';
import i18n from '../../../i18n';
import api from '../../../utils/api';
import CoursesSection from './CoursesSection';

jest.mock('../../../utils/api', () => ({ __esModule: true, default: { get: jest.fn(), delete: jest.fn(), put: jest.fn(), post: jest.fn() }, resolveAssetUrl: url => url }));
jest.mock('react-toastify', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

let container, root, confirm;
const courses = [
  { _id: 'active-course', title: 'Light Vehicle Training', description: 'Driving', duration: '6 weeks', price: 10000, isActive: true },
  { _id: 'inactive-course', title: 'Instructor Training', description: 'Teaching', duration: '3 weeks', price: 0, isActive: false }
];
const deleteButton = id => container.querySelector(`[aria-label="Delete course ${courses.find(course => course._id === id).title}"]`);

beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  await i18n.changeLanguage('en');
  api.get.mockResolvedValue({ data: { data: courses } });
  api.delete.mockResolvedValue({ data: { success: true } });
  api.put.mockResolvedValue({ data: { success: true } });
  URL.createObjectURL = jest.fn(() => 'blob:course-preview');
  URL.revokeObjectURL = jest.fn();
  confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<CoursesSection />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  confirm.mockRestore();
  jest.resetAllMocks();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test.each(['active-course', 'inactive-course'])('deletes %s only after confirmation and removes its row', async id => {
  await act(async () => deleteButton(id).click());
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining(courses.find(course => course._id === id).title));
  expect(api.delete).toHaveBeenCalledWith(`/courses/${id}`);
  expect(deleteButton(id)).toBeNull();
  expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
  expect(toast.success).toHaveBeenCalledWith('Course deleted successfully');
});

test('canceling deletion leaves the course and never calls the API', async () => {
  confirm.mockReturnValue(false);
  await act(async () => deleteButton('active-course').click());
  expect(api.delete).not.toHaveBeenCalled();
  expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
});

test('failed deletion keeps the course and shows the server error', async () => {
  api.delete.mockRejectedValue({ response: { data: { message: 'Unable to delete course' } } });
  await act(async () => deleteButton('active-course').click());
  expect(deleteButton('active-course').disabled).toBe(false);
  expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
  expect(toast.error).toHaveBeenCalledWith('Unable to delete course');
});

test('pending deletion disables buttons to prevent duplicate requests', async () => {
  let finish;
  api.delete.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => deleteButton('active-course').click());
  expect(deleteButton('active-course').disabled).toBe(true);
  expect(deleteButton('inactive-course').disabled).toBe(true);
  await act(async () => deleteButton('active-course').click());
  expect(api.delete).toHaveBeenCalledTimes(1);
  await act(async () => finish({ data: { success: true } }));
  expect(deleteButton('inactive-course').disabled).toBe(false);
});

test('edit uploads the selected image as multipart data and previews it before saving', async () => {
  act(() => container.querySelector('tbody tr .btn-secondary').click());
  const image = new File(['image bytes'], 'course.png', { type: 'image/png' });
  await act(async () => Simulate.change(container.querySelector('input[type="file"]'), { target: { files: [image] } }));
  expect(container.querySelector('.modal-content img').getAttribute('src')).toBe('blob:course-preview');
  await act(async () => Simulate.submit(container.querySelector('form')));
  const [url, data, config] = api.put.mock.calls[0];
  expect(url).toBe('/courses/active-course');
  expect(data).toBeInstanceOf(FormData);
  expect(data.get('image')).toBe(image);
  expect(config.headers['Content-Type']).toBe('multipart/form-data');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:course-preview');
});

test('invalid image shows a clear error and is not included in the update', async () => {
  act(() => container.querySelector('tbody tr .btn-secondary').click());
  await act(async () => Simulate.change(container.querySelector('input[type="file"]'), { target: { files: [new File(['text'], 'notes.txt', { type: 'text/plain' })], value: 'notes.txt' } }));
  expect(toast.error).toHaveBeenCalledWith('Please select an image no larger than 5 MB.');
  await act(async () => Simulate.submit(container.querySelector('form')));
  expect(api.put.mock.calls[0][1].get('image')).toBeNull();
});
