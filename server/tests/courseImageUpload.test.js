const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Course = require('../models/Course');
const events = [];
let uploadFailure;
const cloudinaryPath = require.resolve('../utils/cloudinary');
require.cache[cloudinaryPath] = { id: cloudinaryPath, filename: cloudinaryPath, loaded: true, exports: {
  uploadToCloudinary: async buffer => {
    events.push('upload');
    assert.equal(buffer.toString(), 'image bytes');
    if (uploadFailure) throw uploadFailure;
    return { public_id: 'new-image', url: 'https://images.example.com/new.jpg' };
  },
  deleteFromCloudinary: async id => { events.push(`delete:${id}`); }
} };
const { updateCourse } = require('../controllers/courseController');
const originalFind = Course.findById;
const originalUpdate = Course.findByIdAndUpdate;
afterEach(() => {
  Course.findById = originalFind;
  Course.findByIdAndUpdate = originalUpdate;
  events.length = 0;
  uploadFailure = undefined;
});
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const current = { image: { public_id: 'old-image', url: 'https://images.example.com/old.jpg' } };
const request = () => ({ params: { id: 'course' }, body: { title: 'Driving' }, file: { buffer: Buffer.from('image bytes') } });

test('image replacement saves the new URL before removing the previous asset', async () => {
  Course.findById = async () => current;
  Course.findByIdAndUpdate = async (id, updates) => {
    events.push('save');
    assert.equal(updates.image.url, 'https://images.example.com/new.jpg');
    return { ...current, ...updates };
  };
  const res = response();
  await updateCourse(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.image.public_id, 'new-image');
  assert.deepEqual(events, ['upload', 'save', 'delete:old-image']);
});
test('failed image upload preserves the previous asset and does not update the course', async () => {
  Course.findById = async () => current;
  Course.findByIdAndUpdate = () => assert.fail('Failed upload must not be saved');
  uploadFailure = new Error('Image provider unavailable');
  const res = response();
  await updateCourse(request(), res);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(events, ['upload']);
});
test('editing without selecting an image preserves the current image', async () => {
  Course.findById = async () => current;
  Course.findByIdAndUpdate = async (id, updates) => {
    assert.equal(updates.image, undefined);
    return { ...current, ...updates };
  };
  const res = response();
  await updateCourse({ params: { id: 'course' }, body: { title: 'New title' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.image.public_id, 'old-image');
  assert.deepEqual(events, []);
});
