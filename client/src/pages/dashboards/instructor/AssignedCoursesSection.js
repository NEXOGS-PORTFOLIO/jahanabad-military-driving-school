import { useSiteTranslation, translate as tr } from '../../../hooks/useSiteTranslation';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaBook, FaChartBar } from 'react-icons/fa';
import api from '../../../utils/api';

const AssignedCoursesSection = () => {
  const { locale } = useSiteTranslation();
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignedCourses();
    fetchBatches();
  }, []);

  const fetchAssignedCourses = async () => {
    try {
      const response = await api.get('/enrollments/my-courses');
      setCourses(response.data.data);
      setLoading(false);
    } catch (error) {
      toast.error(tr("Failed to fetch assigned courses"));
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await api.get('/batches/my-batches');
      setBatches(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch assigned batches');
    }
  };

  const getCompletedCount = (enrollments) => {
    return enrollments.filter(e => e.status === 'completed').length;
  };

  const getApprovedCount = (enrollments) => {
    return enrollments.filter(e => e.status === 'approved').length;
  };

  if (loading) return <div>{tr("Loading...")}</div>;

  return (
    <div className="section">
      <div className="section-header">
        <h1><FaBook /> {tr("My Batches & Assigned Courses")}</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{courses.length}</h3>
          <p>{tr("Total Assigned Courses")}</p>
        </div>
        <div className="stat-card">
          <h3>{batches.length}</h3>
          <p>{tr("Assigned Batches")}</p>
        </div>
        <div className="stat-card">
          <h3>{courses.reduce((acc, course) => acc + course.enrollments.length, 0)}</h3>
          <p>{tr("Total Students")}</p>
        </div>
        <div className="stat-card">
          <h3>{courses.reduce((acc, course) => acc + getApprovedCount(course.enrollments), 0)}</h3>
          <p>{tr("Active Students")}</p>
        </div>
        <div className="stat-card">
          <h3>{courses.reduce((acc, course) => acc + getCompletedCount(course.enrollments), 0)}</h3>
          <p>{tr("Completed Students")}</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '10px' }}>
          <FaBook size={50} color="#ccc" />
          <h3 style={{ marginTop: '1rem', color: '#666' }}>{tr("No Courses Assigned")}</h3>
          <p style={{ color: '#999' }}>{tr("You don't have any courses assigned yet. Contact the admin for course assignments.")}</p>
        </div>
      ) : (
        <div className="data-table" style={{ marginBottom: '2rem' }}>
          <table>
            <thead>
              <tr>
                <th>{tr("Course Title")}</th>
                <th>{tr("Duration")}</th>
                <th>{tr("Price")}</th>
                <th>{tr("Students Enrolled")}</th>
                <th>{tr("Active")}</th>
                <th>{tr("Completed")}</th>
                <th>{tr("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(course => (
                <tr key={course._id}>
                  <td>
                    <strong>{course.title}</strong>
                  </td>
                  <td>{course.duration}</td>
                  <td>৳{course.price}</td>
                  <td>{course.enrollments?.length || 0}</td>
                  <td>{getApprovedCount(course.enrollments)}</td>
                  <td>{getCompletedCount(course.enrollments)}</td>
                  <td>
                    <span className={`status-badge ${course.isActive ? 'active' : 'inactive'}`}>
                      {course.isActive ? tr("Active") : tr("Inactive")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {batches.length > 0 && (
        <div className="batch-card-grid">
          {batches.map(batch => (
            <div key={batch._id} className="batch-card">
              <div className="batch-card-header">
                <div>
                  <h3>{batch.name || batch.batchNumber}</h3>
                  <p>{batch.course?.title || tr("Course not assigned")} {batch.courseType ? `| ${batch.courseType}` : ''}</p>
                </div>
                <span className={`status-badge ${batch.status}`}>{tr(batch.status)}</span>
              </div>
              <div className="batch-card-body">
                <div><strong>{tr("Students:")}</strong> {batch.enrolledCount || 0} / {batch.capacity}</div>
                <div><strong>{tr("Completed:")}</strong> {batch.completedCount || 0}</div>
                <div><strong>{tr("Vacancies:")}</strong> {batch.vacancies}</div>
                <div><strong>{tr("Vehicles:")}</strong> {batch.vehicleTypes?.join(', ') || tr("N/A")}</div>
                <div><strong>{tr("Schedule:")}</strong> {batch.schedule || tr("Not set")}</div>
                <div><strong>{tr("Start:")}</strong> {batch.startDate ? new Date(batch.startDate).toLocaleDateString(locale) : tr("Not set")}</div>
                <div><strong>{tr("End:")}</strong> {batch.endDate ? new Date(batch.endDate).toLocaleDateString(locale) : tr("Not set")}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {courses.length > 0 && (
        <div style={{ 
          marginTop: '2rem', 
          padding: '1.5rem', 
          background: '#f8f9fa', 
          borderRadius: '10px',
          borderLeft: '4px solid var(--primary-color)'
        }}>
          <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
            <FaChartBar /> {tr("Course Management Tips")}</h4>
          <ul style={{ lineHeight: '1.8' }}>
            <li>{tr("Use the")} <strong>{tr("Students")}</strong> {tr("section to view all students across courses")}</li>
            <li>{tr("Mark daily")} <strong>{tr("Attendance")}</strong> {tr("to track student participation")}</li>
            <li>{tr("Update student")} <strong>{tr("Progress")}</strong> {tr("regularly to keep them informed")}</li>
            <li>{tr("Recommend completion when students reach 100% progress")}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default AssignedCoursesSection;
