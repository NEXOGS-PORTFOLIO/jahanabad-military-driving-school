const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const middleware = require('../middleware/registrationDocuments');

test('registration validates document extensions, MIME types, contents and role', async t => {
  const app = express();
  app.post('/', middleware, (req, res) => res.json({ uploaded: Object.keys(req.files || {}) }));
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => server.close());
  const submit = async (filename, type, content, role = 'student') => {
    const form = new FormData();
    form.append('role', role);
    form.append('nidDocument', new Blob([content], { type }), filename);
    return fetch(`http://127.0.0.1:${server.address().port}/`, { method: 'POST', body: form });
  };
  for (const [name, type, content] of [
    ['id.PNG', 'image/png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])],
    ['id.jpg', 'image/jpeg', Buffer.from([255, 216, 255])],
    ['id.jpeg', 'image/jpeg', Buffer.from([255, 216, 255])],
    ['id.pdf', 'application/pdf', '%PDF-1.7']
  ]) assert.equal((await submit(name, type, content)).status, 200);
  assert.equal((await submit('id.gif', 'image/gif', 'GIF89a')).status, 400);
  assert.equal((await submit('id.pdf', 'image/png', '%PDF-1.7')).status, 400);
  assert.equal((await submit('id.pdf', 'application/pdf', 'invalid')).status, 400);
  assert.equal((await submit('id.pdf', 'application/pdf', '%PDF-1.7', 'instructor')).status, 400);
});
