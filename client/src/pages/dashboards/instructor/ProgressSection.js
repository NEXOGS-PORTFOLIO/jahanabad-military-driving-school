import { useSiteTranslation, translate as tr } from '../../../hooks/useSiteTranslation';
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FaTimes, FaEdit, FaChartLine, FaCertificate } from "react-icons/fa";
import api from "../../../utils/api";
import ProgressComments from "../../../components/ProgressComments";

const ProgressSection = () => {
  useSiteTranslation();
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [progress, setProgress] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchEnrollments();
    fetchCourses();
    fetchBatches();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const response = await api.get("/enrollments/my-students");
      setEnrollments(response.data.data);
      setLoading(false);
    } catch (error) {
      toast.error(tr("Failed to fetch enrollments"));
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get("/enrollments/my-courses");
      setCourses(response.data.data);
    } catch (error) {
      console.error("Failed to fetch courses");
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await api.get("/batches/my-batches");
      setBatches(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch batches");
    }
  };

  const openModal = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setProgress(enrollment.progress);
    setComment("");
    setShowModal(true);
  };

  const handleUpdateProgress = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api.put(`/enrollments/${selectedEnrollment._id}/progress`, {
        progress: Number(progress),
        comment: comment.trim(),
      });
      toast.success(
        tr(Number(progress) === 100
          ? tr("Progress updated to 100%! Certificate will be generated automatically.")
          : tr("Progress updated successfully")),
      );
      fetchEnrollments();
      setShowModal(false);
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to update progress")));
    } finally {
      setSaving(false);
    }
  };

  const handleRecommendCompletion = async (enrollmentId) => {
    if (
      window.confirm(
        tr("Are you sure you want to mark this student as completed? This will generate their certificate."),
      )
    ) {
      try {
        await api.put(`/enrollments/${enrollmentId}/status`, {
          status: "completed",
        });
        toast.success(tr("Student marked as completed. Certificate generated!"));
        fetchEnrollments();
      } catch (error) {
        toast.error(tr("Failed to mark completion"));
      }
    }
  };

  const filteredEnrollments = enrollments.filter((enrollment) => {
    const matchesCourse =
      selectedCourse === "all" || enrollment.course._id === selectedCourse;
    const matchesBatch =
      selectedBatch === "all" || enrollment.batch?._id === selectedBatch;
    const matchesSearch =
      enrollment.student?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      enrollment.student?.email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
    return matchesCourse && matchesBatch && matchesSearch;
  });

  const averageProgress =
    filteredEnrollments.length > 0
      ? Math.round(
          filteredEnrollments.reduce((sum, e) => sum + e.progress, 0) /
            filteredEnrollments.length,
        )
      : 0;

  if (loading) return <div>{tr("Loading...")}</div>;

  return (
    <div className="section">
      <div className="section-header">
        <h1>
          <FaChartLine /> {tr("Student Progress")}</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{filteredEnrollments.length}</h3>
          <p>{tr("Total Students")}</p>
        </div>
        <div className="stat-card">
          <h3>{averageProgress}%</h3>
          <p>{tr("Average Progress")}</p>
        </div>
        <div className="stat-card">
          <h3>
            {filteredEnrollments.filter((e) => e.progress === 100).length}
          </h3>
          <p>{tr("Completed (100%)")}</p>
        </div>
        <div className="stat-card">
          <h3>
            {
              filteredEnrollments.filter(
                (e) => e.progress >= 80 && e.progress < 100,
              ).length
            }
          </h3>
          <p>{tr("Near Completion (≥80%)")}</p>
        </div>
      </div>

      <div className="search-filter-bar">
        <input
          type="text"
          placeholder={tr("Search by student name or email...")}
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
          {courses.map((course) => (
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
          {batches.map((batch) => (
            <option key={batch._id} value={batch._id}>
              {batch.name || batch.batchNumber}
            </option>
          ))}
        </select>
      </div>

      {filteredEnrollments.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            background: "white",
            borderRadius: "10px",
          }}
        >
          <FaChartLine size={50} color="#ccc" />
          <h3 style={{ marginTop: "1rem", color: "#666" }}>{tr("No Students Found")}</h3>
          <p style={{ color: "#999" }}>
            {enrollments.length === 0
              ? tr("You don't have any students assigned yet.")
              : tr("No students match your search criteria.")}
          </p>
        </div>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{tr("Student")}</th>
                <th>{tr("Course")}</th>
                <th>{tr("Batch")}</th>
                <th>{tr("Progress")}</th>
                <th>{tr("Attendance")}</th>
                <th>{tr("Status")}</th>
                <th>{tr("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnrollments.map((enrollment, index) => (
                <tr key={enrollment._id}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{enrollment.student?.name || tr("N/A")}</strong>
                  </td>
                  <td>{enrollment.course?.title || tr("N/A")}</td>
                  <td>
                    {enrollment.batch?.name ||
                      enrollment.batch?.batchNumber ||
                      tr("Unassigned")}
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          background: "#e0e0e0",
                          borderRadius: "10px",
                          overflow: "hidden",
                          minWidth: "150px",
                        }}
                      >
                        <div
                          style={{
                            width: `${enrollment.progress}%`,
                            height: "20px",
                            background:
                              enrollment.progress === 100
                                ? "#28a745"
                                : enrollment.progress >= 80
                                  ? "#ffc107"
                                  : "var(--primary-color)",
                            transition: "width 0.3s",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontWeight: "bold",
                          color:
                            enrollment.progress === 100 ? "#28a745" : "inherit",
                        }}
                      >
                        {enrollment.progress}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        background: "#e3f2fd",
                        color: "#1976d2",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "15px",
                      }}
                    >
                      {enrollment.attendance?.filter(
                        (a) => a.status === "present",
                      ).length || 0}{" "}{tr("days")}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${enrollment.status}`}>
                      {tr(enrollment.status)}
                    </span>
                  </td>
                  <td>
                    <div
                      className="action-buttons"
                      style={{ display: "flex", gap: "0.5rem" }}
                    >
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => openModal(enrollment)}
                        title={tr("Update Progress")}
                      >
                        <FaEdit /> {tr("Update")}</button>
                      {enrollment.progress >= 80 &&
                        enrollment.status === "approved" && (
                          <button
                            className="btn btn-small btn-success"
                            onClick={() =>
                              handleRecommendCompletion(enrollment._id)
                            }
                            title={tr("Mark as Completed & Generate Certificate")}
                          >
                            <FaCertificate /> {tr("Complete")}</button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => !saving && setShowModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{tr("Update Progress")}</h2>
              <button
                className="close-btn"
                disabled={saving}
                onClick={() => setShowModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleUpdateProgress}>
              <div className="form-group">
                <label>{tr("Student:")} {selectedEnrollment?.student?.name}</label>
              </div>
              <div className="form-group">
                <label>{tr("Course:")} {selectedEnrollment?.course?.title}</label>
              </div>
              <div className="form-group">
                <label>{tr("Progress (%)")}</label>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                  required
                />
                <div
                  style={{
                    marginTop: "1rem",
                    background: "#e0e0e0",
                    borderRadius: "10px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "30px",
                      background: "var(--primary-color)",
                      transition: "width 0.3s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold",
                    }}
                  >
                    {progress}%
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="progress-comment">{tr("Comment (optional)")}</label>
                <textarea
                  id="progress-comment"
                  className="form-control"
                  rows={4}
                  maxLength={500}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={saving}
                  placeholder={tr("Add a reason, explanation, or progress update...")}
                />
              </div>
              <div className="form-group">
                <ProgressComments
                  comments={selectedEnrollment?.progressComments}
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={() => setShowModal(false)}
                >{tr("Cancel")}</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? tr("Saving...") : tr("Update Progress")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressSection;
