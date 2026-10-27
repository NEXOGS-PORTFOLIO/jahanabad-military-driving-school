import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import i18n from './i18n';
import { translate } from './hooks/useSiteTranslation';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import InstructorDashboard from './pages/dashboards/InstructorDashboard';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import RegistrationSuccess from './components/RegistrationSuccess';
import Home from './pages/public/Home';
import About from './pages/public/About';
import Courses from './pages/public/Courses';
import Gallery from './pages/public/Gallery';
import Notices from './pages/public/Notices';
import NoticeDetail from './pages/public/NoticeDetail';
import CertificateVerify from './pages/public/CertificateVerify';
import Contact from './pages/public/Contact';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import Users from './pages/dashboards/admin/UsersSection';
import AdminCourses from './pages/dashboards/admin/CoursesSection';
import Batches from './pages/dashboards/admin/BatchesSection';
import AdminEnrollments from './pages/dashboards/admin/EnrollmentsSection';
import AdminCertificates from './pages/dashboards/admin/CertificatesSection';
import AdminNotices from './pages/dashboards/admin/NoticesSection';
import AdminStudents from './pages/dashboards/admin/StudentsSection';
import Instructors from './pages/dashboards/admin/InstructorsSection';
import AssignedCourses from './pages/dashboards/instructor/AssignedCoursesSection';
import InstructorStudents from './pages/dashboards/instructor/StudentsSection';
import Attendance from './pages/dashboards/instructor/AttendanceSection';
import Progress from './pages/dashboards/instructor/ProgressSection';
import Enrollments from './pages/dashboards/student/EnrollmentsSection';
import Certificates from './pages/dashboards/student/CertificatesSection';
import Profile from './pages/dashboards/student/ProfileSection';
import Verification from './pages/dashboards/student/VerificationSection';
import { useAuth } from './context/AuthContext';
import api from './utils/api';
import { toast } from 'react-toastify';

jest.mock('./context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('./utils/api', () => {
  const list = () => Promise.resolve({ data: { data: [] } });
  return {
    __esModule: true,
    default: { get: jest.fn(list), post: jest.fn(), put: jest.fn(), patch: jest.fn() },
    courseAPI: { getAllCourses: list }, batchAPI: { getAllBatches: list },
    certificateAPI: { getCaptcha: () => Promise.resolve({ data: { data: { captcha: 'AB1234', captchaToken: 'signed-test-token' } } }) },
    noticeAPI: { getNotices: list, adminGetAllNotices: list,
      getNoticeBySlug: () => Promise.resolve({ data: { data: {
        title: 'User supplied title', content: 'User supplied text', type: 'Announcement', publishDate: '2026-09-23'
      } } }) },
    authAPI: {}, enrollmentAPI: {}, contactAPI: {}, resolveAssetUrl: url => url
  };
});

let root, container;
beforeEach(async () => {
  jest.clearAllMocks();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  await i18n.changeLanguage('en');
  useAuth.mockReturnValue({ user: { _id: 'student', name: 'Rahim', role: 'student' }, logout: jest.fn(), clearRegistrationSuccess: jest.fn() });
  api.get.mockResolvedValue({ data: { data: [] } });
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});
const render = Component => act(async () => root.render(
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Component /></MemoryRouter>
));

test.each([
  ['Home', Home, 'home.title'], ['About', About, 'about.title'],
  ['Courses', Courses, 'courses.title'], ['Gallery', Gallery, 'gallery.title'],
  ['Notices', Notices, 'notices.title'], ['CertificateVerify', CertificateVerify, 'certification.title'],
  ['Contact', Contact, 'contact.title']
])('%s public page responds to both language changes', async (_, Component, key) => {
  await render(Component);
  for (const language of ['bn', 'en']) {
    await act(async () => i18n.changeLanguage(language));
    expect(container.textContent).toContain(i18n.t(key));
    expect(document.documentElement.lang).toBe(language);
  }
});

test.each([
  ['Login', Login], ['Create Account', Register], ['Forgot Password', ForgotPassword],
  ['Users Management', Users], ['Courses Management', AdminCourses], ['Batches', Batches],
  ['Enrollments Management', AdminEnrollments], ['Certificates Management', AdminCertificates],
  ['Notices Management', AdminNotices], ['Students', AdminStudents], ['Instructors', Instructors],
  ['My Batches & Assigned Courses', AssignedCourses], ['My Students', InstructorStudents],
  ['Mark Attendance', Attendance], ['Student Progress', Progress], ['My Enrollments', Enrollments],
  ['My Certificate IDs', Certificates], ['My Profile', Profile], ['Verify My Certificate', Verification],
  ['Back to Notices', NoticeDetail]
])('%s switches its existing page content without a reload', async (heading, Component) => {
  await render(Component);
  expect(container.textContent).toContain(heading);
  await act(async () => i18n.changeLanguage('bn'));
  expect(container.textContent).toContain(translate(heading));
  expect(container.textContent).not.toContain(heading);
  await act(async () => i18n.changeLanguage('en'));
  expect(container.textContent).toContain(heading);
});

test('navbar toggle preserves form input, persists preference, and synchronizes tabs', async () => {
  await render(() => <><Navbar /><Login /></>);
  const email = container.querySelector('input[name="email"]');
  act(() => Simulate.change(email, { target: { name: 'email', value: 'rahim@example.com' } }));
  await act(async () => container.querySelector('.language-toggle-btn').click());
  expect(container.querySelector('h1').textContent).toBe('লগইন');
  expect(email.value).toBe('rahim@example.com');
  expect(localStorage.getItem('language')).toBe('bn');
  await act(async () => window.dispatchEvent(new StorageEvent('storage', { key: 'language', newValue: 'en' })));
  expect(container.querySelector('h1').textContent).toBe('Login');
  expect(document.documentElement.lang).toBe('en');
});

test('dashboard modal translates labels while submitting unchanged field values', async () => {
  await render(AdminCourses);
  await act(async () => i18n.changeLanguage('bn'));
  act(() => container.querySelector('.section-header button').click());
  expect(container.querySelector('.modal-header').textContent).toContain('নতুন কোর্স যোগ করুন');
  const inputs = container.querySelectorAll('.modal-content input');
  act(() => Simulate.change(inputs[0], { target: { value: 'Custom course' } }));
  act(() => Simulate.change(container.querySelector('textarea'), { target: { value: 'Custom description' } }));
  act(() => Simulate.change(inputs[1], { target: { value: '3 months' } }));
  act(() => Simulate.change(inputs[2], { target: { value: '5000' } }));
  api.post.mockResolvedValue({ data: {} });
  await act(async () => Simulate.submit(container.querySelector('form')));
  const [url, data] = api.post.mock.calls[0];
  expect(url).toBe('/courses');
  expect(data.get('title')).toBe('Custom course');
  expect(data.get('duration')).toBe('3 months');
  expect(data.get('price')).toBe('5000');
  expect(toast.success).toHaveBeenCalledWith('কোর্স সফলভাবে তৈরি হয়েছে');
});

test('registration dialog updates while open and retains the student name', async () => {
  useAuth.mockReturnValue({ user: { _id: 'student', name: 'Rahim', role: 'student' }, registrationSuccess: 'student', clearRegistrationSuccess: jest.fn() });
  await render(RegistrationSuccess);
  await act(async () => i18n.changeLanguage('bn'));
  expect(container.querySelector('dialog').textContent).toContain('প্রিয় Rahim,');
  expect(container.querySelector('button').textContent).toBe('এনরোল');
  await act(async () => i18n.changeLanguage('en'));
  expect(container.querySelector('dialog').textContent).toContain('Dear Rahim,');
});

test('gallery caption updates while the lightbox is open', async () => {
  await render(Gallery);
  act(() => container.querySelector('.gallery-item').click());
  await act(async () => i18n.changeLanguage('bn'));
  expect(container.querySelector('.image-title').textContent).toContain('প্রশিক্ষণ কার্যক্রম');
  await act(async () => i18n.changeLanguage('en'));
  expect(container.querySelector('.image-title').textContent).toBe('Training Session 1');
});

test('API messages, punctuation keys, interpolation, and user data remain correct', async () => {
  await act(async () => i18n.changeLanguage('bn'));
  expect(translate('Invalid credentials')).toBe('ইমেইল বা পাসওয়ার্ড সঠিক নয়');
  expect(translate('Address:')).toBe('ঠিকানা:');
  expect(translate('Dear {{name}},', { name: 'Rahim' })).toBe('প্রিয় Rahim,');
  expect(translate('User supplied text')).toBe('User supplied text');
});

test.each([
  [AdminDashboard, 'Administrator'], [InstructorDashboard, 'Teaching Panel'], [StudentDashboard, 'Learning Portal']
])('dashboard navigation follows the selected language', async (Component, label) => {
  await render(Component);
  await act(async () => i18n.changeLanguage('bn'));
  expect(container.querySelector('aside').textContent).toContain(translate(label));
  await act(async () => i18n.changeLanguage('en'));
  expect(container.querySelector('aside').textContent).toContain(label);
});

test('footer and notice dates follow the selected language', async () => {
  await render(() => <><NoticeDetail /><Footer /></>);
  await act(async () => i18n.changeLanguage('bn'));
  expect(container.querySelector('.notice-date').textContent).toContain(
    new Date('2026-09-23').toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })
  );
  expect(container.querySelector('footer').textContent).toContain('উন্নয়নে');
  await act(async () => i18n.changeLanguage('en'));
  expect(container.querySelector('footer').textContent).toContain('Developed By');
});

test('language switching still works when storage is disabled', async () => {
  const storage = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  try {
    await render(Login);
    await act(async () => i18n.changeLanguage('bn'));
    expect(container.querySelector('h1').textContent).toBe('লগইন');
  } finally {
    storage.mockRestore();
  }
});
