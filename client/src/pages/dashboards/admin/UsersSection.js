import { useSiteTranslation, translate as tr } from '../../../hooks/useSiteTranslation';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';
import api from '../../../utils/api';

const UsersSection = () => {
  useSiteTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    phone: ''
  });

  useEffect(() => {
    let mounted = true;
    
    const loadUsers = async () => {
      if (mounted) {
        await fetchUsers();
      }
    };
    
    loadUsers();
    
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - run only once on mount

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/users');
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Fetch users error:', error);
      setError(error.response?.data?.message || 'Failed to fetch users');
      toast.error(tr("Failed to fetch users"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, formData);
        toast.success(tr("User updated successfully"));
      } else {
        await api.post('/users', formData);
        toast.success(tr("User created successfully"));
      }
      fetchUsers();
      closeModal();
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Operation failed")));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(tr("Are you sure you want to delete this user?"))) {
      try {
        await api.delete(`/users/${id}`);
        toast.success(tr("User deleted successfully"));
        fetchUsers();
      } catch (error) {
        toast.error(tr("Failed to delete user"));
      }
    }
  };

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        phone: user.phone || ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'student',
        phone: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ fontSize: '2rem' }}>{tr("Loading users...")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: '#dc3545', marginBottom: '1rem' }}>{tr(error)}</p>
        <button onClick={fetchUsers} className="btn btn-primary">{tr("Retry")}</button>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="section-header">
        <h1>{tr("Users Management")}</h1>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <FaPlus /> {tr("Add User")}</button>
      </div>

      <div className="search-filter-bar">
        <input
          type="text"
          placeholder={tr("Search users...")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-control"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="form-control"
        >
          <option value="all">{tr("All Roles")}</option>
          <option value="admin">{tr("Admin")}</option>
          <option value="instructor">{tr("Instructor")}</option>
          <option value="student">{tr("Student")}</option>
        </select>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>{tr("Name")}</th>
              <th>{tr("Email")}</th>
              <th>{tr("Role")}</th>
              <th>{tr("Phone")}</th>
              <th>{tr("Status")}</th>
              <th>{tr("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td><span className={`status-badge ${user.role}`}>{tr(user.role)}</span></td>
                <td>{user.phone || tr("N/A")}</td>
                <td>
                  <span className={`status-badge ${user.isVerified ? 'active' : 'inactive'}`}>
                    {user.isVerified ? tr("Verified") : tr("Not Verified")}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn btn-small btn-secondary" onClick={() => openModal(user)}>
                      <FaEdit />
                    </button>
                    <button className="btn btn-small btn-danger" onClick={() => handleDelete(user._id)}>
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
              <h2>{editingUser ? tr("Edit User") : tr("Add New User")}</h2>
              <button className="close-btn" onClick={closeModal}><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{tr("Name")}</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>{tr("Email")}</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>{tr("Password")} {editingUser && tr("(leave blank to keep current)")}</label>
                <input
                  type="password"
                  className="form-control"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!editingUser}
                />
              </div>
              <div className="form-group">
                <label>{tr("Role")}</label>
                <select
                  className="form-control"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  required
                >
                  <option value="student">{tr("Student")}</option>
                  <option value="instructor">{tr("Instructor")}</option>
                  <option value="admin">{tr("Admin")}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{tr("Phone")}</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>{tr("Cancel")}</button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? tr("Update") : tr("Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersSection;
