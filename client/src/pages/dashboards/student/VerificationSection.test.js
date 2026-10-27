import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { certificateAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import i18n from '../../../i18n';
import VerificationSection from './VerificationSection';
import CertificateVerify from '../../public/CertificateVerify';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../utils/api', () => ({ certificateAPI: { getCaptcha: jest.fn(), verifyCertificate: jest.fn() } }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
let root, container;
beforeEach(async () => {
  jest.resetAllMocks();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  await i18n.changeLanguage('en');
  certificateAPI.getCaptcha.mockResolvedValue({ data: { data: { captcha: 'FD6JPL', captchaToken: 'signed-token' } } });
  certificateAPI.verifyCertificate.mockResolvedValue({ data: { success: true, data: {
    status: 'Valid', certificateId: 'JMDS-TEST', studentName: 'Test Student', issuedDate: '2026-10-13'
  } } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<VerificationSection />));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});
const enter = (id, answer) => act(() => {
  const inputs = container.querySelectorAll('input');
  Simulate.change(inputs[0], { target: { value: id } });
  Simulate.change(inputs[1], { target: { value: answer } });
});
const submit = () => act(async () => Simulate.submit(container.querySelector('form')));

test('correct CAPTCHA submits its server-issued token and displays the certificate', async () => {
  enter(' JMDS-TEST ', 'FD6JPL');
  await submit();
  expect(certificateAPI.verifyCertificate).toHaveBeenCalledWith({ certificateId: 'JMDS-TEST', captcha: 'FD6JPL', captchaToken: 'signed-token' });
  expect(container.textContent).toContain('Test Student');
  expect(container.textContent).toContain('Valid Certificate');
  expect(certificateAPI.getCaptcha).toHaveBeenCalledTimes(2);
  expect(container.querySelectorAll('input')[1].value).toBe('');
});
test('wrong CAPTCHA is rejected locally and a fresh challenge is loaded', async () => {
  enter('JMDS-TEST', 'WRONG1');
  await submit();
  expect(certificateAPI.verifyCertificate).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalledWith('Invalid captcha. Please try again.');
  expect(certificateAPI.getCaptcha).toHaveBeenCalledTimes(2);
});

test('mixed-case CAPTCHA is preserved and submitted exactly', async () => {
  certificateAPI.getCaptcha.mockResolvedValue({ data: { data: { captcha: 'AbC123', captchaToken: 'mixed-token' } } });
  await act(async () => container.querySelector('[aria-label="Refresh CAPTCHA"]').click());
  enter('JMDS-TEST', 'AbC123');
  expect(container.querySelectorAll('input')[1].value).toBe('AbC123');
  await submit();
  expect(certificateAPI.verifyCertificate).toHaveBeenCalledWith({ certificateId: 'JMDS-TEST', captcha: 'AbC123', captchaToken: 'mixed-token' });
});

test.each(['ABC123', 'abc123'])('wrong-case CAPTCHA %s is rejected locally', async answer => {
  certificateAPI.getCaptcha.mockResolvedValue({ data: { data: { captcha: 'AbC123', captchaToken: 'mixed-token' } } });
  await act(async () => container.querySelector('[aria-label="Refresh CAPTCHA"]').click());
  enter('JMDS-TEST', answer);
  expect(container.querySelectorAll('input')[1].value).toBe(answer);
  await submit();
  expect(certificateAPI.verifyCertificate).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalledWith('Invalid captcha. Please try again.');
});

test('public verification preserves mixed-case input in the API request', async () => {
  await act(async () => root.render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><CertificateVerify /></MemoryRouter>));
  enter('JMDS-TEST', 'AbC123');
  const input = container.querySelectorAll('input')[1];
  expect(input.value).toBe('AbC123');
  expect(input.getAttribute('autocapitalize')).toBe('none');
  await submit();
  expect(certificateAPI.verifyCertificate).toHaveBeenCalledWith({ certificateId: 'JMDS-TEST', captcha: 'AbC123', captchaToken: 'signed-token' });
});
test('expired server challenge displays a CAPTCHA error without labelling the certificate invalid', async () => {
  certificateAPI.verifyCertificate.mockRejectedValue({ response: { data: {
    message: 'CAPTCHA is incorrect or expired. Please refresh and try again.'
  } } });
  enter('JMDS-TEST', 'FD6JPL');
  await submit();
  expect(container.textContent).toContain('CAPTCHA is incorrect or expired');
  expect(container.textContent).not.toContain('Invalid Certificate');
  expect(certificateAPI.getCaptcha).toHaveBeenCalledTimes(2);
});
test('challenge load failure disables verification and refresh lets the student retry', async () => {
  certificateAPI.getCaptcha.mockRejectedValueOnce(new Error('Offline'));
  await act(async () => container.querySelector('[aria-label="Refresh CAPTCHA"]').click());
  expect(container.querySelector('[role="alert"]').textContent).toContain('Unable to load CAPTCHA');
  expect(container.querySelector('button[type="submit"]').disabled).toBe(true);
  await act(async () => container.querySelector('[aria-label="Refresh CAPTCHA"]').click());
  expect(container.querySelector('button[type="submit"]').disabled).toBe(false);
  expect(container.querySelector('[role="alert"]')).toBeNull();
});
test('an older challenge response cannot overwrite the current CAPTCHA and token', async () => {
  act(() => root.unmount());
  root = createRoot(container);
  let resolveOld;
  certificateAPI.getCaptcha.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
  await act(async () => root.render(<VerificationSection />));
  const reset = [...container.querySelectorAll('button')].find(button => button.textContent === 'Reset');
  await act(async () => reset.click());
  await act(async () => resolveOld({ data: { data: { captcha: 'OLD123', captchaToken: 'old-token' } } }));
  enter('JMDS-TEST', 'FD6JPL');
  await submit();
  expect(certificateAPI.verifyCertificate).toHaveBeenCalledWith(expect.objectContaining({ captchaToken: 'signed-token' }));
});
