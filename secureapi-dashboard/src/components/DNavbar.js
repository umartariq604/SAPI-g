import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaChartLine, FaCog, FaHistory, FaUser, FaSignOutAlt, FaIdBadge, FaShieldAlt } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/DNavbar.css';

const DropdownPortal = ({ anchorRef, show, onViewProfile, onLogout, onClose }) => {
  const [style, setStyle] = useState({});
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (show && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: rect.left,
        minWidth: rect.width,
        zIndex: 2147483647
      });
    }
  }, [show, anchorRef]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && anchorRef.current && !anchorRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, onClose, anchorRef]);

  if (!show) return null;
  return ReactDOM.createPortal(
    <div className="dropdown-menu" ref={dropdownRef} style={style}>
      <button className="dropdown-item" onClick={onViewProfile}>
        <FaIdBadge style={{ marginRight: 8 }} /> View Profile
      </button>
      <button className="dropdown-item" onClick={onLogout}>
        <FaSignOutAlt style={{ marginRight: 8 }} /> Logout
      </button>
    </div>,
    document.body
  );
};

const DashboardNavbar = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const adminBtnRef = useRef(null);

  // Dummy user info (replace with real user info from API/localStorage if available)
  const user = JSON.parse(localStorage.getItem('user')) || {
    firstName: 'Admin',
    lastName: '',
    email: 'admin@example.com',
    role: 'admin'
  };

  const handleLogout = () => {
    setShowDropdown(false);
    setShowProfile(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Prevent both dropdown and modal from being open at the same time
  useEffect(() => {
    if (showProfile && showDropdown) {
      setShowDropdown(false);
    }
  }, [showProfile, showDropdown]);

  return (
    <div className="dashboard-navbar">
      <Link to="/dashboard" className="nav-item">
        <FaChartLine className="nav-icon" />
        <span>Dashboard</span>
      </Link>
      <Link to="/threats" className="nav-item">
        <FaShieldAlt className="nav-icon" />
        <span>Threats</span>
      </Link>
      <Link to="/settings" className="nav-item">
        <FaCog className="nav-icon" />
        <span>Settings</span>
      </Link>
      <Link to="/logs" className="nav-item">
        <FaHistory className="nav-icon" />
        <span>Logs</span>
      </Link>
      <div className="nav-item admin-dropdown" ref={adminBtnRef}>
        <button
          className="admin-btn"
          onClick={() => setShowDropdown((prev) => !prev)}
          style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <FaUser className="nav-icon" />
          <span>Admin</span>
        </button>
      </div>
      <DropdownPortal
        anchorRef={adminBtnRef}
        show={showDropdown}
        onViewProfile={() => { setShowDropdown(false); navigate('/profile'); }}
        onLogout={handleLogout}
        onClose={() => setShowDropdown(false)}
      />
      {/* Profile Modal */}
      {showProfile && (
        <div className="profile-modal" onClick={() => setShowProfile(false)}>
          <div className="profile-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Admin Profile</h3>
            <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {user.role}</p>
            <button onClick={() => setShowProfile(false)} style={{ marginTop: 16 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardNavbar;
