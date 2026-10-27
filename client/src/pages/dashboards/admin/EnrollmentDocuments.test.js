import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import api from '../../../utils/api';
import EnrollmentDocuments from './EnrollmentDocuments';

jest.mock('../../../utils/api', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn() } }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../../../hooks/useSiteTranslation', () => ({ translate: text => text }));
let container, root, close;
beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  close = jest.fn();
  api.get.mockResolvedValue({ data: { data: { documents: { nidDocument: { filename: 'existing.pdf' } } } } });
  api.put.mockResolvedValue({ data: { success: true } });
  await act(async () => root.render(<EnrollmentDocuments enrollment={{ _id: 'enrollment', student: { _id: 'student', name: 'Student' } }} onClose={close} />));
});
afterEach(() => { act(() => root.unmount()); container.remove(); jest.clearAllMocks(); delete global.IS_REACT_ACT_ENVIRONMENT; });

test('shows existing documents and saves only the selected file', async () => {
  expect(container.textContent).toContain('existing.pdf');
  const file = new File(['%PDF-1.7'], 'biodata.pdf', { type: 'application/pdf' });
  act(() => Simulate.change(container.querySelector('#biodataDocument'), { target: { files: [file] } }));
  await act(async () => Simulate.submit(container.querySelector('form')));
  const [path, body] = api.put.mock.calls[0];
  expect(path).toBe('/enrollments/enrollment/documents');
  expect(body.get('biodataDocument')).toBe(file);
  expect(body.has('nidDocument')).toBe(false);
  expect(close).toHaveBeenCalled();
});

test('rejects files over 5 MB before upload', () => {
  act(() => Simulate.change(container.querySelector('#nidDocument'), { target: { files: [{ name: 'large.pdf', type: 'application/pdf', size: 5 * 1024 * 1024 + 1 }], value: 'large.pdf' } }));
  expect(container.querySelector('[role="alert"]').textContent).toContain('maximum 5 MB');
  expect(container.querySelector('button[type="submit"]').disabled).toBe(true);
  expect(api.put).not.toHaveBeenCalled();
});

test('removal is staged until saved and can be undone', async () => {
  const button = label => [...container.querySelectorAll('button')].find(item => item.textContent === label);
  act(() => button('Remove').click());
  expect(container.textContent).toContain('Removal pending');
  expect(api.put).not.toHaveBeenCalled();
  act(() => button('Undo').click());
  expect(container.textContent).not.toContain('Removal pending');
  expect(container.querySelector('button[type="submit"]').disabled).toBe(true);
  act(() => button('Remove').click());
  await act(async () => Simulate.submit(container.querySelector('form')));
  const body = api.put.mock.calls[0][1];
  expect(body.get('remove_nidDocument')).toBe('true');
  expect(body.has('nidDocument')).toBe(false);
  expect(body.has('remove_biodataDocument')).toBe(false);
});
