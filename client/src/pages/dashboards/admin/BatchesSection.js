import { useSiteTranslation, translate as tr } from '../../../hooks/useSiteTranslation';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaEdit, FaLayerGroup, FaPlus, FaTimes, FaTrash } from 'react-icons/fa';
import api from '../../../utils/api';

const emptyForm = {
  name: '',
  batchNo: '',
  course: '',
  assignedInstructors: [],
  courseType: '',
  vehicleTypes: '',
  capacity: 10,
  fee: '',
  startDate: '',
  endDate: '',
  schedule: '',
  status: 'upcoming',
  notes: '',
  isPublished: true
};

const BatchesSection = () => {
  const { locale } = useSiteTranslation();
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [filters, setFilters] = useState({
    course: 'all',
    status: 'all',
    search: ''
  });
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchesRes, coursesRes, instructorsRes] = await Promise.all([
        api.get('/batches/admin/all'),
        api.get('/courses'),
        api.get('/users/instructors')
      ]);
      setBatches(batchesRes.data.data || []);
      setCourses(coursesRes.data.data || []);
      setInstructors(instructorsRes.data.data || []);
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to fetch batch data")));
    } finally {
      setLoading(false);
    }
  };

  const openModal = (batch = null) => {
    if (batch) {
      setEditingBatch(batch);
      setFormData({
        name: batch.name || batch.batchNumber || '',
        batchNo: batch.batchNo || '',
        course: batch.course?._id || '',
        assignedInstructors: (batch.assignedInstructors || batch.instructors || []).map(item => item._id),
        courseType: batch.courseType || '',
        vehicleTypes: batch.vehicleTypes?.join(', ') || '',
        capacity: batch.capacity || 10,
        fee: batch.fee || '',
        startDate: batch.startDate ? batch.startDate.slice(0, 10) : '',
        endDate: batch.endDate ? batch.endDate.slice(0, 10) : '',
        schedule: batch.schedule || '',
        status: batch.status === 'planned' ? 'upcoming' : batch.status === 'active' ? 'ongoing' : batch.status || 'upcoming',
        notes: batch.notes || '',
        isPublished: batch.isPublished !== false
      });
    } else {
      setEditingBatch(null);
      setFormData(emptyForm);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBatch) {
        await api.put(`/batches/${editingBatch._id}`, formData);
        toast.success(tr("Batch updated successfully"));
      } else {
        await api.post('/batches', formData);
        toast.success(tr("Batch created successfully"));
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to save batch")));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(tr("Delete this batch? Only empty batches can be deleted."))) return;
    try {
      await api.delete(`/batches/${id}`);
      toast.success(tr("Batch deleted successfully"));
      fetchData();
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to delete batch")));
    }
  };

  const handleTogglePublish = async (id) => {
    try {
      await api.patch(`/batches/${id}/toggle-publish`);
      toast.success(tr("Batch publish status updated"));
      fetchData();
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to update publish status")));
    }
  };

  const handleInstructorToggle = (id) => {
    const current = formData.assignedInstructors;
    const next = current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id];
    setFormData({ ...formData, assignedInstructors: next });
  };

  const filteredBatches = batches.filter(batch => {
    const matchesCourse = filters.course === 'all' || batch.course?._id === filters.course;
    const matchesStatus = filters.status === 'all' || batch.status === filters.status;
    const searchText = `${batch.name || batch.batchNumber} ${batch.course?.title || ''} ${batch.courseType || ''} ${batch.assignedInstructors?.map(item => item.name).join(' ') || batch.instructors?.map(item => item.name).join(' ') || ''}`.toLowerCase();
    const matchesSearch = searchText.includes(filters.search.toLowerCase());
    return matchesCourse && matchesStatus && matchesSearch;
  });

  if (loading) return <div>{tr("Loading...")}</div>;

  return (
    <div className="section">
      <div className="section-header">
        <h1>{tr("Batches")}</h1>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <FaPlus /> {tr("Create Batch")}</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><h3>{batches.length}</h3><p>{tr("Total Batches")}</p></div>
        <div className="stat-card"><h3>{batches.filter(batch => batch.status === 'ongoing' || batch.status === 'active').length}</h3><p>{tr("Ongoing Batches")}</p></div>
        <div className="stat-card"><h3>{batches.reduce((sum, batch) => sum + (batch.enrolledCount || 0), 0)}</h3><p>{tr("Enrolled Students")}</p></div>
        <div className="stat-card"><h3>{batches.filter(batch => batch.status === 'completed').length}</h3><p>{tr("Completed Batches")}</p></div>
      </div>

      <div className="search-filter-bar">
        <input className="form-control" placeholder={tr("Search batches...")} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <select className="form-control" value={filters.course} onChange={(e) => setFilters({ ...filters, course: e.target.value })}>
          <option value="all">{tr("All Courses")}</option>
          {courses.map(course => <option key={course._id} value={course._id}>{course.title}</option>)}
        </select>
        <select className="form-control" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="all">{tr("All Status")}</option>
          <option value="upcoming">{tr("Upcoming")}</option>
          <option value="ongoing">{tr("Ongoing")}</option>
          <option value="completed">{tr("Completed")}</option>
          <option value="cancelled">{tr("Cancelled")}</option>
        </select>
      </div>

      <div className="batch-card-grid">
        {filteredBatches.map(batch => (
          <div key={batch._id} className="batch-card">
            <div className="batch-card-header">
              <div>
                <h3><FaLayerGroup /> {batch.name || batch.batchNumber}</h3>
                <p>{batch.course?.title || tr("No course assigned")} {batch.courseType ? `| ${batch.courseType}` : ''}</p>
              </div>
              <span className={`status-badge ${batch.status}`}>{tr(batch.status)}</span>
            </div>
            <div className="batch-card-body">
              <div><strong>{tr("Instructors:")}</strong> {(batch.assignedInstructors || batch.instructors)?.map(item => item.name).join(', ') || tr("Unassigned")}</div>
              <div><strong>{tr("Students:")}</strong> {batch.enrolledCount || 0} / {batch.capacity}</div>
              <div><strong>{tr("Completed:")}</strong> {batch.completedCount || 0}</div>
              <div><strong>{tr("Vacancies:")}</strong> {batch.vacancies}</div>
              <div><strong>{tr("Fee:")}</strong> ৳{batch.fee || batch.course?.price || 0}</div>
              <div><strong>{tr("Published:")}</strong> {batch.isPublished ? tr("Yes") : tr("No")}</div>
              <div><strong>{tr("Schedule:")}</strong> {batch.schedule || tr("Not set")}</div>
              <div><strong>{tr("Start:")}</strong> {batch.startDate ? new Date(batch.startDate).toLocaleDateString(locale) : tr("Not set")}</div>
              <div><strong>{tr("End:")}</strong> {batch.endDate ? new Date(batch.endDate).toLocaleDateString(locale) : tr("Not set")}</div>
            </div>
            <div className="batch-card-actions">
              <button className="btn btn-small btn-secondary" onClick={() => openModal(batch)}><FaEdit /> {tr("Edit")}</button>
              <button className="btn btn-small btn-warning" onClick={() => handleTogglePublish(batch._id)}>{batch.isPublished ? tr("Unpublish") : tr("Publish")}</button>
              <button className="btn btn-small btn-danger" onClick={() => handleDelete(batch._id)}><FaTrash /> {tr("Delete")}</button>
            </div>
          </div>
        ))}
      </div>

      {filteredBatches.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '10px' }}>{tr("No batches found.")}</div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingBatch ? tr("Edit Batch") : tr("Create Batch")}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{tr("Batch Name")}</label>
                <input className="form-control" placeholder={tr("e.g., Driving Training Course-6")} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{tr("Batch Number")}</label>
                <input className="form-control" placeholder={tr("e.g., 6")} value={formData.batchNo} onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{tr("Course")}</label>
                <select className="form-control" value={formData.course} onChange={(e) => setFormData({ ...formData, course: e.target.value })} required>
                  <option value="">{tr("Select course")}</option>
                  {courses.map(course => <option key={course._id} value={course._id}>{course.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>{tr("Instructors")}</label>
                <div className="checkbox-grid">
                  {instructors.map(instructor => (
                    <label key={instructor._id}>
                      <input type="checkbox" checked={formData.assignedInstructors.includes(instructor._id)} onChange={() => handleInstructorToggle(instructor._id)} />
                      {instructor.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>{tr("Course Type")}</label>
                <input className="form-control" placeholder={tr("Light Vehicle")} value={formData.courseType} onChange={(e) => setFormData({ ...formData, courseType: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{tr("Vehicle Types")}</label>
                <input className="form-control" placeholder={tr("Private Car, Jeep, Microbus")} value={formData.vehicleTypes} onChange={(e) => setFormData({ ...formData, vehicleTypes: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{tr("Capacity")}</label>
                <input className="form-control" type="number" min="1" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })} required />
              </div>
              <div className="form-group">
                <label>{tr("Fee")}</label>
                <input className="form-control" type="number" min="0" value={formData.fee} onChange={(e) => setFormData({ ...formData, fee: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>{tr("Start Date")}</label>
                <input className="form-control" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{tr("End Date")}</label>
                <input className="form-control" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{tr("Schedule")}</label>
                <input className="form-control" placeholder={tr("e.g., Sun-Tue 9:00 AM")} value={formData.schedule} onChange={(e) => setFormData({ ...formData, schedule: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{tr("Status")}</label>
                <select className="form-control" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="upcoming">{tr("Upcoming")}</option>
                  <option value="ongoing">{tr("Ongoing")}</option>
                  <option value="completed">{tr("Completed")}</option>
                  <option value="cancelled">{tr("Cancelled")}</option>
                </select>
              </div>
              <label className="publish-checkbox">
                <input type="checkbox" checked={formData.isPublished} onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })} />{tr("Publish this batch")}</label>
              <div className="form-group">
                <label>{tr("Notes")}</label>
                <textarea className="form-control" rows="3" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{tr("Cancel")}</button>
                <button type="submit" className="btn btn-primary">{editingBatch ? tr("Update") : tr("Create")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchesSection;
