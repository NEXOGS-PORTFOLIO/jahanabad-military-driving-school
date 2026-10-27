import i18n from '../i18n';
beforeEach(() => i18n.changeLanguage('en'));
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ProgressComments from './ProgressComments';

test('old enrollments show an empty history', () => {
  expect(renderToStaticMarkup(<ProgressComments />)).toContain('No progress comments yet.');
});

test('shared dashboard history shows newest first, attribution, progress, and escaped text', () => {
  const comments = [
    { _id: '1', text: 'Earlier feedback', authorName: 'Instructor Karim', progress: 40, createdAt: '2026-09-18T10:00:00Z' },
    { _id: '2', text: '<script>Latest feedback</script>', authorName: 'Instructor Karim', progress: 60, createdAt: '2026-09-19T10:00:00Z' }
  ];
  const html = renderToStaticMarkup(<ProgressComments comments={comments} />);
  expect(html).toContain('Progress comments (2)');
  expect(html).toContain('Instructor Karim');
  expect(html).toContain('60% progress');
  expect(html).toContain('&lt;script&gt;');
  expect(html.indexOf('Latest feedback')).toBeLessThan(html.indexOf('Earlier feedback'));
  expect(comments[0]._id).toBe('1');
});
