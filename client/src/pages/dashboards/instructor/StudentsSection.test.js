import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import i18n from '../../../i18n';
import api from '../../../utils/api';
import StudentsSection from './StudentsSection';

jest.mock('../../../utils/api', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('react-toastify', () => ({ toast: { error: jest.fn() } }));

let root, container;
const students = Array.from({ length: 12 }, (_, index) => ({
  _id: String(index), student: { name: `Student ${index + 1}`, email: `student${index + 1}@example.com` },
  course: { _id: index < 7 ? 'course-1' : 'course-2', title: 'Training' },
  batch: { _id: index < 6 ? 'batch-1' : 'batch-2', name: 'Training batch' },
  progress: 0, status: 'approved', attendance: []
}));

beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  await i18n.changeLanguage('en');
  api.get.mockImplementation(async path => ({ data: { data:
    path === '/enrollments/my-students' ? students :
    path === '/enrollments/my-courses' ? [{ _id: 'course-1', title: 'Training' }] :
    [{ _id: 'batch-1', name: 'Training batch' }]
  } }));
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<StudentsSection />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.clearAllMocks();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

const names = () => [...container.querySelectorAll('tbody tr')].map(row => row.firstChild.textContent);
const button = label => [...container.querySelectorAll('button')].find(item => item.textContent === label);
const change = (element, value) => act(() => Simulate.change(element, { target: { value } }));

test('pages through all students in groups of five and supports returning to the previous page', () => {
  expect(names()).toEqual(['Student 1', 'Student 2', 'Student 3', 'Student 4', 'Student 5']);
  expect(button('Previous').disabled).toBe(true);
  act(() => button('Next').click());
  expect(names()).toEqual(['Student 6', 'Student 7', 'Student 8', 'Student 9', 'Student 10']);
  act(() => button('Next').click());
  expect(names()).toEqual(['Student 11', 'Student 12']);
  expect(button('Next').disabled).toBe(true);
  act(() => button('Previous').click());
  expect(names()).toEqual(['Student 6', 'Student 7', 'Student 8', 'Student 9', 'Student 10']);
});

test('course, batch, and search changes reset pagination and handle empty results', () => {
  act(() => button('Next').click());
  change(container.querySelectorAll('select')[0], 'course-1');
  expect(names()).toHaveLength(5);
  expect(button('Previous').disabled).toBe(true);
  act(() => button('Next').click());
  expect(names()).toEqual(['Student 6', 'Student 7']);
  change(container.querySelectorAll('select')[1], 'batch-1');
  expect(names()).toHaveLength(5);
  act(() => button('Next').click());
  expect(names()).toEqual(['Student 6']);
  change(container.querySelector('input'), 'student2@');
  expect(names()).toEqual(['Student 2']);
  expect(button('Previous').disabled).toBe(true);
  expect(button('Next').disabled).toBe(true);
  change(container.querySelector('input'), 'missing');
  expect(container.textContent).toContain('No Students Found');
  expect(button('Next')).toBeUndefined();
});

test('supports Bangla pagination and totals', async () => {
  await act(async () => i18n.changeLanguage('bn'));
  expect(button('আগের').disabled).toBe(true);
  expect(container.querySelector('[role="status"]').textContent).toContain('মোট ১২ জন');
  act(() => button('পরবর্তী').click());
  expect(names()).toEqual(['Student 6', 'Student 7', 'Student 8', 'Student 9', 'Student 10']);
});
