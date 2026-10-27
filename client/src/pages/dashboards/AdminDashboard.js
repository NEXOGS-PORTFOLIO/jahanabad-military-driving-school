import { useSiteTranslation, translate as tr } from '../../hooks/useSiteTranslation';
import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaUsers, FaUserGraduate, FaChalkboardTeacher, FaLayerGroup,
  FaBook, FaClipboardList, FaCertificate, FaBullhorn,
  FaChevronLeft, FaChevronRight, FaShieldAlt
} from 'react-icons/fa';
import './Dashboard.css';

import UsersSection from './admin/UsersSection';
import StudentsSection from './admin/StudentsSection';
import InstructorsSection from './admin/InstructorsSection';
import BatchesSection from './admin/BatchesSection';
import CoursesSection from './admin/CoursesSection';
import NoticesSection from './admin/NoticesSection';
import EnrollmentsSection from './admin/EnrollmentsSection';
import CertificatesSection from './admin/CertificatesSection';

const AdminDashboard = () => {
  useSiteTranslation();
  const { t } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { path: '', label: t('dashboard.users'), icon: <FaUsers /> },
    { path: 'courses', label: t('dashboard.courses'), icon: <FaBook /> },
    { path: 'batches', label: t('dashboard.batches'), icon: <FaLayerGroup /> },
    { path: 'enrollments', label: t('dashboard.enrollments'), icon: <FaClipboardList /> },
    { path: 'certificates', label: t('dashboard.certificates'), icon: <FaCertificate /> },
    { path: 'notices', label: t('dashboard.notices'), icon: <FaBullhorn /> },
    { path: 'students', label: t('dashboard.students'), icon: <FaUserGraduate /> },
    { path: 'instructors', label: t('dashboard.instructors'), icon: <FaChalkboardTeacher /> },
  ];

  return (
    <div className="dashboard-container">
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <FaShieldAlt />
            </div>
            <div className="sidebar-brand-text">
              <h2>{t('nav.dashboard')}</h2>
              <span className="sidebar-role-badge">{tr("Admin")}</span>
            </div>
          </div>
          <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} className="toggle-btn" aria-label={tr("Toggle sidebar")} aria-expanded={sidebarOpen}>
            {sidebarOpen ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => {
            const isActive =
              location.pathname === `/admin-dashboard/${item.path}` ||
              (item.path === '' && location.pathname === '/admin-dashboard');
            return (
              <Link
                key={item.path}
                to={`/admin-dashboard/${item.path}`}
                className={`menu-item ${isActive ? 'active' : ''}`}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                title={!sidebarOpen ? item.label : undefined}
              >
                <span className="menu-item-icon">{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-inner">
            <div className="sidebar-footer-avatar">A</div>
            <div className="sidebar-footer-text">
              <strong>{tr("Administrator")}</strong>
              <p>{tr("Full Access")}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <Routes>
          <Route path="/" element={<UsersSection />} />
          <Route path="/students" element={<StudentsSection />} />
          <Route path="/instructors" element={<InstructorsSection />} />
          <Route path="/batches" element={<BatchesSection />} />
          <Route path="/courses" element={<CoursesSection />} />
          <Route path="/notices" element={<NoticesSection />} />
          <Route path="/enrollments" element={<EnrollmentsSection />} />
          <Route path="/certificates" element={<CertificatesSection />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;
