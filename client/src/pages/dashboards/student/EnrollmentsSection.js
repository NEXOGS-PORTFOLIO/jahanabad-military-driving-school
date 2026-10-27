import { useSiteTranslation, translate as tr } from '../../../hooks/useSiteTranslation';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../../../utils/api';
import ProgressComments from '../../../components/ProgressComments';
import EnrollmentSuccess from '../../../components/EnrollmentSuccess';
import { useAuth } from '../../../context/AuthContext';
import { hasEnrollment } from '../../../utils/enrollmentStatus';

const EnrollmentsSection = () => {
  const { locale } = useSiteTranslation();
  const [enrollments, setEnrollments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [applyingBatch, setApplyingBatch] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const { user } = useAuth();
  const studentId = user?._id;
  const requests = useRef(0);
  const applying = useRef(false);

  const fetchEnrollments = useCallback(async () => {
    const request = ++requests.current;
    try {
      const [response, batchesResponse] = await Promise.all([
        api.get('/enrollments/my-enrollments'),
        api.get('/batches', { params: { status: 'upcoming' } })
      ]);
      if (request !== requests.current) return;
      setEnrollments(response.data.data || []);
      setBatches(batchesResponse.data.data || []);
      setLoadError(false);
      setLoading(false);
    } catch (error) {
      if (request !== requests.current) return;
      setLoadError(true);
      toast.error(tr("Failed to fetch enrollments"));
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const sequence = requests;
    setEnrollments([]);
    setBatches([]);
    setLoading(true);
    fetchEnrollments();
    window.addEventListener('focus', fetchEnrollments);
    return () => { sequence.current++; window.removeEventListener('focus', fetchEnrollments); };
  }, [studentId, fetchEnrollments]);

  const handleApply = async (batch) => {
    if (applying.current || loadError || hasEnrollment(enrollments, batch.course, batch)) return;
    applying.current = true;
    setApplyingBatch(batch._id);
    try {
      const response = await api.post('/enrollments', { course: batch.course?._id, batch: batch._id });
      setConfirmation(response.data.confirmation);
      setEnrollments(current => [...current, response.data.data || {
        _id: `applied-${batch._id}`, course: batch.course, batch, status: 'pending', progress: 0, createdAt: new Date().toISOString()
      }]);
      await fetchEnrollments();
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to submit enrollment request")));
      await fetchEnrollments();
    } finally {
      applying.current = false;
      setApplyingBatch('');
    }
  };

  const filteredEnrollments = enrollments.filter(enrollment =>
    statusFilter === 'all' || enrollment.status === statusFilter
  );

  if (loading) return <div>{tr("Loading...")}</div>;
  if (loadError) return <div role="alert"><p>{tr('Failed to fetch enrollments')}</p><button className="btn btn-primary" onClick={fetchEnrollments}>{tr('Try again')}</button></div>;

  return (
    <div className="section">
      {confirmation && <EnrollmentSuccess confirmation={confirmation} onClose={() => setConfirmation(null)} />}
      <div className="section-header">
        <h1>{tr("My Enrollments")}</h1>
      </div>

      <div className="search-filter-bar">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-control"
        >
          <option value="all">{tr("All Status")}</option>
          <option value="pending">{tr("Pending")}</option>
          <option value="approved">{tr("Approved")}</option>
          <option value="rejected">{tr("Rejected")}</option>
          <option value="completed">{tr("Completed")}</option>
        </select>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{enrollments.filter(e => e.status === 'pending').length}</h3>
          <p>{tr("Pending")}</p>
        </div>
        <div className="stat-card">
          <h3>{enrollments.filter(e => e.status === 'approved').length}</h3>
          <p>{tr("Approved")}</p>
        </div>
        <div className="stat-card">
          <h3>{enrollments.filter(e => e.status === 'completed').length}</h3>
          <p>{tr("Completed")}</p>
        </div>
        <div className="stat-card">
          <h3>{enrollments.length}</h3>
          <p>{tr("Total")}</p>
        </div>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>{tr("Course")}</th>
              <th>{tr("Instructor")}</th>
              <th>{tr("Batch")}</th>
              <th>{tr("Batch Dates")}</th>
              <th>{tr("Vehicle Type")}</th>
              <th>{tr("Progress")}</th>
              <th>{tr("Attendance")}</th>
              <th>{tr("Progress Comments")}</th>
              <th>{tr("Status")}</th>
              <th>{tr("Enrolled Date")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEnrollments.map(enrollment => (
              <tr key={enrollment._id}>
                <td>{enrollment.course?.title || tr("N/A")}</td>
                <td>{enrollment.instructor?.name || tr("Not Assigned")}</td>
                <td>
                  {enrollment.batch?.name || enrollment.batch?.batchNumber || tr("Not Assigned")}
                  {enrollment.batch?.schedule && (
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      {enrollment.batch.schedule}
                    </div>
                  )}
                </td>
                <td>
                  {enrollment.batch?.startDate
                    ? `${new Date(enrollment.batch.startDate).toLocaleDateString(locale)} - ${enrollment.batch.endDate ? new Date(enrollment.batch.endDate).toLocaleDateString(locale) : tr("TBA")}`
                    : tr("Not Assigned")}
                  {enrollment.batch?.status && (
                    <div><span className={`status-badge ${enrollment.batch.status}`}>{tr(enrollment.batch.status)}</span></div>
                  )}
                </td>
                <td>{enrollment.batch?.courseType || enrollment.batch?.vehicleTypes?.join(', ') || tr("N/A")}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flex: 1, background: '#e0e0e0', borderRadius: '10px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${enrollment.progress}%`, 
                          height: '20px', 
                          background: 'var(--primary-color)',
                          transition: 'width 0.3s'
                        }}
                      />
                    </div>
                    <span>{enrollment.progress}%</span>
                  </div>
                </td>
                <td>{enrollment.attendance?.filter(a => a.status === 'present').length || 0} {tr("days")}</td>
                <td><ProgressComments comments={enrollment.progressComments} /></td>
                <td>
                  <span className={`status-badge ${enrollment.status}`}>
                    {tr(enrollment.status)}
                  </span>
                </td>
                <td>{new Date(enrollment.createdAt).toLocaleDateString(locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {enrollments.length === 0 && (
        <p>{tr("No enrollments found. Enroll in courses from the Courses menu.")}</p>
      )}

      <div style={{ marginTop: '2rem' }}>
        <div className="section-header">
          <h1>{tr("Available Batches / Apply for Training")}</h1>
        </div>
        <div className="batch-card-grid">
          {batches.map(batch => (
            <div key={batch._id} className="batch-card">
              <div className="batch-card-header">
                <div>
                  <h3>{batch.name || batch.batchNumber}</h3>
                  <p>{batch.course?.title || tr("Course")} | {batch.courseType || tr("Training")}</p>
                </div>
                <span className={`status-badge ${batch.status}`}>{tr(batch.status)}</span>
              </div>
              <div className="batch-card-body">
                <div><strong>{tr("Dates:")}</strong> {batch.startDate ? new Date(batch.startDate).toLocaleDateString(locale) : tr("TBA")} - {batch.endDate ? new Date(batch.endDate).toLocaleDateString(locale) : tr("TBA")}</div>
                <div><strong>{tr("Seats:")}</strong> {batch.enrolledCount || 0} / {batch.capacity}</div>
                <div><strong>{tr("Fee:")}</strong> ৳{batch.fee || batch.course?.price || 0}</div>
                <div><strong>{tr("Vehicles:")}</strong> {batch.vehicleTypes?.join(', ') || tr("N/A")}</div>
              </div>
              <button className="btn btn-primary" onClick={() => handleApply(batch)} disabled={hasEnrollment(enrollments, batch.course, batch) || !!applyingBatch || (batch.vacancies !== undefined && batch.vacancies <= 0)}>
                {hasEnrollment(enrollments, batch.course, batch) ? tr('Already Enrolled') : applyingBatch === batch._id ? tr("Applying...") : tr("Apply for Training")}
              </button>
            </div>
          ))}
        </div>
        {batches.length === 0 && <p>{tr("No upcoming batches available at the moment.")}</p>}
      </div>
    </div>
  );
};

export default EnrollmentsSection;
