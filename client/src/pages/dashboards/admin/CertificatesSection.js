import { useSiteTranslation, translate as tr } from '../../../hooks/useSiteTranslation';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaBan, FaEye, FaDownload } from 'react-icons/fa';
import api from '../../../utils/api';

const CertificatesSection = () => {
  const { locale } = useSiteTranslation();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const response = await api.get('/certificates');
      setCertificates(response.data.data);
      setLoading(false);
    } catch (error) {
      toast.error(tr("Failed to fetch certificates"));
      setLoading(false);
    }
  };

  const handleRevoke = async (id) => {
    if (window.confirm(tr("Are you sure you want to revoke this certificate?"))) {
      try {
        await api.put(`/certificates/${id}/revoke`, { reason: 'Revoked by admin' });
        toast.success(tr("Certificate revoked successfully"));
        fetchCertificates();
      } catch (error) {
        toast.error(tr("Failed to revoke certificate"));
      }
    }
  };

  const handlePreview = async (cert) => {
    setBusy(cert._id);
    try {
      const response = await api.get(`/certificates/${cert._id}/preview`);
      setPreview({ certificateId: response.data.data.certificateId, pdfData: response.data.data.pdfData });
    } catch (error) {
      toast.error(tr('Failed to preview certificate'));
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async (cert) => {
    setBusy(cert._id);
    let url;
    let link;
    try {
      const response = await api.get(`/certificates/${cert._id}/download`, { responseType: 'blob' });
      url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      link = document.createElement('a');
      link.href = url;
      link.download = `Certificate-${cert.certificateId}.pdf`;
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      toast.error(tr('Failed to download certificate'));
    } finally {
      link?.remove();
      if (url) window.URL.revokeObjectURL(url);
      setBusy(null);
    }
  };

  const issueDate = cert => {
    if (!cert.issuedDate) return tr('N/A');
    const date = new Date(cert.issuedDate);
    return Number.isNaN(date.getTime()) ? tr('N/A') : date.toLocaleDateString(locale, { timeZone: 'Asia/Dhaka' });
  };

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = cert.certificateId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.student?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         cert.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div>{tr("Loading...")}</div>;

  return (
    <div className="section">
      <div className="section-header">
        <h1>{tr("Certificates Management")}</h1>
      </div>

      <div className="search-filter-bar">
        <input
          type="text"
          placeholder={tr("Search by certificate ID or student name...")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-control"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-control"
        >
          <option value="all">{tr("All Certificates")}</option>
          <option value="valid">{tr("Valid")}</option>
          <option value="revoked">{tr("Revoked")}</option>
        </select>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>{tr("Certificate ID")}</th>
              <th>{tr("Student")}</th>
              <th>{tr("Course")}</th>
              <th>{tr("Issue Date")}</th>
              <th>{tr("Status")}</th>
              <th>{tr("Certificate")}</th>
              <th>{tr("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredCertificates.map(cert => (
              <tr key={cert._id}>
                <td><strong>{cert.certificateId}</strong></td>
                <td>{cert.student?.name || tr("N/A")}</td>
                <td>{cert.course?.title || tr("N/A")}</td>
                <td>{issueDate(cert)}</td>
                <td>
                  <span className={`status-badge ${cert.status === 'revoked' ? 'revoked' : 'valid'}`}>
                    {cert.status === 'revoked' ? tr("Revoked") : tr("Valid")}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn btn-small btn-secondary" disabled={busy !== null}
                      aria-label={`${tr('Preview')} ${cert.certificateId}`} onClick={() => handlePreview(cert)}>
                      <FaEye /> {tr('Preview')}
                    </button>
                    <button className="btn btn-small btn-primary" disabled={busy !== null || cert.status === 'revoked'}
                      aria-label={`${tr('Download')} ${cert.certificateId}`} onClick={() => handleDownload(cert)}>
                      <FaDownload /> {tr('Download')}
                    </button>
                  </div>
                </td>
                <td>
                  <div className="action-buttons">
                    {cert.status !== 'revoked' ? (
                      <button 
                        className="btn btn-small btn-danger" 
                        onClick={() => handleRevoke(cert._id)}
                      >
                        <FaBan /> {tr("Revoke")}</button>
                    ) : (
                      <span className="text-muted">{tr("Revoked")}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {preview && (
        <div className="modal-overlay">
          <div className="modal-content" role="dialog" aria-modal="true" aria-label={`${tr('Preview')} ${preview.certificateId}`}
            style={{ width: '90vw', maxWidth: '1100px' }}>
            <div className="section-header">
              <h2>{preview.certificateId}</h2>
              <button className="btn btn-secondary" onClick={() => setPreview(null)}>{tr('Close')}</button>
            </div>
            <iframe title={`${tr('Certificate')} ${preview.certificateId}`} src={preview.pdfData}
              style={{ width: '100%', height: '70vh', border: 0 }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificatesSection;
