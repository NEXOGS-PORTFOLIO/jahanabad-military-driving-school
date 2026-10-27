import { useSiteTranslation, translate as tr } from '../../hooks/useSiteTranslation';
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaArrowLeft, FaCalendarAlt } from 'react-icons/fa';
import { noticeAPI, resolveAssetUrl } from '../../utils/api';
import './NoticeDetail.css';

const NoticeDetail = () => {
  const { locale } = useSiteTranslation();
  const { slug } = useParams();
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNotice = async () => {
      try {
        const response = await noticeAPI.getNoticeBySlug(slug);
        setNotice(response.data.data);
        setError('');
      } catch (err) {
        setError('Notice not found or no longer available.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotice();
  }, [slug]);

  const formatDate = (date) => new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (loading) {
    return <div className="notice-detail-page container"><div className="notice-detail-state">{tr("Loading notice...")}</div></div>;
  }

  if (error || !notice) {
    return (
      <div className="notice-detail-page container">
        <div className="notice-detail-state">
          <h1>{tr(error)}</h1>
          <Link to="/notices" className="btn btn-primary">{tr("Back to Notices")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="notice-detail-page">
      <div className="container">
        <Link to="/notices" className="notice-back-link">
          <FaArrowLeft /> {tr("Back to Notices")}</Link>

        <article className="notice-detail-card">
          {notice.image?.url && (
            <img src={resolveAssetUrl(notice.image.url)} alt={notice.title} className="notice-detail-image" />
          )}

          <div className="notice-detail-content">
            <div className="notice-list-meta">
              <span className={`notice-badge badge-${notice.type.toLowerCase()}`}>
                {tr(notice.type)}
              </span>
              <span className="notice-date">
                <FaCalendarAlt /> {formatDate(notice.publishDate)}
              </span>
            </div>

            <h1>{notice.title}</h1>
            {notice.excerpt && <p className="notice-detail-excerpt">{notice.excerpt}</p>}
            <div className="notice-detail-body">
              {notice.content.split('\n').map((paragraph, index) => (
                <p key={`${paragraph}-${index}`}>{paragraph || '\u00a0'}</p>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default NoticeDetail;
