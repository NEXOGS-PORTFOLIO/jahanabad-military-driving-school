import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { toast } from 'react-toastify';
import i18n from '../../../i18n';
import api from '../../../utils/api';
import CertificatesSection from './CertificatesSection';

jest.mock('../../../utils/api', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn() } }));
jest.mock('react-toastify', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const records = [
  { _id: 'record-404', certificateId: 'JMDS-2026-00000404', student: { name: 'First Student' }, course: { title: 'Light Vehicle' }, issuedDate: '2026-10-15T19:00:00Z', status: 'valid' },
  { _id: 'record-legacy', certificateId: 'JMDS-LEGACY-ABC', student: { name: 'Second Student' }, course: { title: 'Heavy Vehicle' }, issuedDate: '2025-01-02T00:00:00Z', status: 'valid' },
  { _id: 'record-revoked', certificateId: 'JMDS-2026-00000406', student: { name: 'Third Student' }, course: null, issuedDate: null, status: 'revoked' }
];
let container, root, confirm;
const button = (action, id) => container.querySelector(`[aria-label="${action} ${id}"]`);
beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  await i18n.changeLanguage('en');
  api.get.mockImplementation(async url => {
    if (url === '/certificates') return { data: { data: records } };
    if (url.endsWith('/preview')) {
      const record = records.find(item => url.includes(item._id));
      return { data: { data: { certificateId: record.certificateId, pdfData: `data:application/pdf;base64,${record._id}` } } };
    }
    return { data: new Blob(['PDF'], { type: 'application/pdf' }) };
  });
  URL.createObjectURL = jest.fn(() => 'blob:certificate');
  URL.revokeObjectURL = jest.fn();
  confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<CertificatesSection />));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  confirm.mockRestore();
  jest.resetAllMocks();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test('renders the actual course and issuedDate for each row, with safe missing-value handling', () => {
  const rows = container.querySelectorAll('tbody tr');
  records.slice(0, 2).forEach((record, index) => {
    expect(rows[index].cells[2].textContent).toBe(record.course.title);
    expect(rows[index].cells[3].textContent).toBe(new Date(record.issuedDate).toLocaleDateString('en-BD', { timeZone: 'Asia/Dhaka' }));
  });
  expect(rows[2].cells[2].textContent).toBe('N/A');
  expect(rows[2].cells[3].textContent).toBe('N/A');
  expect(container.textContent).not.toContain('Invalid Date');
  expect(Array.from(container.querySelectorAll('th')).map(th => th.textContent)).toContain('Certificate');
});

test.each(records.slice(0, 2))('previews the correct existing/new certificate $certificateId', async record => {
  await act(async () => button('Preview', record.certificateId).click());
  expect(api.get).toHaveBeenCalledWith(`/certificates/${record._id}/preview`);
  expect(container.querySelector('[role="dialog"]').textContent).toContain(record.certificateId);
  expect(container.querySelector('iframe').getAttribute('src')).toBe(`data:application/pdf;base64,${record._id}`);
  act(() => Array.from(container.querySelectorAll('button')).find(el => el.textContent === 'Close').click());
  expect(container.querySelector('iframe')).toBeNull();
});

test.each(records.slice(0, 2))('downloads the selected certificate $certificateId with its visible ID as filename', async record => {
  let downloaded;
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { downloaded = this.download; });
  await act(async () => button('Download', record.certificateId).click());
  expect(api.get).toHaveBeenCalledWith(`/certificates/${record._id}/download`, { responseType: 'blob' });
  expect(downloaded).toBe(`Certificate-${record.certificateId}.pdf`);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:certificate');
  click.mockRestore();
});

test('status filter and revoke controls follow the persisted status', async () => {
  expect(button('Download', records[2].certificateId).disabled).toBe(true);
  expect(container.querySelectorAll('tbody tr')[2].textContent).toContain('Revoked');
  await act(async () => Simulate.change(container.querySelector('select'), { target: { value: 'revoked' } }));
  expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
  expect(container.querySelector('tbody').textContent).toContain(records[2].certificateId);
  await act(async () => Simulate.change(container.querySelector('select'), { target: { value: 'valid' } }));
  expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
  api.put.mockResolvedValue({ data: { success: true } });
  await act(async () => container.querySelector('tbody .btn-danger').click());
  expect(api.put).toHaveBeenCalledWith('/certificates/record-404/revoke', { reason: 'Revoked by admin' });
});

test('preview and download errors leave the table usable', async () => {
  api.get.mockRejectedValue(new Error('Network error'));
  await act(async () => button('Preview', records[0].certificateId).click());
  expect(toast.error).toHaveBeenCalledWith('Failed to preview certificate');
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  await act(async () => button('Download', records[0].certificateId).click());
  expect(toast.error).toHaveBeenCalledWith('Failed to download certificate');
  expect(button('Download', records[0].certificateId).disabled).toBe(false);
});
