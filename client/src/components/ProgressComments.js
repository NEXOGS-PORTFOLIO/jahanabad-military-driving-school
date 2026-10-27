import { useSiteTranslation, translate as tr } from '../hooks/useSiteTranslation';
import React from 'react';

const ProgressComments = ({ comments = [] }) => {
  const { locale } = useSiteTranslation();
  if (!comments.length) return <span>{tr("No progress comments yet.")}</span>;

  return (
    <details style={{ minWidth: '200px', maxWidth: '420px' }}>
      <summary style={{ cursor: 'pointer' }}>{tr("Progress comments (")}{comments.length})</summary>
      <div style={{ maxHeight: '280px', overflowY: 'auto', marginTop: '0.75rem' }}>
        {[...comments].reverse().map((comment, index) => (
          <article key={comment._id || index} style={{ padding: '0.75rem 0', borderBottom: '1px solid #ddd' }}>
            <strong>{comment.authorName || tr("Instructor")}</strong>
            <div style={{ fontSize: '0.85rem' }}>
              {new Date(comment.createdAt).toLocaleString(locale)} · {comment.progress}{tr("% progress")}</div>
            <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: '0.5rem 0 0' }}>{comment.text}</p>
          </article>
        ))}
      </div>
    </details>
  );
};

export default ProgressComments;
