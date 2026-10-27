import PageHero from '../../components/layout/PageHero';
import { useSiteTranslation, translate as tr } from '../../hooks/useSiteTranslation';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCalendarAlt, FaSearch } from 'react-icons/fa';
import { noticeAPI, resolveAssetUrl } from '../../utils/api';
import './Notices.css';

const Notices = () => {
  const { locale } = useSiteTranslation();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const noticeTypes = ['All', 'Announcement', 'Update', 'Notice'];
  const noticeTypeLabels = {
    All: t('notices.all'),
    Announcement: t('notices.announcement'),
    Update: t('notices.update'),
    Notice: t('notices.notice')
  };

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const response = await noticeAPI.getNotices();
        setNotices(response.data.data || []);
        setError('');
      } catch (err) {
        setError('notices.error');
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, []);

  const formatDate = (date) => new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const filteredNotices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notices.filter((notice) => {
      const matchesType = type === 'All' || notice.type === type;
      const matchesSearch = !query ||
        notice.title.toLowerCase().includes(query) ||
        notice.content.toLowerCase().includes(query) ||
        (notice.excerpt || '').toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });
  }, [notices, type, search]);

  return (
    <div className="notices-page">
      <PageHero title={t('notices.title')} subtitle={t('notices.subtitle')} />

      <section className="notices-content">
        <div className="container">
          <div className="notices-toolbar">
            <div className="notice-search">
              <FaSearch />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('notices.searchPlaceholder')}
                aria-label={tr("Search notices by title")}
              />
            </div>

            <div className="notice-filter-buttons" aria-label={tr("Filter notices by type")}>
              {noticeTypes.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={type === item ? 'active' : ''}
                  onClick={() => setType(item)}
                >
                  {noticeTypeLabels[item]}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="notices-empty">
              <h2>{t('notices.loading')}</h2>
            </div>
          ) : error ? (
            <div className="notices-empty error-state">
              <h2>{t(error)}</h2>
            </div>
          ) : filteredNotices.length === 0 ? (
            <div className="notices-empty">
              <h2>{t('notices.empty')}</h2>
              <p>{t('notices.emptyText')}</p>
            </div>
          ) : (
            <div className="notices-list">
              {filteredNotices.map((notice) => (
                <article className="notice-list-card" key={notice._id}>
                  {notice.image?.url && (
                    <img src={resolveAssetUrl(notice.image.url)} alt={notice.title} className="notice-list-image" />
                  )}
                  <div className="notice-list-content">
                    <div className="notice-list-meta">
                      <span className={`notice-badge badge-${notice.type.toLowerCase()}`}>
                        {tr(notice.type)}
                      </span>
                      <span className="notice-date">
                        <FaCalendarAlt /> {formatDate(notice.publishDate)}
                      </span>
                    </div>
                    <h2>{notice.title}</h2>
                    <p className="notice-excerpt">{notice.excerpt || notice.content}</p>
                    <p className="notice-body">{notice.content}</p>
                    <Link to={`/notices/${notice.slug}`} className="notice-read-more">{t('common.readMore')}</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Notices;
