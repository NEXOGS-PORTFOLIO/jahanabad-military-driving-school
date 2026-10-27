import { useSiteTranslation, translate as tr } from '../../../hooks/useSiteTranslation';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaEdit, FaToggleOn, FaToggleOff, FaPlus, FaTimes, FaTrash } from 'react-icons/fa';
import api, { resolveAssetUrl } from '../../../utils/api';

const CoursesSection = () => {
  useSiteTranslation();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: '',
    price: '',
    image: null
  });

  useEffect(() => {
    fetchCourses();
  }, []);
  useEffect(() => {
    if (!formData.image) {
      setImagePreview(editingCourse?.image?.url ? resolveAssetUrl(editingCourse.image.url) : '');
      return;
    }
    const preview = URL.createObjectURL(formData.image);
    setImagePreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [formData.image, editingCourse]);
  const handleImageChange = e => {
    const image = e.target.files?.[0];
    if (image && (!image.type.startsWith('image/') || image.size > 5 * 1024 * 1024)) {
      toast.error(tr('Please select an image no larger than 5 MB.'));
      e.target.value = '';
      setFormData(current => ({ ...current, image: null }));
      return;
    }
    setFormData(current => ({ ...current, image: image || null }));
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data.data);
      setLoading(false);
    } catch (error) {
      toast.error(tr("Failed to fetch courses"));
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('duration', formData.duration);
      data.append('price', formData.price);
      if (formData.image) {
        data.append('image', formData.image);
      }

      if (editingCourse) {
        await api.put(`/courses/${editingCourse._id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success(tr("Course updated successfully"));
      } else {
        await api.post('/courses', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success(tr("Course created successfully"));
      }
      fetchCourses();
      closeModal();
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Operation failed")));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await api.patch(`/courses/${id}/toggle-status`);
      toast.success(tr("Course {{v0}} successfully", { v0: tr(currentStatus ? 'deactivated' : 'activated') }));
      fetchCourses();
    } catch (error) {
      toast.error(tr("Failed to update course status"));
    }
  };

  const handleDelete = async (course) => {
    if (deletingId || !window.confirm(tr('Delete course "{{v0}}"? This action cannot be undone.', { v0: course.title }))) return;
    setDeletingId(course._id);
    try {
      await api.delete(`/courses/${course._id}`);
      setCourses(current => current.filter(item => item._id !== course._id));
      toast.success(tr("Course deleted successfully"));
    } catch (error) {
      toast.error(tr(error.response?.data?.message || "Failed to delete course"));
    } finally {
      setDeletingId(null);
    }
  };

  const openModal = (course = null) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        title: course.title,
        description: course.description,
        duration: course.duration,
        price: course.price,
        image: null
      });
    } else {
      setEditingCourse(null);
      setFormData({
        title: '',
        description: '',
        duration: '',
        price: '',
        image: null
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCourse(null);
    setFormData(current => ({ ...current, image: null }));
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div>{tr("Loading...")}</div>;

  return (
    <div className="section">
      <div className="section-header">
        <h1>{tr("Courses Management")}</h1>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <FaPlus /> {tr("Add Course")}</button>
      </div>

      <div className="search-filter-bar">
        <input
          type="text"
          placeholder={tr("Search courses...")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-control"
        />
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>{tr("Title")}</th>
              <th>{tr("Duration")}</th>
              <th>{tr("Price")}</th>
              <th>{tr("Status")}</th>
              <th>{tr("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map(course => (
              <tr key={course._id}>
                <td>{course.title}</td>
                <td>{course.duration}</td>
                <td>৳{course.price}</td>
                <td>
                  <span className={`status-badge ${course.isActive ? 'active' : 'inactive'}`}>
                    {course.isActive ? tr("Active") : tr("Inactive")}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn btn-small btn-secondary" onClick={() => openModal(course)}>
                      <FaEdit />
                    </button>
                    <button 
                      className={`btn btn-small ${course.isActive ? 'btn-warning' : 'btn-success'}`}
                      onClick={() => handleToggleStatus(course._id, course.isActive)}
                    >
                      {course.isActive ? <FaToggleOff /> : <FaToggleOn />}
                    </button>
                    <button
                      type="button"
                      className="btn btn-small btn-danger"
                      onClick={() => handleDelete(course)}
                      disabled={deletingId !== null}
                      title={tr("Delete")}
                      aria-label={tr("Delete course {{v0}}", { v0: course.title })}
                      aria-busy={deletingId === course._id}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCourse ? tr("Edit Course") : tr("Add New Course")}</h2>
              <button className="close-btn" disabled={saving} onClick={closeModal}><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{tr("Title")}</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>{tr("Description")}</label>
                <textarea
                  className="form-control"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="4"
                  required
                />
              </div>
              <div className="form-group">
                <label>{tr("Duration")}</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={tr("e.g., 3 months")}
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>{tr("Price (৳)")}</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>{tr("Image")} {editingCourse && tr("(leave blank to keep current)")}</label>
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={saving}
                />
                <small>{tr('Maximum image size: 5 MB.')}</small>
                {imagePreview && <img src={imagePreview} alt={tr('Course image preview')} style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'contain', background: '#edf3e7', borderRadius: '6px', marginTop: '0.75rem' }} />}
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={closeModal}>{tr("Cancel")}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? tr('Saving...') : editingCourse ? tr("Update") : tr("Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesSection;
