import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import i18n from '../../../i18n';
import api from '../../../utils/api';
import EnrollmentsSection from './EnrollmentsSection';

jest.mock('../../../utils/api', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('react-toastify', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

let container, root;
const enrollments = Array.from({ length: 12 }, (_, index) => ({
  _id: String(index), student: { name: `Student ${index + 1}` },
  course: { title: 'Light Vehicle Training' },
  status: index < 7 ? 'approved' : 'completed', progress: 0,
  createdAt: '2026-10-01T00:00:00Z'
}));

beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  await i18n.changeLanguage('en');
  api.get.mockImplementation(async path => ({ data: { data: path === '/enrollments' ? enrollments : [] } }));
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

const names = () => [...container.querySelectorAll('tbody tr')].map(row => row.firstChild.textContent);
const button = label => [...container.querySelectorAll('button')].find(item => item.textContent === label);

test('Next shows successive groups of five through the final partial page and Previous returns', () => {
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

test('status filtering resets to page one and paginates only matching enrollments', () => {
  act(() => button('Next').click());
  act(() => Simulate.change(container.querySelector('select'), { target: { value: 'approved' } }));
  expect(names()).toEqual(['Student 1', 'Student 2', 'Student 3', 'Student 4', 'Student 5']);
  act(() => button('Next').click());
  expect(names()).toEqual(['Student 6', 'Student 7']);
  expect(button('Next').disabled).toBe(true);
  act(() => Simulate.change(container.querySelector('select'), { target: { value: 'pending' } }));
  expect(container.textContent).toContain('No enrollments found.');
  expect(button('Next')).toBeUndefined();
});

test('pagination controls and totals are translated in Bangla', async () => {
  await act(async () => i18n.changeLanguage('bn'));
  expect(button('পরবর্তী')).toBeDefined();
  expect(button('আগের').disabled).toBe(true);
  expect(container.querySelector('[role="status"]').textContent).toContain('মোট ১২টি');
  act(() => button('পরবর্তী').click());
  expect(names()).toEqual(['Student 6', 'Student 7', 'Student 8', 'Student 9', 'Student 10']);
});
