import { useSiteTranslation, translate as tr } from '../../../hooks/useSiteTranslation';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaUsers, FaEnvelope, FaPhoneAlt } from 'react-icons/fa';
import api from '../../../utils/api';

const PAGE_SIZE = 5;

const StudentsSection = () => {
  const { locale } = useSiteTranslation();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchStudents();
    fetchCourses();
    fetchBatches();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/enrollments/my-students');
      setStudents(response.data.data);
      setLoading(false);
    } catch (error) {
      toast.error(tr("Failed to fetch students"));
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/enrollments/my-courses');
      setCourses(response.data.data);
    } catch (error) {
      console.error('Failed to fetch courses');
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await api.get('/batches/my-batches');
      setBatches(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch batches');
    }
  };

  const filteredStudents = students.filter(enrollment => {
    const matchesCourse = selectedCourse === 'all' || enrollment.course._id === selectedCourse;
    const matchesBatch = selectedBatch === 'all' || enrollment.batch?._id === selectedBatch;
    const matchesSearch = enrollment.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.student?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCourse && matchesBatch && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleStudents = filteredStudents.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCourse, selectedBatch]);

  useEffect(() => {
    setPage(previousPage => Math.min(previousPage, totalPages));
  }, [totalPages]);

  if (loading) return <div>{tr("Loading...")}</div>;

  return (
    <div className="section">
      <div className="section-header">
        <h1><FaUsers /> {tr("My Students")}</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{students.length}</h3>
          <p>{tr("Total Students")}</p>
        </div>
        <div className="stat-card">
          <h3>{students.filter(e => e.status === 'approved').length}</h3>
          <p>{tr("Active Students")}</p>
        </div>
        <div className="stat-card">
          <h3>{students.filter(e => e.status === 'completed').length}</h3>
          <p>{tr("Completed")}</p>
        </div>
        <div className="stat-card">
          <h3>{courses.length}</h3>
          <p>{tr("Assigned Courses")}</p>
        </div>
      </div>

      <div className="search-filter-bar">
        <input
          type="text"
          placeholder={tr("Search by name or email...")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-control"
        />
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="form-control"
        >
          <option value="all">{tr("All Courses")}</option>
          {courses.map(course => (
            <option key={course._id} value={course._id}>
              {course.title}
            </option>
          ))}
        </select>
        <select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          className="form-control"
        >
          <option value="all">{tr("All Batches")}</option>
          {batches.map(batch => (
            <option key={batch._id} value={batch._id}>
              {batch.name || batch.batchNumber}
            </option>
          ))}
        </select>
      </div>

      {filteredStudents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '10px' }}>
          <FaUsers size={50} color="#ccc" />
          <h3 style={{ marginTop: '1rem', color: '#666' }}>{tr("No Students Found")}</h3>
          <p style={{ color: '#999' }}>
            {students.length === 0 
              ? tr("You don't have any students assigned yet.")
              : tr("No students match your search criteria.")}
          </p>
        </div>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>{tr("Student Name")}</th>
                <th>{tr("Contact Info")}</th>
                <th>{tr("Course")}</th>
                <th>{tr("Batch")}</th>
                <th>{tr("Progress")}</th>
                <th>{tr("Attendance")}</th>
                <th>{tr("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map(enrollment => (
                <tr key={enrollment._id}>
                  <td>
                    <strong>{enrollment.student?.name || tr("N/A")}</strong>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <FaEnvelope size={12} style={{ flexShrink: 0 }} />
                        <span>{enrollment.student?.email || tr("N/A")}</span>
                      </div>
                      {enrollment.student?.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FaPhoneAlt size={12} style={{ flexShrink: 0 }} />
                          <span>{enrollment.student.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{enrollment.course?.title || tr("N/A")}</td>
                  <td>{enrollment.batch?.name || enrollment.batch?.batchNumber || tr("Unassigned")}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ 
                        width: '100px', 
                        background: '#e0e0e0', 
                        borderRadius: '10px', 
                        overflow: 'hidden',
                        height: '10px'
                      }}>
                        <div style={{ 
                          width: `${enrollment.progress}%`, 
                          height: '100%', 
                          background: enrollment.progress === 100 ? '#28a745' : 'var(--primary-color)'
                        }} />
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                        {enrollment.progress}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <strong>{enrollment.attendance?.filter(a => a.status === 'present').length || 0}</strong> {tr("days")}</td>
                  <td>
                    <span className={`status-badge ${enrollment.status}`}>
                      {tr(enrollment.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
    </div>
  );
};

export default StudentsSection;
