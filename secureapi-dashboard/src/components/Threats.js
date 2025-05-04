import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import '../styles/Profile.css';
import '../styles/Responsive.css';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { API_URL, SOCKET_URL } from '../config';

const THREATS_PER_PAGE = 15;

const Threats = () => {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    // Initial fetch of threats
    const fetchThreats = () => {
      axios.get(`${API_URL}/api/threats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          setThreats(res.data);
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to fetch threats');
          setLoading(false);
        });
    };

    fetchThreats();

    // Set up WebSocket connection
    const socket = io(SOCKET_URL, {
      auth: {
        token: token
      }
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('newThreat', (newThreat) => {
      setThreats(prevThreats => [newThreat, ...prevThreats]);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const totalPages = Math.ceil(threats.length / THREATS_PER_PAGE);
  const startIdx = (page - 1) * THREATS_PER_PAGE;
  const endIdx = startIdx + THREATS_PER_PAGE;
  const threatsToShow = threats.slice(startIdx, endIdx);

  const getThreatColor = (threatType) => {
    switch(threatType) {
      case 'SQL Injection':
        return '#ff467e';
      case 'XSS Attack':
        return '#f9ca24';
      case 'Brute Force':
        return '#6c5ce7';
      case 'Port scan':
        return '#00f2c3';
      default:
        return '#fff';
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Threat Monitoring Report', 14, 15);
    
    const tableColumn = ['Detected At', 'Threat Type', 'IP Address', 'Status', 'Confidence'];
    const tableRows = threats.map(threat => [
      new Date(threat.detectedAt).toLocaleString(),
      threat.threatType,
      threat.ip,
      threat.status,
      `${(threat.confidence * 100).toFixed(1)}%`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [108, 92, 231] }
    });

    doc.save('threats-report.pdf');
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      threats.map(threat => ({
        'Detected At': new Date(threat.detectedAt).toLocaleString(),
        'Threat Type': threat.threatType,
        'IP Address': threat.ip,
        'Status': threat.status,
        'Confidence': `${(threat.confidence * 100).toFixed(1)}%`
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Threats');
    XLSX.writeFile(workbook, 'threats-report.xlsx');
  };

  if (loading) return <div className="profile-page"><h2>Threats</h2><p>Loading...</p></div>;
  if (error) return <div className="profile-page"><h2>Threats</h2><p>{error}</p></div>;

  return (
    <div className="responsive-container">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl">Threat Monitoring</h2>
        <div className="responsive-dropdown">
          <button 
            onClick={() => setShowExportOptions(!showExportOptions)}
            className="responsive-button"
            style={{
              background: 'linear-gradient(45deg, var(--primary-color), var(--secondary-color))',
              color: 'var(--text-light)'
            }}
          >
            Export
          </button>
          {showExportOptions && (
            <div className="responsive-dropdown-content p-2">
              <button
                onClick={() => {
                  exportToPDF();
                  setShowExportOptions(false);
                }}
                className="responsive-button mb-2"
                style={{
                  background: 'transparent',
                  color: 'var(--text-light)',
                  border: '1px solid var(--text-muted)'
                }}
              >
                Export as PDF
              </button>
              <button
                onClick={() => {
                  exportToExcel();
                  setShowExportOptions(false);
                }}
                className="responsive-button"
                style={{
                  background: 'transparent',
                  color: 'var(--text-light)',
                  border: '1px solid var(--text-muted)'
                }}
              >
                Export as XLSX
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="responsive-card">
        <div className="responsive-table">
          <table className="logs-table" style={{width: '100%', color: 'var(--text-light)', borderCollapse: 'collapse', fontSize: '1.05rem'}}>
            <thead>
              <tr style={{background: 'rgba(0,242,195,0.08)'}}>
                <th style={{color: 'var(--secondary-color)', position: 'sticky', top: 0, background: 'var(--background-dark)', zIndex: 2, padding: '0.7rem'}}>Detected At</th>
                <th style={{color: 'var(--secondary-color)', position: 'sticky', top: 0, background: 'var(--background-dark)', zIndex: 2, padding: '0.7rem'}}>Threat Type</th>
                <th style={{color: 'var(--secondary-color)', position: 'sticky', top: 0, background: 'var(--background-dark)', zIndex: 2, padding: '0.7rem'}}>IP Address</th>
                <th style={{color: 'var(--secondary-color)', position: 'sticky', top: 0, background: 'var(--background-dark)', zIndex: 2, padding: '0.7rem'}}>Status</th>
                <th style={{color: 'var(--secondary-color)', position: 'sticky', top: 0, background: 'var(--background-dark)', zIndex: 2, padding: '0.7rem'}}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {threatsToShow.map((threat, idx) => (
                <tr key={threat._id || idx} style={{background: idx % 2 === 0 ? 'rgba(36, 44, 62, 0.95)' : 'rgba(30,41,59,0.85)', borderBottom: '1px solid #334155'}}>
                  <td style={{padding: '0.6rem 0.5rem'}}>{threat.detectedAt ? new Date(threat.detectedAt).toLocaleString() : ''}</td>
                  <td style={{padding: '0.6rem 0.5rem', color: getThreatColor(threat.threatType)}}>{threat.threatType}</td>
                  <td style={{padding: '0.6rem 0.5rem'}}>{threat.ip}</td>
                  <td style={{padding: '0.6rem 0.5rem'}}>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: threat.status === 'blocked' ? 'rgba(0,242,195,0.15)' : 'rgba(255,70,126,0.15)',
                      color: threat.status === 'blocked' ? 'var(--secondary-color)' : '#ff467e'
                    }}>
                      {threat.status}
                    </span>
                  </td>
                  <td style={{padding: '0.6rem 0.5rem'}}>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: 'rgba(108,92,231,0.15)',
                      color: 'var(--primary-color)'
                    }}>
                      {(threat.confidence * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-4 gap-3">
            <button 
              onClick={() => setPage(page - 1)} 
              disabled={page === 1} 
              className="responsive-button"
              style={{
                background: 'var(--primary-color)',
                color: 'var(--text-light)',
                opacity: page === 1 ? 0.5 : 1,
                cursor: page === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            <span style={{color: 'var(--secondary-color)', fontWeight: 600}}>Page {page} of {totalPages}</span>
            <button 
              onClick={() => setPage(page + 1)} 
              disabled={page === totalPages} 
              className="responsive-button"
              style={{
                background: 'var(--primary-color)',
                color: 'var(--text-light)',
                opacity: page === totalPages ? 0.5 : 1,
                cursor: page === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        )}

        <button 
          onClick={() => navigate('/dashboard')} 
          className="responsive-button mt-4"
          style={{
            background: 'linear-gradient(45deg, var(--primary-color), var(--secondary-color))',
            color: 'var(--text-light)',
            margin: '0 auto',
            display: 'block'
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Threats; 