import { useSiteTranslation, translate as tr } from '../../../hooks/useSiteTranslation';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FaDownload, FaPlus, FaTimes } from 'react-icons/fa';
import api from '../../../utils/api';
import { downloadFile } from '../../../utils/exportHelpers';
import StudentProfile from './StudentProfile';

const PAGE_SIZE = 5;

const StudentsSection = () => {
  const { locale } = useSiteTranslation();
  const [users, setUsers] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    course: 'all',
    batch: 'all',
    status: 'all',
    verification: 'all',
    certification: 'all'
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, enrollmentsRes, certificatesRes, coursesRes, batchesRes] = await Promise.all([
        api.get('/users', { params: { role: 'student' } }),
        api.get('/enrollments'),
        api.get('/certificates'),
        api.get('/courses'),
        api.get('/batches')
      ]);
      setUsers(usersRes.data.data || []);
      setEnrollments(enrollmentsRes.data.data || []);
      setCertificates(certificatesRes.data.data || []);
      setCourses(coursesRes.data.data || []);
      setBatches(batchesRes.data.data || []);
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to fetch student data")));
    } finally {
      setLoading(false);
    }
  };

  const studentRows = useMemo(() => users.map((student) => {
    const studentEnrollments = enrollments.filter(item => item.student?._id === student._id);
    const studentCertificates = certificates.filter(item => item.student?._id === student._id);
    return {
      ...student,
      enrollments: studentEnrollments,
      certificates: studentCertificates,
      courses: studentEnrollments.map(item => item.course?.title).filter(Boolean).join(', '),
      batches: studentEnrollments.map(item => item.batch?.batchNumber).filter(Boolean).join(', '),
      latestStatus: studentEnrollments[0]?.status || 'not enrolled',
      isCertified: studentCertificates.some(item => item.status === 'valid')
    };
  }), [users, enrollments, certificates]);

  const filteredStudents = studentRows.filter((student) => {
    const searchText = `${student.name} ${student.email} ${student.phone || ''} ${student.fatherName || ''} ${student.nidNumber || ''}`.toLowerCase();
    const matchesSearch = searchText.includes(filters.search.toLowerCase());
    const matchesCourse = filters.course === 'all' || student.enrollments.some(item => item.course?._id === filters.course);
    const matchesBatch = filters.batch === 'all' || student.enrollments.some(item => item.batch?._id === filters.batch);
    const matchesStatus = filters.status === 'all' || student.enrollments.some(item => item.status === filters.status) || (filters.status === 'not enrolled' && student.enrollments.length === 0);
    const matchesVerification = filters.verification === 'all' || (filters.verification === 'verified' ? student.isVerified : !student.isVerified);
    const matchesCertification = filters.certification === 'all' || (filters.certification === 'certified' ? student.isCertified : !student.isCertified);
    return matchesSearch && matchesCourse && matchesBatch && matchesStatus && matchesVerification && matchesCertification;
  });

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleStudents = filteredStudents.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    setPage(previousPage => Math.min(previousPage, totalPages));
  }, [totalPages]);

  const handleExport = async (format) => {
    if (exporting) return;
    setExporting(format);
    try {
      const response = await api.get('/users/students/export', { params: { format }, responseType: 'blob' });
      const extension = format === 'excel' ? 'xlsx' : 'csv';
      const disposition = response.headers?.['content-disposition'];
      const filename = disposition?.match(/filename="([^"]+)"/)?.[1] || `students-export.${extension}`;
      const mimeType = format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv;charset=utf-8';
      downloadFile(response.data, filename, mimeType);
      toast.success(tr('Student records exported successfully'));
    } catch (error) {
      toast.error(tr('Unable to export student records. Please try again.'));
    } finally {
      setExporting(null);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', {
        ...formData,
        role: 'student'
      });
      toast.success(tr("Student added successfully"));
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', password: '' });
      fetchData();
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to add student")));
    }
  };

  if (loading) return <div>{tr("Loading...")}</div>;

  return (
    <div className="section">
      <div className="section-header">
        <h1>{tr("Students")}</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <FaPlus /> {tr("Add Student")}</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><h3>{studentRows.length}</h3><p>{tr("Total Students")}</p></div>
        <div className="stat-card"><h3>{studentRows.filter(row => row.isVerified).length}</h3><p>{tr("Verified")}</p></div>
        <div className="stat-card"><h3>{studentRows.filter(row => row.isCertified).length}</h3><p>{tr("Certified")}</p></div>
        <div className="stat-card"><h3>{studentRows.filter(row => row.enrollments.length > 0).length}</h3><p>{tr("Leads Enrolled")}</p></div>
      </div>

      <div className="search-filter-bar">
        <input className="form-control" placeholder={tr("Search students...")} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <select className="form-control" value={filters.course} onChange={(e) => setFilters({ ...filters, course: e.target.value })}>
          <option value="all">{tr("All Courses")}</option>
          {courses.map(course => <option key={course._id} value={course._id}>{course.title}</option>)}
        </select>
        <select className="form-control" value={filters.batch} onChange={(e) => setFilters({ ...filters, batch: e.target.value })}>
          <option value="all">{tr("All Batches")}</option>
          {batches.map(batch => <option key={batch._id} value={batch._id}>{batch.batchNumber}</option>)}
        </select>
        <select className="form-control" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="all">{tr("All Enrollment Status")}</option>
          <option value="not enrolled">{tr("Not Enrolled")}</option>
          <option value="pending">{tr("Pending")}</option>
          <option value="approved">{tr("Approved")}</option>
          <option value="rejected">{tr("Rejected")}</option>
          <option value="completed">{tr("Completed")}</option>
        </select>
        <select className="form-control" value={filters.verification} onChange={(e) => setFilters({ ...filters, verification: e.target.value })}>
          <option value="all">{tr("All Verification")}</option>
          <option value="verified">{tr("Verified")}</option>
          <option value="unverified">{tr("Unverified")}</option>
        </select>
        <select className="form-control" value={filters.certification} onChange={(e) => setFilters({ ...filters, certification: e.target.value })}>
          <option value="all">{tr("All Certification")}</option>
          <option value="certified">{tr("Certified")}</option>
          <option value="uncertified">{tr("Not Certified")}</option>
        </select>
        <button type="button" className="btn btn-secondary" disabled={exporting !== null} aria-busy={exporting === 'csv'} title={tr('Export all registered students')} onClick={() => handleExport('csv')}>
          <FaDownload /> CSV
        </button>
        <button type="button" className="btn btn-secondary" disabled={exporting !== null} aria-busy={exporting === 'excel'} title={tr('Export all registered students')} onClick={() => handleExport('excel')}>
          <FaDownload /> Excel
        </button>
      </div>

      <p className="field-hint" aria-live="polite">{exporting ? tr('Preparing complete student export...') : tr('CSV includes essential student report details. Excel includes full records. Both export all registered students.')}</p>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>{tr("Name")}</th>
              <th>{tr("Email")}</th>
              <th>{tr("Phone")}</th>
              <th>{tr("Courses")}</th>
              <th>{tr("Batches")}</th>
              <th>{tr("Status")}</th>
              <th>{tr("Verified")}</th>
              <th>{tr("Certified")}</th>
              <th>{tr("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {visibleStudents.map(student => (
              <tr key={student._id}>
                <td>{student.name}</td>
                <td>{student.email}</td>
                <td>{student.phone || tr("N/A")}</td>
                <td>{student.courses || tr("N/A")}</td>
                <td>{student.batches || tr("Unassigned")}</td>
                <td><span className={`status-badge ${student.latestStatus}`}>{tr(student.latestStatus)}</span></td>
                <td>{student.isVerified ? tr("Yes") : tr("No")}</td>
                <td>{student.isCertified ? tr("Yes") : tr("No")}</td>
                <td><button type="button" className="btn btn-secondary" onClick={() => setSelectedStudent(student)}>{tr('View Profile')}</button></td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr><td colSpan={9}>{tr("No students found.")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredStudents.length > 0 && (
        <nav className="dashboard-pagination" aria-label={tr("Students pagination")}>
          <p role="status">{tr('Showing {{start}}–{{end}} of {{total}} students', {
            start: (pageStart + 1).toLocaleString(locale),
            end: Math.min(pageStart + PAGE_SIZE, filteredStudents.length).toLocaleString(locale),
            total: filteredStudents.length.toLocaleString(locale)
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

      {selectedStudent && <StudentProfile student={selectedStudent} onClose={() => setSelectedStudent(null)} />}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{tr("Add Student")}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="form-group"><label>{tr("Name")}</label><input className="form-control" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
              <div className="form-group"><label>{tr("Email")}</label><input className="form-control" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>
              <div className="form-group"><label>{tr("Phone")}</label><input className="form-control" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required /></div>
              <div className="form-group"><label>{tr("Password")}</label><input className="form-control" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required /></div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{tr("Cancel")}</button>
                <button type="submit" className="btn btn-primary">{tr("Create Student")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsSection;
