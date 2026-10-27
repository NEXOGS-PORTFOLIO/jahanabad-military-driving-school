import { useSiteTranslation, translate as tr } from '../../../hooks/useSiteTranslation';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaPlus,
  FaTrash,
  FaTimes
} from 'react-icons/fa';
import { noticeAPI, resolveAssetUrl } from '../../../utils/api';

const emptyForm = {
  title: '',
  type: 'Announcement',
  content: '',
  excerpt: '',
  publishDate: '',
  isPublished: true,
  image: null
};

const NoticesSection = () => {
  const { locale } = useSiteTranslation();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const response = await noticeAPI.adminGetAllNotices();
      setNotices(response.data.data || []);
    } catch (error) {
      toast.error(tr("Failed to fetch notices"));
    } finally {
      setLoading(false);
    }
  };

  const formatDateInput = (date) => {
    if (!date) return '';
    return new Date(date).toISOString().slice(0, 10);
  };

  const formatDisplayDate = (date) => new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const openModal = (notice = null) => {
    if (notice) {
      setEditingNotice(notice);
      setFormData({
        title: notice.title || '',
        type: notice.type || 'Announcement',
        content: notice.content || '',
        excerpt: notice.excerpt || '',
        publishDate: formatDateInput(notice.publishDate),
        isPublished: Boolean(notice.isPublished),
        image: null
      });
    } else {
      setEditingNotice(null);
      setFormData({
        ...emptyForm,
        publishDate: new Date().toISOString().slice(0, 10)
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingNotice(null);
    setFormData(emptyForm);
  };

  const validateForm = () => {
    if (!formData.title.trim()) return 'Title is required';
    if (!formData.type) return 'Type is required';
    if (!formData.content.trim()) return 'Content is required';
    if (!formData.publishDate) return 'Publish date is required';
    return null;
  };

  const buildFormData = () => {
    const data = new FormData();
    data.append('title', formData.title);
    data.append('type', formData.type);
    data.append('content', formData.content);
    data.append('excerpt', formData.excerpt);
    data.append('publishDate', formData.publishDate);
    data.append('isPublished', formData.isPublished);
    if (formData.image) {
      data.append('image', formData.image);
    }
    return data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast.error(tr(validationError));
      return;
    }

    setSubmitting(true);
    try {
      const data = buildFormData();
      if (editingNotice) {
        await noticeAPI.adminUpdateNotice(editingNotice._id, data);
        toast.success(tr("Notice updated successfully"));
      } else {
        await noticeAPI.adminCreateNotice(data);
        toast.success(tr("Notice created successfully"));
      }

      await fetchNotices();
      closeModal();
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Notice operation failed")));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (notice) => {
    if (!window.confirm(tr("Delete \"{{v0}}\"?", { v0: notice.title }))) return;

    try {
      await noticeAPI.adminDeleteNotice(notice._id);
      toast.success(tr("Notice deleted successfully"));
      fetchNotices();
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to delete notice")));
    }
  };

  const handleTogglePublish = async (notice) => {
    try {
      await noticeAPI.adminToggleNoticePublish(notice._id);
      toast.success(tr("Notice {{v0}} successfully", { v0: tr(notice.isPublished ? 'unpublished' : 'published') }));
      fetchNotices();
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to update publish status")));
    }
  };

  const filteredNotices = notices.filter((notice) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      notice.title.toLowerCase().includes(query) ||
      notice.content.toLowerCase().includes(query) ||
      (notice.excerpt || '').toLowerCase().includes(query);
    const matchesType = typeFilter === 'All' || notice.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (loading) return <div>{tr("Loading...")}</div>;

  return (
    <div className="section notices-admin-section">
      <div className="section-header">
        <h1>{tr("Notices Management")}</h1>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <FaPlus /> {tr("Add Notice")}</button>
      </div>

      <div className="search-filter-bar">
        <input
          type="text"
          placeholder={tr("Search notices...")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-control"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="form-control"
        >
          <option value="All">{tr("All Types")}</option>
          <option value="Announcement">{tr("Announcement")}</option>
          <option value="Update">{tr("Update")}</option>
          <option value="Notice">{tr("Notice")}</option>
        </select>
      </div>

      {filteredNotices.length === 0 ? (
        <div className="admin-empty-state">{tr("No notices found.")}</div>
      ) : (
        <div className="admin-notice-grid">
          {filteredNotices.map((notice) => (
            <article className="admin-notice-card" key={notice._id}>
              <div className="admin-notice-thumb">
                {notice.image?.url ? (
                  <img src={resolveAssetUrl(notice.image.url)} alt={notice.title} />
                ) : (
                  <span>{tr("No Image")}</span>
                )}
              </div>

              <div className="admin-notice-body">
                <div className="admin-notice-meta">
                  <span className={`status-badge ${notice.isPublished ? 'active' : 'inactive'}`}>
                    {notice.isPublished ? tr("Published") : tr("Unpublished")}
                  </span>
                  <span className="admin-notice-type">{tr(notice.type)}</span>
                </div>
                <h3>{notice.title}</h3>
                <p>{notice.excerpt || notice.content}</p>
                <div className="admin-notice-date">{tr("Publish Date:")} {formatDisplayDate(notice.publishDate)}
                </div>
              </div>

              <div className="admin-notice-actions">
                <button className="btn btn-small btn-secondary" onClick={() => openModal(notice)} title={tr("Edit")}>
                  <FaEdit /> {tr("Edit")}</button>
                <button
                  className={`btn btn-small ${notice.isPublished ? 'btn-warning' : 'btn-success'}`}
                  onClick={() => handleTogglePublish(notice)}
                  title={notice.isPublished ? tr("Unpublish") : tr("Publish")}
                >
                  {notice.isPublished ? <FaEyeSlash /> : <FaEye />}
                  {notice.isPublished ? tr("Unpublish") : tr("Publish")}
                </button>
                <button className="btn btn-small btn-danger" onClick={() => handleDelete(notice)} title={tr("Delete")}>
                  <FaTrash /> {tr("Delete")}</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content notice-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingNotice ? tr("Edit Notice") : tr("Add New Notice")}</h2>
              <button className="close-btn" onClick={closeModal}><FaTimes /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{tr("Title *")}</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{tr("Type *")}</label>
                  <select
                    className="form-control"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="Announcement">{tr("Announcement")}</option>
                    <option value="Update">{tr("Update")}</option>
                    <option value="Notice">{tr("Notice")}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{tr("Publish Date *")}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.publishDate}
                    onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{tr("Excerpt")}</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>{tr("Content *")}</label>
                <textarea
                  className="form-control"
                  rows="7"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>{tr("Image")} {editingNotice && tr("(leave blank to keep current)")}</label>
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, image: e.target.files[0] || null })}
                />
              </div>

              <label className="publish-checkbox">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                />{tr("Publish this notice")}</label>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>{tr("Cancel")}</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? tr("Saving...") : editingNotice ? tr("Update Notice") : tr("Create Notice")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticesSection;
