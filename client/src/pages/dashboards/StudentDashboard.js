import { useSiteTranslation, translate as tr } from '../../hooks/useSiteTranslation';
import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaUser, FaClipboardList, FaCertificate, FaCheckCircle,
  FaChevronLeft, FaChevronRight, FaUserGraduate
} from 'react-icons/fa';
import './Dashboard.css';

import ProfileSection from './student/ProfileSection';
import EnrollmentsSection from './student/EnrollmentsSection';
import CertificatesSection from './student/CertificatesSection';
import VerificationSection from './student/VerificationSection';
import RegistrationSuccess from '../../components/RegistrationSuccess';

const StudentDashboard = () => {
  useSiteTranslation();
  const { t } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { path: '', label: t('dashboard.profile'), icon: <FaUser /> },
    { path: 'enrollments', label: t('dashboard.myEnrollments'), icon: <FaClipboardList /> },
    { path: 'certificates', label: t('dashboard.myCertificates'), icon: <FaCertificate /> },
    { path: 'verification', label: t('dashboard.verify'), icon: <FaCheckCircle /> },
  ];

  return (
    <div className="dashboard-container">
      <RegistrationSuccess />
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <FaUserGraduate />
            </div>
            <div className="sidebar-brand-text">
              <h2>{t('nav.dashboard')}</h2>
              <span className="sidebar-role-badge">{tr("Student")}</span>
            </div>
          </div>
          <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} className="toggle-btn" aria-label={tr("Toggle sidebar")} aria-expanded={sidebarOpen}>
            {sidebarOpen ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => {
            const isActive =
              location.pathname === `/student-dashboard/${item.path}` ||
              (item.path === '' && location.pathname === '/student-dashboard');
            return (
              <Link
                key={item.path}
                to={`/student-dashboard/${item.path}`}
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
            <div className="sidebar-footer-avatar">S</div>
            <div className="sidebar-footer-text">
              <strong>{tr("Student")}</strong>
              <p>{tr("Learning Portal")}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <Routes>
          <Route path="/" element={<ProfileSection />} />
          <Route path="/enrollments" element={<EnrollmentsSection />} />
          <Route path="/certificates" element={<CertificatesSection />} />
          <Route path="/verification" element={<VerificationSection />} />
        </Routes>
      </main>
    </div>
  );
};

export default StudentDashboard;
