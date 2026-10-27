import { useSiteTranslation, translate as tr } from '../../hooks/useSiteTranslation';
import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaBook, FaUsers, FaClipboardCheck, FaChartLine,
  FaChevronLeft, FaChevronRight, FaChalkboardTeacher
} from 'react-icons/fa';
import './Dashboard.css';

import AssignedCoursesSection from './instructor/AssignedCoursesSection';
import StudentsSection from './instructor/StudentsSection';
import AttendanceSection from './instructor/AttendanceSection';
import ProgressSection from './instructor/ProgressSection';

const InstructorDashboard = () => {
  useSiteTranslation();
  const { t } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { path: '', label: t('dashboard.myBatches'), icon: <FaBook /> },
    { path: 'students', label: t('dashboard.myStudents'), icon: <FaUsers /> },
    { path: 'attendance', label: t('dashboard.attendance'), icon: <FaClipboardCheck /> },
    { path: 'progress', label: t('dashboard.progress'), icon: <FaChartLine /> },
  ];

  return (
    <div className="dashboard-container">
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <FaChalkboardTeacher />
            </div>
            <div className="sidebar-brand-text">
              <h2>{t('nav.dashboard')}</h2>
              <span className="sidebar-role-badge">{tr("Instructor")}</span>
            </div>
          </div>
          <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} className="toggle-btn" aria-label={tr("Toggle sidebar")} aria-expanded={sidebarOpen}>
            {sidebarOpen ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => {
            const isActive =
              location.pathname === `/instructor-dashboard/${item.path}` ||
              (item.path === '' && location.pathname === '/instructor-dashboard');
            return (
              <Link
                key={item.path}
                to={`/instructor-dashboard/${item.path}`}
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
            <div className="sidebar-footer-avatar">I</div>
            <div className="sidebar-footer-text">
              <strong>{tr("Instructor")}</strong>
              <p>{tr("Teaching Panel")}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <Routes>
          <Route path="/" element={<AssignedCoursesSection />} />
          <Route path="/students" element={<StudentsSection />} />
          <Route path="/attendance" element={<AttendanceSection />} />
          <Route path="/progress" element={<ProgressSection />} />
        </Routes>
      </main>
    </div>
  );
};

export default InstructorDashboard;
