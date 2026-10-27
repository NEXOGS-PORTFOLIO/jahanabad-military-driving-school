import { useSiteTranslation, translate as tr } from '../../../hooks/useSiteTranslation';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FaBan, FaCopy, FaDownload, FaKey, FaPlus, FaTimes } from 'react-icons/fa';
import api from '../../../utils/api';
import { downloadRows } from '../../../utils/exportHelpers';

const InstructorsSection = () => {
  useSiteTranslation();
  const [instructors, setInstructors] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [referenceCodes, setReferenceCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    batch: 'all',
    status: 'all'
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
      const [usersRes, enrollmentsRes, batchesRes, codesRes] = await Promise.all([
        api.get('/users', { params: { role: 'instructor' } }),
        api.get('/enrollments'),
        api.get('/batches'),
        api.get('/reference-codes')
      ]);
      setInstructors(usersRes.data.data || []);
      setEnrollments(enrollmentsRes.data.data || []);
      setBatches(batchesRes.data.data || []);
      setReferenceCodes(codesRes.data.data || []);
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to fetch instructor data")));
    } finally {
      setLoading(false);
    }
  };

  const instructorRows = useMemo(() => instructors.map((instructor) => {
    const assignedEnrollments = enrollments.filter(item => item.instructor?._id === instructor._id);
    const assignedBatches = batches.filter(batch => batch.instructors?.some(item => item._id === instructor._id));
    return {
      ...instructor,
      studentsCount: assignedEnrollments.length,
      activeStudents: assignedEnrollments.filter(item => item.status === 'approved').length,
      completedStudents: assignedEnrollments.filter(item => item.status === 'completed').length,
      batches: assignedBatches.map(batch => batch.batchNumber).join(', '),
      batchIds: assignedBatches.map(batch => batch._id)
    };
  }), [instructors, enrollments, batches]);

  const filteredInstructors = instructorRows.filter((instructor) => {
    const searchText = `${instructor.name} ${instructor.email} ${instructor.phone || ''}`.toLowerCase();
    const matchesSearch = searchText.includes(filters.search.toLowerCase());
    const matchesBatch = filters.batch === 'all' || instructor.batchIds.includes(filters.batch);
    const matchesStatus = filters.status === 'all' || instructor.status === filters.status;
    return matchesSearch && matchesBatch && matchesStatus;
  });

  const exportColumns = [
    { label: tr("Name"), value: row => row.name },
    { label: tr("Email"), value: row => row.email },
    { label: tr("Phone"), value: row => row.phone },
    { label: tr("Verified"), value: row => row.isVerified ? tr("Yes") : tr("No") },
    { label: tr("Account Status"), value: row => tr(row.status) },
    { label: tr("Batches"), value: row => row.batches },
    { label: tr("Total Students"), value: row => row.studentsCount },
    { label: tr("Active Students"), value: row => row.activeStudents },
    { label: tr("Completed Students"), value: row => row.completedStudents }
  ];

  const handleAddInstructor = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', {
        ...formData,
        role: 'instructor'
      });
      toast.success(tr("Instructor added successfully"));
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', password: '' });
      fetchData();
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to add instructor")));
    }
  };

  const handleGenerateCode = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/reference-codes', { notes });
      setReferenceCodes([response.data.data, ...referenceCodes]);
      setNotes('');
      toast.success(tr("Reference code generated"));
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to generate reference code")));
    }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(tr("Reference code copied"));
    } catch (error) {
      toast.error(tr("Failed to copy code"));
    }
  };

  const deactivateCode = async (id) => {
    if (!window.confirm(tr("Deactivate this unused reference code?"))) return;
    try {
      await api.patch(`/reference-codes/${id}/deactivate`);
      toast.success(tr("Reference code deactivated"));
      fetchData();
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to deactivate code")));
    }
  };

  if (loading) return <div>{tr("Loading...")}</div>;

  return (
    <div className="section">
      <div className="section-header">
        <h1>{tr("Instructors")}</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <FaPlus /> {tr("Add Instructor")}</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><h3>{instructorRows.length}</h3><p>{tr("Total Instructors")}</p></div>
        <div className="stat-card"><h3>{instructorRows.filter(row => row.status === 'active').length}</h3><p>{tr("Active")}</p></div>
        <div className="stat-card"><h3>{referenceCodes.filter(code => !code.isUsed && code.isActive).length}</h3><p>{tr("Available Codes")}</p></div>
        <div className="stat-card"><h3>{instructorRows.reduce((sum, row) => sum + row.studentsCount, 0)}</h3><p>{tr("Assigned Students")}</p></div>
      </div>

      <form onSubmit={handleGenerateCode} className="search-filter-bar">
        <input className="form-control" placeholder={tr("Optional reference code note")} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="btn btn-primary" type="submit"><FaKey /> {tr("Generate Reference Code")}</button>
      </form>

      <div className="data-table" style={{ marginBottom: '2rem' }}>
        <table>
          <thead>
            <tr>
              <th>{tr("Reference Code")}</th>
              <th>{tr("Status")}</th>
              <th>{tr("Used By")}</th>
              <th>{tr("Note")}</th>
              <th>{tr("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {referenceCodes.slice(0, 8).map(code => (
              <tr key={code._id}>
                <td><strong>{code.code}</strong></td>
                <td><span className={`status-badge ${code.isUsed ? 'completed' : code.isActive ? 'active' : 'inactive'}`}>{code.isUsed ? tr("Used") : code.isActive ? tr("Active") : tr("Inactive")}</span></td>
                <td>{code.usedBy ? `${code.usedBy.name} (${code.usedBy.email})` : tr("Not used")}</td>
                <td>{code.notes || tr("N/A")}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn btn-small btn-secondary" type="button" onClick={() => copyCode(code.code)}><FaCopy /></button>
                    {!code.isUsed && code.isActive && <button className="btn btn-small btn-warning" type="button" onClick={() => deactivateCode(code._id)}><FaBan /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="search-filter-bar">
        <input className="form-control" placeholder={tr("Search instructors...")} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <select className="form-control" value={filters.batch} onChange={(e) => setFilters({ ...filters, batch: e.target.value })}>
          <option value="all">{tr("All Batches")}</option>
          {batches.map(batch => <option key={batch._id} value={batch._id}>{batch.batchNumber}</option>)}
        </select>
        <select className="form-control" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="all">{tr("All Status")}</option>
          <option value="active">{tr("Active")}</option>
          <option value="inactive">{tr("Inactive")}</option>
          <option value="suspended">{tr("Suspended")}</option>
        </select>
        <button className="btn btn-secondary" onClick={() => downloadRows(filteredInstructors, exportColumns, 'instructors-export', 'csv')}><FaDownload /> CSV</button>
        <button className="btn btn-secondary" onClick={() => downloadRows(filteredInstructors, exportColumns, 'instructors-export', 'excel')}><FaDownload /> Excel</button>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>{tr("Name")}</th>
              <th>{tr("Email")}</th>
              <th>{tr("Phone")}</th>
              <th>{tr("Batches")}</th>
              <th>{tr("Students")}</th>
              <th>{tr("Status")}</th>
              <th>{tr("Verified")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredInstructors.map(instructor => (
              <tr key={instructor._id}>
                <td>{instructor.name}</td>
                <td>{instructor.email}</td>
                <td>{instructor.phone || tr("N/A")}</td>
                <td>{instructor.batches || tr("Unassigned")}</td>
                <td>{instructor.studentsCount}</td>
                <td><span className={`status-badge ${instructor.status}`}>{tr(instructor.status)}</span></td>
                <td>{instructor.isVerified ? tr("Yes") : tr("No")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{tr("Add Instructor")}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleAddInstructor}>
              <div className="form-group"><label>{tr("Name")}</label><input className="form-control" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
              <div className="form-group"><label>{tr("Email")}</label><input className="form-control" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>
              <div className="form-group"><label>{tr("Phone")}</label><input className="form-control" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required /></div>
              <div className="form-group"><label>{tr("Password")}</label><input className="form-control" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required /></div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{tr("Cancel")}</button>
                <button type="submit" className="btn btn-primary">{tr("Create Instructor")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorsSection;
