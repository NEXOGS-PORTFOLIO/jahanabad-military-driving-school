import { useSiteTranslation, translate as tr } from '../../../hooks/useSiteTranslation';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaCheck, FaTimes, FaUserTie } from 'react-icons/fa';
import api from '../../../utils/api';
import ProgressComments from '../../../components/ProgressComments';
import EnrollmentDocuments from './EnrollmentDocuments';

const PAGE_SIZE = 5;

const EnrollmentsSection = () => {
  const { locale } = useSiteTranslation();
  const [enrollments, setEnrollments] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [documentEnrollment, setDocumentEnrollment] = useState(null);

  useEffect(() => {
    fetchEnrollments();
    fetchInstructors();
    fetchBatches();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const response = await api.get('/enrollments');
      setEnrollments(response.data.data);
      setLoading(false);
    } catch (error) {
      toast.error(tr("Failed to fetch enrollments"));
      setLoading(false);
    }
  };

  const fetchInstructors = async () => {
    try {
      const response = await api.get('/users/instructors');
      setInstructors(response.data.data);
    } catch (error) {
      console.error('Failed to fetch instructors');
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await api.get('/batches/admin/all');
      setBatches(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch batches');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/enrollments/${id}/status`, { status: 'approved' });
      toast.success(tr("Enrollment approved successfully"));
      fetchEnrollments();
    } catch (error) {
      toast.error(tr("Failed to approve enrollment"));
    }
  };

  const handleReject = async (id) => {
    if (window.confirm(tr("Are you sure you want to reject this enrollment?"))) {
      try {
        await api.put(`/enrollments/${id}/status`, { status: 'rejected' });
        toast.success(tr("Enrollment rejected"));
        fetchEnrollments();
      } catch (error) {
        toast.error(tr("Failed to reject enrollment"));
      }
    }
  };

  const openAssignModal = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setSelectedInstructor(enrollment.instructor?._id || '');
    setSelectedBatch(enrollment.batch?._id || '');
    setShowAssignModal(true);
  };

  const handleAssignInstructor = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/enrollments/${selectedEnrollment._id}/status`, {
        status: 'approved',
        instructor: selectedInstructor,
        batch: selectedBatch
      });
      toast.success(tr("Instructor assigned successfully"));
      fetchEnrollments();
      setShowAssignModal(false);
    } catch (error) {
      toast.error(tr("Failed to assign instructor"));
    }
  };

  const filteredEnrollments = enrollments.filter(enrollment =>
    statusFilter === 'all' || enrollment.status === statusFilter
  );
  const totalPages = Math.max(1, Math.ceil(filteredEnrollments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleEnrollments = filteredEnrollments.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setPage(previousPage => Math.min(previousPage, totalPages));
  }, [totalPages]);

  const availableBatches = batches.filter(batch =>
    !selectedEnrollment?.course?._id || batch.course?._id === selectedEnrollment.course._id
  );

  if (loading) return <div>{tr("Loading...")}</div>;

  return (
    <div className="section">
      <div className="section-header">
        <h1>{tr("Enrollments Management")}</h1>
      </div>

      <div className="search-filter-bar">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="form-control"
        >
          <option value="all">{tr("All Status")}</option>
          <option value="pending">{tr("Pending")}</option>
          <option value="approved">{tr("Approved")}</option>
          <option value="rejected">{tr("Rejected")}</option>
          <option value="completed">{tr("Completed")}</option>
        </select>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>{tr("Student")}</th>
              <th>{tr("Course")}</th>
              <th>{tr("Instructor")}</th>
              <th>{tr("Batch")}</th>
              <th>{tr("Status")}</th>
              <th>{tr("Progress")}</th>
              <th>{tr("Progress Comments")}</th>
              <th>{tr("Enrolled Date")}</th>
              <th>{tr("Documents")}</th>
              <th>{tr("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {visibleEnrollments.map(enrollment => (
              <tr key={enrollment._id}>
                <td>{enrollment.student?.name || tr("N/A")}</td>
                <td>{enrollment.course?.title || tr("N/A")}</td>
                <td>{enrollment.instructor?.name || tr("Not Assigned")}</td>
                <td>
                  {enrollment.batch?.name || enrollment.batch?.batchNumber || tr("Unassigned")}
                  {enrollment.batch?.startDate && (
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      {new Date(enrollment.batch.startDate).toLocaleDateString(locale)} - {enrollment.batch.endDate ? new Date(enrollment.batch.endDate).toLocaleDateString(locale) : tr("TBA")}
                    </div>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${enrollment.status}`}>
                    {tr(enrollment.status)}
                  </span>
                </td>
                <td>{enrollment.progress}%</td>
                <td><ProgressComments comments={enrollment.progressComments} /></td>
                <td>{new Date(enrollment.createdAt).toLocaleDateString(locale)}</td>
                <td><button type="button" className="btn btn-small btn-secondary" disabled={!enrollment.student?._id}
                  onClick={() => setDocumentEnrollment(enrollment)}>{tr('Upload / View')}</button></td>
                <td>
                  <div className="action-buttons">
                    {enrollment.status === 'pending' && (
                      <>
                        <button 
                          className="btn btn-small btn-success" 
                          onClick={() => handleApprove(enrollment._id)}
                        >
                          <FaCheck />
                        </button>
                        <button 
                          className="btn btn-small btn-danger" 
                          onClick={() => handleReject(enrollment._id)}
                        >
                          <FaTimes />
                        </button>
                      </>
                    )}
                    {(enrollment.status === 'approved' || enrollment.status === 'pending') && (
                      <button 
                        className="btn btn-small btn-secondary" 
                        onClick={() => openAssignModal(enrollment)}
                      >
                        <FaUserTie /> {enrollment.instructor || enrollment.batch ? tr("Change") : tr("Assign")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredEnrollments.length === 0 && (
              <tr><td colSpan={10}>{tr("No enrollments found.")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredEnrollments.length > 0 && (
        <nav className="dashboard-pagination" aria-label={tr("Enrollments pagination")}>
          <p role="status">{tr('Showing {{start}}–{{end}} of {{total}} enrollments', {
            start: (pageStart + 1).toLocaleString(locale),
            end: Math.min(pageStart + PAGE_SIZE, filteredEnrollments.length).toLocaleString(locale),
            total: filteredEnrollments.length.toLocaleString(locale)
          })}</p>
          <div className="dashboard-pagination-controls">
            <button type="button" className="btn btn-secondary" disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}>{tr("Previous")}</button>
            <span>{tr('Page {{page}} of {{total}}', {
              page: currentPage.toLocaleString(locale), total: totalPages.toLocaleString(locale)
            })}</span>
            <button type="button" className="btn btn-primary" disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}>{tr("Next")}</button>
          </div>
        </nav>
      )}

      {documentEnrollment && <EnrollmentDocuments enrollment={documentEnrollment} onClose={() => setDocumentEnrollment(null)} />}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{tr("Assign Instructor")}</h2>
              <button className="close-btn" onClick={() => setShowAssignModal(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleAssignInstructor}>
              <div className="form-group">
                <label>{tr("Select Batch")}</label>
                <select
                  className="form-control"
                  value={selectedBatch}
                  onChange={(e) => {
                    const batchId = e.target.value;
                    setSelectedBatch(batchId);
                    const batch = availableBatches.find(item => item._id === batchId);
                    if (batch?.instructors?.length > 0 && !selectedInstructor) {
                      setSelectedInstructor(batch.instructors[0]._id);
                    }
                  }}
                >
                  <option value="">{tr("No batch yet")}</option>
                  {availableBatches.map(batch => (
                    <option key={batch._id} value={batch._id}>
                      {batch.name || batch.batchNumber} - {batch.vacancies} {tr("vacancies")}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{tr("Select Instructor")}</label>
                <select
                  className="form-control"
                  value={selectedInstructor}
                  onChange={(e) => setSelectedInstructor(e.target.value)}
                  required
                >
                  <option value="">{tr("Choose an instructor...")}</option>
                  {instructors.map(instructor => (
                    <option key={instructor._id} value={instructor._id}>
                      {instructor.name} - {instructor.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>{tr("Cancel")}</button>
                <button type="submit" className="btn btn-primary">{tr("Assign")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnrollmentsSection;
