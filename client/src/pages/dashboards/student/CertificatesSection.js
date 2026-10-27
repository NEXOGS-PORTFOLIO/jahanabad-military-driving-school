import { useSiteTranslation, translate as tr } from '../../../hooks/useSiteTranslation';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaCopy, FaCheckCircle, FaSync, FaDownload, FaEye } from 'react-icons/fa';
import api from '../../../utils/api';

const CertificatesSection = () => {
  const { locale } = useSiteTranslation();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCertificates();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchCertificates(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchCertificates = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await api.get('/certificates/my-certificates');
      setCertificates(response.data.data);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      if (!silent) {
        toast.error(tr("Failed to fetch certificates"));
      }
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCertificates();
    toast.info(tr("Refreshing certificates..."));
  };

  const handleCopyCertificateId = (certificateId) => {
    navigator.clipboard.writeText(certificateId);
    toast.success(tr("Certificate ID copied to clipboard"));
  };

  const handleDownloadCertificate = async (recordId, certificateId) => {
    try {
      toast.info(tr("Generating certificate PDF..."));
      const response = await api.get(`/certificates/${recordId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Certificate-${certificateId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(tr("Certificate downloaded successfully!"));
    } catch (error) {
      toast.error(tr("Failed to download certificate"));
    }
  };

  const handlePreviewCertificate = async (certificateId) => {
    try {
      toast.info(tr("Loading certificate preview..."));
      const response = await api.get(`/certificates/${certificateId}/preview`);
      
      // Open PDF in new window
      const pdfWindow = window.open('');
      pdfWindow.document.write(
        `<iframe width='100%' height='100%' src='${response.data.data.pdfData}'></iframe>`
      );
      
      toast.success(tr("Certificate preview opened!"));
    } catch (error) {
      toast.error(tr("Failed to preview certificate"));
    }
  };

  if (loading) return <div>{tr("Loading...")}</div>;

  return (
    <div className="section">
      <div className="section-header">
        <h1>{tr("My Certificate IDs")}</h1>
        <button 
          className="btn btn-secondary" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <FaSync className={refreshing ? 'spin' : ''} /> {refreshing ? tr("Refreshing...") : tr("Refresh")}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{certificates.filter(c => c.status === 'valid').length}</h3>
          <p>{tr("Valid Certificates")}</p>
        </div>
        <div className="stat-card">
          <h3>{certificates.filter(c => c.status === 'revoked').length}</h3>
          <p>{tr("Revoked Certificates")}</p>
        </div>
        <div className="stat-card">
          <h3>{certificates.length}</h3>
          <p>{tr("Total Certificates")}</p>
        </div>
      </div>

      {certificates.length > 0 ? (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>{tr("Certificate ID")}</th>
                <th>{tr("Course")}</th>
                <th>{tr("Batch")}</th>
                <th>{tr("Issue Date")}</th>
                <th>{tr("Status")}</th>
                <th>{tr("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map(cert => (
                <tr key={cert._id}>
                  <td>
                    <strong style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>
                      {cert.certificateId}
                    </strong>
                  </td>
                  <td>{cert.course?.title || tr("N/A")}</td>
                  <td>{cert.batch?.name || cert.batch?.batchNumber || tr("N/A")}</td>
                  <td>{new Date(cert.issuedDate).toLocaleDateString(locale)}</td>
                  <td>
                    <span className={`status-badge ${cert.status === 'revoked' ? 'revoked' : 'valid'}`}>
                      {cert.status === 'revoked' ? (
                        <>{tr("⚠️ Revoked")}</>
                      ) : (
                        <>{tr("✅ Valid")}</>
                      )}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button 
                        className="btn btn-small btn-secondary" 
                        onClick={() => handleCopyCertificateId(cert.certificateId)}
                        title={tr("Copy Certificate ID")}
                      >
                        <FaCopy /> {tr("Copy ID")}</button>
                      {cert.status === 'valid' && (
                        <>
                          <button 
                            className="btn btn-small btn-primary" 
                            onClick={() => handlePreviewCertificate(cert._id)}
                            title={tr("Preview Certificate")}
                          >
                            <FaEye /> {tr("Preview")}</button>
                          <button 
                            className="btn btn-small btn-success" 
                            onClick={() => handleDownloadCertificate(cert._id, cert.certificateId)}
                            title={tr("Download Certificate PDF")}
                          >
                            <FaDownload /> {tr("Download")}</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '10px' }}>
          <FaCheckCircle size={50} color="#ccc" />
          <h3 style={{ marginTop: '1rem', color: '#666' }}>{tr("No Certificates Yet")}</h3>
          <p style={{ color: '#999' }}>{tr("Complete your enrolled courses to receive certificates")}</p>
        </div>
      )}

      {certificates.length > 0 && (
        <div style={{ 
          marginTop: '2rem', 
          padding: '1.5rem', 
          background: '#f8f9fa', 
          borderRadius: '10px',
          borderLeft: '4px solid var(--primary-color)'
        }}>
          <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>{tr("How to Use Your Certificate ID")}</h4>
          <ul style={{ lineHeight: '1.8' }}>
            <li>{tr("Copy your Certificate ID using the \"Copy ID\" button")}</li>
            <li>{tr("Go to the")} <a href="/certificate-verify" style={{ color: 'var(--primary-color)' }}>{tr("Certificate Verify")}</a> {tr("page")}</li>
            <li>{tr("Paste your Certificate ID and complete the verification")}</li>
            <li>{tr("Share your valid certificate with employers or institutions")}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default CertificatesSection;
