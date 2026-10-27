import axios from 'axios';

const getDefaultApiUrl = () => {
  if (process.env.NODE_ENV === 'production') return '/api';
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:5000/api`;
  }

  return 'http://localhost:5000/api';
};

const API_URL = process.env.REACT_APP_API_URL || getDefaultApiUrl();
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    // Let the browser provide the multipart boundary for file uploads.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      config.headers['Content-Type'] = undefined;
    }
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.response?.data?.code === 'AUTH_REQUIRED') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// API functions
export const authAPI = {
  register: (data) => api.post('/auth/register', data, data instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  verifyResetOTP: (data) => api.post('/auth/verify-reset-otp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data)
};

export const userAPI = {
  getAllUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  uploadAvatar: (id, formData) => api.put(`/users/${id}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getInstructors: () => api.get('/users/instructors')
};

export const courseAPI = {
  getAllCourses: (params) => api.get('/courses', { params }),
  getCourse: (id) => api.get(`/courses/${id}`),
  createCourse: (formData) => api.post('/courses', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateCourse: (id, formData) => api.put(`/courses/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteCourse: (id) => api.delete(`/courses/${id}`),
  toggleCourseStatus: (id) => api.patch(`/courses/${id}/toggle-status`)
};

export const enrollmentAPI = {
  getAllEnrollments: (params) => api.get('/enrollments', { params }),
  getEnrollment: (id) => api.get(`/enrollments/${id}`),
  createEnrollment: (data) => api.post('/enrollments', data),
  updateEnrollmentStatus: (id, data) => api.put(`/enrollments/${id}/status`, data),
  markAttendance: (id, data) => api.post(`/enrollments/${id}/attendance`, data),
  updateProgress: (id, data) => api.put(`/enrollments/${id}/progress`, data),
  getMyEnrollments: () => api.get('/enrollments/my-enrollments'),
  getMyStudents: () => api.get('/enrollments/my-students')
};

export const certificateAPI = {
  getAllCertificates: (params) => api.get('/certificates', { params }),
  getCertificate: (id) => api.get(`/certificates/${id}`),
  verifyCertificate: (data) => api.post('/certificates/verify', data),
  getCaptcha: () => api.get('/certificates/captcha'),
  revokeCertificate: (id, data) => api.put(`/certificates/${id}/revoke`, data),
  getMyCertificates: () => api.get('/certificates/my-certificates')
};

export const contactAPI = {
  submitContactForm: (data) => api.post('/contact', data),
  getAllContacts: (params) => api.get('/contact', { params }),
  updateContactStatus: (id, data) => api.put(`/contact/${id}`, data),
  deleteContact: (id) => api.delete(`/contact/${id}`)
};

export const referenceCodeAPI = {
  getAllReferenceCodes: () => api.get('/reference-codes'),
  createReferenceCode: (data) => api.post('/reference-codes', data),
  deactivateReferenceCode: (id) => api.patch(`/reference-codes/${id}/deactivate`)
};

export const batchAPI = {
  getAllBatches: (params) => api.get('/batches', { params }),
  adminGetAllBatches: (params) => api.get('/batches/admin/all', { params }),
  getMyBatches: () => api.get('/batches/my-batches'),
  getBatch: (id) => api.get(`/batches/${id}`),
  createBatch: (data) => api.post('/batches', data),
  updateBatch: (id, data) => api.put(`/batches/${id}`, data),
  deleteBatch: (id) => api.delete(`/batches/${id}`),
  toggleBatchPublish: (id) => api.patch(`/batches/${id}/toggle-publish`),
  updateBatchStatus: (id, status) => api.patch(`/batches/${id}/status`, { status })
};

export const noticeAPI = {
  getNotices: (params) => api.get('/notices', { params }),
  getNoticeBySlug: (slug) => api.get(`/notices/${slug}`),
  adminGetAllNotices: (params) => api.get('/notices/admin/all', { params }),
  adminCreateNotice: (formData) => api.post('/notices', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  adminUpdateNotice: (id, formData) => api.put(`/notices/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  adminDeleteNotice: (id) => api.delete(`/notices/${id}`),
  adminToggleNoticePublish: (id) => api.patch(`/notices/${id}/toggle-publish`)
};
