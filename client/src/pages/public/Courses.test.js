import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import Courses from './Courses';
import i18n from '../../i18n';
import { courseAPI, batchAPI, enrollmentAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

jest.mock('../../utils/api', () => ({
  resolveAssetUrl: url => /^https?:\/\//.test(url) ? url : `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`,
  courseAPI: { getAllCourses: jest.fn() },
  batchAPI: { getAllBatches: jest.fn() },
  enrollmentAPI: { createEnrollment: jest.fn(), getMyEnrollments: jest.fn() }
}));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('react-toastify', () => ({ toast: { error: jest.fn(), info: jest.fn() } }));

const courses = [
  { _id: 'one', title: 'Custom Driving', description: 'First course', duration: '3 months', price: 12500, category: 'Driving', image: { url: '/course.jpg' } },
  { _id: 'two', title: 'Custom Driving Advanced', description: 'Second course', duration: '8 weeks', price: 0, category: 'Driving' },
  { _id: 'hidden', title: 'Inactive Course', description: '', duration: '1 week', price: 10, isActive: false }
];
let root, container;
beforeEach(() => {
  i18n.changeLanguage('en');
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { role: 'student' } });
  enrollmentAPI.getMyEnrollments.mockResolvedValue({ data: { data: [] } });
  global.IS_REACT_ACT_ENVIRONMENT = true;
  courseAPI.getAllCourses.mockResolvedValue({ data: { data: courses } });
  batchAPI.getAllBatches.mockResolvedValue({ data: { data: [
    { _id: 'b1', course: { _id: 'one' }, name: 'First batch', status: 'upcoming', capacity: 20 },
    { _id: 'b2', course: 'two', name: 'Second batch', status: 'ongoing', capacity: 30 },
    { _id: 'orphan', course: null, courseType: 'Driving', name: 'Unlinked batch', status: 'upcoming' }
  ] } });
  enrollmentAPI.createEnrollment.mockResolvedValue({ data: {} });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});
const render = (path = '/courses') => act(async () => root.render(
  <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Courses /></MemoryRouter>
));
const details = (id, status) => act(async () => container.querySelector(`[data-course-id="${id}"]${status ? `[data-course-status="${status}"]` : ''}`).click());
const back = () => act(async () => container.querySelector('.course-details-navigation button').click());

test('renders dashboard course details and filters by actual duration', async () => {
  await render();
  expect(courseAPI.getAllCourses).toHaveBeenCalledWith({ isActive: true });
  expect(container.querySelectorAll('article')).toHaveLength(2);
  expect(container.textContent).toContain('Custom Driving Advanced');
  expect(container.textContent).not.toContain('12,500');
  expect(container.querySelectorAll('.course-view-details')).toHaveLength(2);
  expect(container.querySelector('.course-batches-panel')).toBeNull();
  expect([...container.querySelectorAll('.course-group-heading')].map(item => item.textContent)).toEqual(['Upcoming', 'Ongoing']);
  expect(container.textContent).not.toContain('Inactive Course');
  expect(container.querySelector('article img').getAttribute('src')).toBe('http://localhost:5000/course.jpg');
  act(() => Simulate.change(container.querySelector('[aria-label="Filter by duration"]'), { target: { value: '8 weeks' } }));
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(container.querySelector('article h2').textContent).toBe('Custom Driving Advanced');
});

test('associates batches and enrollment with exact course IDs', async () => {
  await render();
  await details('one');
  const card = container.querySelector('article');
  const detailsCard = container.querySelector('.course-details-card');
  expect(detailsCard.contains(container.querySelector('.course-details-overview'))).toBe(true);
  expect(detailsCard.contains(card)).toBe(true);
  expect(card.querySelector('h2').textContent).toBe('Upcoming Batches');
  expect(card.textContent).toContain('First batch');
  expect(card.textContent).not.toContain('Second batch');
  expect(container.textContent).not.toContain('Unlinked batch');
  await act(async () => card.querySelector('button').click());
  expect(enrollmentAPI.createEnrollment).toHaveBeenCalledWith({ course: 'one', batch: 'b1' });
  await back();
  await details('two');
  expect(container.querySelector('article button')).toBeNull();
  expect(container.querySelector('article a').getAttribute('href')).toBe('/contact');
});

test('keeps courses visible if batch loading fails', async () => {
  batchAPI.getAllBatches.mockRejectedValue(new Error('offline'));
  await render();
  expect(container.querySelectorAll('article')).toHaveLength(2);
  expect(container.querySelector('[role="status"]').textContent).toContain('Batch schedules could not be loaded');
});

test('shows a retryable error for course failure and recovers', async () => {
  courseAPI.getAllCourses.mockRejectedValueOnce(new Error('offline'));
  await render();
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  await act(async () => container.querySelector('[role="alert"] button').click());
  expect(container.querySelectorAll('article')).toHaveLength(2);
});

test('shows the empty state without fabricated courses', async () => {
  courseAPI.getAllCourses.mockResolvedValue({ data: { data: [] } });
  await render();
  expect(container.querySelectorAll('article')).toHaveLength(0);
  expect(container.textContent).toContain(i18n.t('courses.noCourses'));
});

test('ongoing and completed sections show all matching batches and relevant actions', async () => {
  batchAPI.getAllBatches.mockResolvedValue({ data: { data: [
    { _id: 'old', course: 'one', name: 'Older active batch', status: 'ongoing', startDate: '2026-01-01' },
    { _id: 'new', course: 'one', name: 'Latest active batch', status: 'ongoing', startDate: '2026-10-01', endDate: '2026-10-31', capacity: 20 },
    { _id: 'c1', course: 'two', name: 'Older completed batch', status: 'completed', startDate: '2026-01-01' },
    { _id: 'c2', course: 'two', name: 'Latest completed batch', status: 'completed', startDate: '2026-09-01', capacity: 30 }
  ] } });
  await render();
  await details('one');
  const ongoing = container.querySelector('article');
  expect(ongoing.textContent).toContain('Latest active batch');
  expect(ongoing.querySelector('a').textContent).toBe('Contact Us');
  expect(ongoing.querySelector('.course-batch-details').textContent).toContain('Duration3 months');
  expect(ongoing.querySelector('.course-batch-details').textContent).toContain('End Date');
  expect(ongoing.querySelector('button')).toBeNull();
  expect(ongoing.textContent).not.toContain('Available Seats');
  expect(ongoing.textContent).toContain('Older active batch');
  expect(ongoing.querySelectorAll('.course-batch-item')).toHaveLength(2);
  await back();
  await details('two');
  const completed = container.querySelector('article');
  expect(completed.textContent).toContain('Latest completed batch');
  expect(container.textContent).not.toContain('Older active batch');
  expect(completed.textContent).toContain('Older completed batch');
  expect(completed.querySelectorAll('.course-batch-item')).toHaveLength(2);
  for (const card of [completed]) {
    expect(card.querySelector('.course-batch-details').textContent).toContain('Duration8 weeks');
    expect(card.querySelector('.course-batch-details').textContent).toContain('End Date');
    expect(card.querySelector('.course-stat-grid')).toBeNull();
    expect(card.querySelector('button')).toBeNull();
    expect(card.textContent).not.toContain('Available Seats');
  }
  expect(completed.querySelector('a')).toBeNull();
});

test('mixed-status course details show only the clicked section and enrollment targets its own batch', async () => {
  batchAPI.getAllBatches.mockResolvedValue({ data: { data: [
    { _id: 'ongoing', course: 'one', name: 'Current active', status: 'ongoing' },
    { _id: 'completed', course: 'one', name: 'Finished batch', status: 'completed' },
    { _id: 'later', course: 'one', name: 'Later upcoming', status: 'upcoming', startDate: '2026-12-01', capacity: 10, enrolledCount: 2, fee: 7500 },
    { _id: 'sooner', course: 'one', name: 'Sooner upcoming', status: 'upcoming', startDate: '2026-11-01', endDate: '2026-11-30', capacity: 10, enrolledCount: 9 },
    { _id: 'hidden', course: 'one', name: 'Unpublished', status: 'upcoming', isPublished: false },
    { _id: 'cancelled', course: 'one', name: 'Cancelled', status: 'cancelled' }
  ] } });
  await render();
  expect([...container.querySelectorAll('.course-group-heading')].map(item => item.textContent)).toEqual(['Upcoming', 'Ongoing', 'Completed', i18n.t('courses.scheduleNotPublished')]);
  await details('one');
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(container.querySelector('.course-ongoing')).toBeNull();
  expect(container.querySelector('.course-completed')).toBeNull();
  const card = container.querySelector('article');
  expect(card.querySelector('.course-status').textContent).toBe('Upcoming');
  expect(card.textContent).not.toContain('Current active');
  expect(card.textContent).not.toContain('Unpublished');
  expect(card.textContent).not.toContain('Cancelled');
  const options = card.querySelectorAll('.course-batch-item');
  expect(options).toHaveLength(2);
  expect(options[0].textContent).toContain('Sooner upcoming');
  expect(options[1].textContent).toContain('7,500');
  expect(options[1].textContent).toContain('Available Seats8');
  await act(async () => options[1].querySelector('button').click());
  expect(enrollmentAPI.createEnrollment).toHaveBeenCalledWith({ course: 'one', batch: 'later' });
});

test('full upcoming batches show no available seats and cannot be enrolled', async () => {
  batchAPI.getAllBatches.mockResolvedValue({ data: { data: [
    { _id: 'full', course: 'one', name: 'Full batch', status: 'upcoming', capacity: 10, enrolledCount: 11, vacancies: 0 }
  ] } });
  await render();
  await details('one');
  const button = container.querySelector('article button');
  expect(button.disabled).toBe(true);
  expect(button.textContent).toBe('Batch Full');
  expect(container.querySelector('article').textContent).toContain('Available Seats0');
});

test.each(['upcoming', 'ongoing', 'completed'])('View Details in %s shows only that status and returns focus to the same card', async status => {
  batchAPI.getAllBatches.mockResolvedValue({ data: { data: ['upcoming', 'ongoing', 'completed'].map(value => ({
    _id: value, course: 'one', name: `${value} batch`, status: value, capacity: 10
  })) } });
  await render();
  await details('one', status);
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(container.querySelector(`.course-${status}`)).not.toBeNull();
  for (const value of ['upcoming', 'ongoing', 'completed']) {
    expect(container.textContent.includes(`${value} batch`)).toBe(value === status);
  }
  await back();
  expect(document.activeElement).toBe(container.querySelector(`[data-course-id="one"][data-course-status="${status}"]`));
});

test.each(['upcoming', 'ongoing', 'completed'])('direct details URL preserves the %s status', async status => {
  batchAPI.getAllBatches.mockResolvedValue({ data: { data: ['upcoming', 'ongoing', 'completed'].map(value => ({
    _id: value, course: 'one', name: `${value} batch`, status: value, capacity: 10
  })) } });
  await render(`/courses?course=one&status=${status}`);
  expect(container.querySelectorAll('.course-batch-item')).toHaveLength(1);
  expect(container.querySelector('.course-batch-item > span').textContent).toBe(`${status} batch`);
});

test('invalid details status does not expose batches from another section', async () => {
  await render('/courses?course=one&status=invalid');
  expect(container.querySelectorAll('.course-batch-item')).toHaveLength(0);
});

test.each(['ongoing', 'completed'])('%s details show duration and each batch end date with a fallback for missing dates', async status => {
  batchAPI.getAllBatches.mockResolvedValue({ data: { data: [
    { _id: 'dated', course: 'one', name: 'Dated batch', status, startDate: '2026-01-01', endDate: '2026-11-30' },
    { _id: 'undated', course: 'one', name: 'Undated batch', status }
  ] } });
  await render();
  expect(container.querySelector('.course-batch-details')).toBeNull();
  await details('one', status);
  const blocks = container.querySelectorAll('.course-batch-details');
  expect(blocks).toHaveLength(2);
  expect([...blocks[0].querySelectorAll('dt')].map(item => item.textContent)).toEqual(['Duration', 'End Date']);
  expect([...blocks[0].querySelectorAll('dd')].map(item => item.textContent)).toEqual([
    '3 months', new Date('2026-11-30').toLocaleDateString('en-BD')
  ]);
  expect(blocks[1].textContent).toContain(i18n.t('courses.dateTba'));
  expect(container.querySelector('article').textContent).not.toContain('Available Seats');
});

test('selected section removes batches whose stored status changes without showing another status', async () => {
  const records = [
    { _id: 'u', course: 'one', name: 'Future batch', status: 'upcoming', startDate: '2020-01-01' },
    { _id: 'o', course: 'one', name: 'Current batch', status: 'ongoing', startDate: '2099-01-01' },
    { _id: 'c', course: 'one', name: 'Finished batch', status: 'completed' },
    { _id: 'x', course: 'one', name: 'Cancelled batch', status: 'cancelled' },
    { _id: 'unknown', course: 'one', name: 'Unknown status batch' }
  ];
  batchAPI.getAllBatches.mockResolvedValue({ data: { data: records } });
  await render('/courses?course=one&status=upcoming');
  const names = status => [...container.querySelectorAll(`.course-${status} .course-batch-item > span`)].map(item => item.textContent);
  expect(names('upcoming')).toEqual(['Future batch']);
  expect(names('ongoing')).toEqual([]);
  expect(names('completed')).toEqual([]);
  expect(container.textContent).not.toContain('Cancelled batch');
  expect(container.textContent).not.toContain('Unknown status batch');
  batchAPI.getAllBatches.mockResolvedValue({ data: { data: records.map(batch => ({
    ...batch, status: batch._id === 'u' ? 'ongoing' : batch._id === 'o' ? 'completed' : batch.status
  })) } });
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  expect(names('upcoming')).toEqual([]);
  expect(names('ongoing')).toEqual([]);
  expect(names('completed')).toEqual([]);
  expect(container.textContent).toContain(i18n.t('courses.noBatches'));
});

test('status filters include courses with matching batches even when other statuses also exist', async () => {
  batchAPI.getAllBatches.mockResolvedValue({ data: { data: [
    { _id: 'past', course: 'one', name: 'Past', status: 'completed' },
    { _id: 'future', course: 'one', name: 'Future', status: 'upcoming' },
    { _id: 'done', course: 'two', name: 'Done', status: 'completed' }
  ] } });
  await render();
  act(() => Simulate.change(container.querySelector('[aria-label="Filter by batch status"]'), { target: { value: 'completed' } }));
  expect(container.querySelectorAll('article')).toHaveLength(2);
  expect([...container.querySelectorAll('article h2')].map(item => item.textContent)).toEqual(['Custom Driving', 'Custom Driving Advanced']);
  await details('one');
  expect(container.textContent).toContain('Past');
  expect(container.textContent).not.toContain('Future');
  await back();
  act(() => Simulate.change(container.querySelector('[aria-label="Filter by batch status"]'), { target: { value: 'upcoming' } }));
  expect(container.querySelector('article h2').textContent).toBe('Custom Driving');
});

test('returning to the page refreshes batches without switching the selected Upcoming section', async () => {
  await render();
  await details('one');
  batchAPI.getAllBatches.mockResolvedValue({ data: { data: [
    { _id: 'b1', course: 'one', name: 'First batch', status: 'ongoing' }
  ] } });
  await act(async () => window.dispatchEvent(new Event('focus')));
  const card = container.querySelector('article');
  expect(card.querySelector('.course-status').textContent).toBe('Upcoming');
  expect(card.querySelector('button')).toBeNull();
  expect(card.querySelector('a')).toBeNull();
  expect(card.textContent).not.toContain('First batch');
});

test('back navigation retains list filters and returns keyboard focus to View Details', async () => {
  await render();
  act(() => Simulate.change(container.querySelector('[aria-label="Filter by batch status"]'), { target: { value: 'upcoming' } }));
  await details('one');
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(container.querySelector('.course-filter-panel')).toBeNull();
  expect(document.activeElement).toBe(container.querySelector('#course-details-title'));
  await back();
  expect(container.querySelector('[aria-label="Filter by batch status"]').value).toBe('upcoming');
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(container.querySelector('.course-batches-panel')).toBeNull();
  expect(document.activeElement).toBe(container.querySelector('[data-course-id="one"]'));
});

test('details URL opens the selected course directly', async () => {
  await render('/courses?course=two');
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(container.querySelector('#course-details-title').textContent).toBe('Custom Driving Advanced');
  expect(container.textContent).toContain('Second batch');
  expect(container.textContent).not.toContain('First batch');
});

test('unavailable details URL offers a way back to the course list', async () => {
  await render('/courses?course=removed');
  expect(container.textContent).toContain('This course is no longer available.');
  await back();
  expect(container.querySelectorAll('article')).toHaveLength(2);
});

test('uploaded image replaces the course icon, with icon fallback for missing and broken images', async () => {
  await render();
  const [uploaded, missing] = container.querySelectorAll('article');
  expect(uploaded.querySelector('img').alt).toBe('Custom Driving');
  expect(uploaded.querySelector('.course-icon')).toBeNull();
  expect(missing.querySelector('img')).toBeNull();
  expect(missing.querySelector('.course-icon')).not.toBeNull();
  act(() => Simulate.error(uploaded.querySelector('img')));
  expect(uploaded.querySelector('img')).toBeNull();
  expect(uploaded.querySelector('.course-icon')).not.toBeNull();
  courseAPI.getAllCourses.mockResolvedValue({ data: { data: [
    { ...courses[0], image: { url: 'https://res.cloudinary.com/jmds/new-course.jpg' } }, courses[1]
  ] } });
  await act(async () => window.dispatchEvent(new Event('focus')));
  expect(uploaded.querySelector('img').getAttribute('src')).toBe('https://res.cloudinary.com/jmds/new-course.jpg');
  expect(uploaded.querySelector('.course-icon')).toBeNull();
  await details('one');
  expect(container.querySelector('.course-details-overview img').getAttribute('src')).toBe('https://res.cloudinary.com/jmds/new-course.jpg');
  expect(container.querySelector('.course-details-overview .course-icon')).toBeNull();
});

test('public course details use the logged-in student’s enrollment to disable repeat applications', async () => {
  useAuth.mockReturnValue({ user: { _id: 'student', role: 'student' } });
  enrollmentAPI.getMyEnrollments.mockResolvedValue({ data: { data: [{ course: 'one', batch: 'b1', status: 'completed' }] } });
  await render('/courses?course=one');
  const button = container.querySelector('article button');
  expect(button.textContent).toBe('Already Enrolled');
  expect(button.disabled).toBe(true);
  await act(async () => button.click());
  expect(enrollmentAPI.createEnrollment).not.toHaveBeenCalled();
});
