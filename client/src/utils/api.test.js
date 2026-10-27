jest.mock('axios', () => ({
  create: () => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  })
}));

const api = require('./api').default;
const rejectResponse = api.interceptors.response.use.mock.calls[0][1];
const prepareRequest = api.interceptors.request.use.mock.calls[0][0];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'existing-session');
});

test.each([
  ['/auth/login', { message: 'Invalid credentials' }],
  ['/auth/login', { isUnverified: true, email: 'test@example.com' }],
  ['/auth/change-password', { message: 'Current password is incorrect' }]
])('401 from %s preserves form errors and the session', async (url, data) => {
  const error = { config: { url }, response: { status: 401, data } };
  await expect(rejectResponse(error)).rejects.toBe(error);
  expect(localStorage.getItem('token')).toBe('existing-session');
});

test('expired authentication clears the saved session', async () => {
  // jsdom logs its unsupported navigation operation; session behavior is still testable.
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  const error = { response: { status: 401, data: { code: 'AUTH_REQUIRED' } } };
  try {
    await expect(rejectResponse(error)).rejects.toBe(error);
    expect(localStorage.getItem('token')).toBeNull();
  } finally {
    consoleError.mockRestore();
  }
});

test('file uploads keep FormData and clear the JSON header so the browser adds a multipart boundary', () => {
  const data = new FormData();
  const image = new File(['image bytes'], 'course.png', { type: 'image/png' });
  data.append('image', image);
  const request = prepareRequest({ data, headers: { 'Content-Type': 'application/json' } });
  expect(request.data).toBe(data);
  expect(request.data.get('image')).toBe(image);
  expect(request.headers['Content-Type']).toBeUndefined();
  expect(request.headers.Authorization).toBe('Bearer existing-session');
});
test('ordinary requests retain their JSON content type', () => {
  const request = prepareRequest({ data: { title: 'Driving' }, headers: { 'Content-Type': 'application/json' } });
  expect(request.headers['Content-Type']).toBe('application/json');
});
