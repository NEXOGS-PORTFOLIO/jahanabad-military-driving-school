import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import i18n from '../../../i18n';
import api from '../../../utils/api';
import { downloadFile } from '../../../utils/exportHelpers';
import StudentsSection from './StudentsSection';

jest.mock('../../../utils/api', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('../../../utils/exportHelpers', () => ({ downloadFile: jest.fn() }));
jest.mock('react-toastify', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

let container, root;
const students = Array.from({ length: 12 }, (_, index) => ({
  _id: String(index), name: `Student ${index + 1}`, email: `student${index + 1}@example.com`,
  isVerified: index < 7, createdAt: '2026-10-01T00:00:00Z'
}));

beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  await i18n.changeLanguage('en');
  api.get.mockImplementation(async path => ({ data: { data: path === '/users' ? students : [] } }));
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
const button = label => [...container.querySelectorAll('button')].find(item => item.textContent.trim() === label);

test('Next displays successive groups of five, stops on the final partial page, and Previous returns', () => {
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

test('filters and search reset the page, including an empty result', () => {
  act(() => button('Next').click());
  act(() => Simulate.change(container.querySelectorAll('select')[3], { target: { value: 'verified' } }));
  expect(names()).toEqual(['Student 1', 'Student 2', 'Student 3', 'Student 4', 'Student 5']);
  act(() => button('Next').click());
  expect(names()).toEqual(['Student 6', 'Student 7']);
  expect(button('Next').disabled).toBe(true);
  act(() => Simulate.change(container.querySelector('input'), { target: { value: 'student2@' } }));
  expect(names()).toEqual(['Student 2']);
  expect(button('Previous').disabled).toBe(true);
  act(() => Simulate.change(container.querySelector('input'), { target: { value: 'missing' } }));
  expect(container.textContent).toContain('No students found.');
  expect(button('Next')).toBeUndefined();
});

test.each([['CSV', 'csv', 'csv'], ['Excel', 'excel', 'xlsx']])('%s exports request every registered student regardless of search and pagination', async (label, format, extension) => {
  act(() => button('Next').click());
  act(() => Simulate.change(container.querySelector('input'), { target: { value: 'student2@' } }));
  expect(names()).toEqual(['Student 2']);
  const file = new Blob(['complete export']);
  api.get.mockResolvedValueOnce({ data: file, headers: { 'content-disposition': `attachment; filename="students-export-2026-10-13.${extension}"` } });
  await act(async () => button(label).click());
  expect(api.get).toHaveBeenLastCalledWith('/users/students/export', { params: { format }, responseType: 'blob' });
  expect(downloadFile).toHaveBeenCalledWith(file, `students-export-2026-10-13.${extension}`, expect.any(String));
});

test('export buttons are disabled while a complete export is being generated', async () => {
  let complete;
  api.get.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  await act(async () => button('CSV').click());
  expect(button('CSV').disabled).toBe(true);
  expect(button('Excel').disabled).toBe(true);
  expect(container.textContent).toContain('Preparing complete student export...');
  await act(async () => complete({ data: new Blob(['export']), headers: {} }));
  expect(button('CSV').disabled).toBe(false);
  expect(downloadFile).toHaveBeenCalledWith(expect.any(Blob), 'students-export.csv', expect.any(String));
});

test('an export error never downloads an incomplete file and allows retry', async () => {
  api.get.mockRejectedValueOnce(new Error('Unavailable'));
  await act(async () => button('Excel').click());
  expect(downloadFile).not.toHaveBeenCalled();
  expect(button('Excel').disabled).toBe(false);
});

test('View Profile shows personal information, document availability and training records', async () => {
  api.get.mockResolvedValue({ data: { data: {
    ...students[0], fatherName: 'Abdul Karim', nidNumber: '0012345678', status: 'active', role: 'student',
    documents: { nidDocument: { filename: 'national-id.pdf', contentType: 'application/pdf' }, biodataDocument: null }
  } } });
  await act(async () => button('View Profile').click());
  const dialog = container.querySelector('[role="dialog"]');
  expect(dialog.textContent).toContain('Abdul Karim');
  expect(dialog.textContent).toContain('0012345678');
  expect(dialog.textContent).toContain('national-id.pdf');
  expect(dialog.textContent).toContain('Not submitted');
  expect(dialog.textContent).toContain('No enrollments found.');
  expect(dialog.textContent).toContain('No certificates found.');
  expect(button('View')).toBeDefined();
  expect(button('Download')).toBeDefined();
  act(() => container.querySelector('[aria-label="Close student profile"]').click());
  expect(container.querySelector('[role="dialog"]')).toBeNull();
});

test('profile errors are visible and the dialog can be closed', async () => {
  api.get.mockRejectedValue(new Error('Unavailable'));
  await act(async () => button('View Profile').click());
  expect(container.querySelector('[role="alert"]').textContent).toBe('Unable to load student profile');
  act(() => Simulate.keyDown(container.querySelector('[role="dialog"]'), { key: 'Escape' }));
  expect(container.querySelector('[role="dialog"]')).toBeNull();
});

test('documents preview and download through authenticated API requests', async () => {
  api.get.mockResolvedValueOnce({ data: { data: {
    ...students[0], role: 'student', status: 'active',
    documents: { nidDocument: { filename: 'national-id.png', contentType: 'image/png' } }
  } } });
  await act(async () => button('View Profile').click());
  const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:student-document');
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  try {
    api.get.mockResolvedValue({ data: new Blob(['image'], { type: 'image/png' }) });
    await act(async () => button('View').click());
    expect(api.get).toHaveBeenLastCalledWith('/users/0/documents/nidDocument', {
      responseType: 'blob', params: { download: '0' }
    });
    expect(container.querySelector('.student-document-preview img').src).toBe('blob:student-document');
    await act(async () => button('Download').click());
    expect(api.get).toHaveBeenLastCalledWith('/users/0/documents/nidDocument', {
      responseType: 'blob', params: { download: '1' }
    });
    expect(click).toHaveBeenCalled();
    act(() => button('Close preview').click());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:student-document');
  } finally {
    click.mockRestore();
    // Download URLs are revoked on a timer; leave a harmless fallback for that callback.
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke || (() => {});
  }
});

test('pagination labels and counts support Bangla', async () => {
  await act(async () => i18n.changeLanguage('bn'));
  expect(button('আগের').disabled).toBe(true);
  expect(container.querySelector('[role="status"]').textContent).toContain('মোট ১২ জন');
  act(() => button('পরবর্তী').click());
  expect(names()).toEqual(['Student 6', 'Student 7', 'Student 8', 'Student 9', 'Student 10']);
});
