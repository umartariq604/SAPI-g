import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Profile.css';
import { API_URL } from '../config';

const Profile = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      return;
    }
    axios.get(`${API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  if (!user) {
    return (
      <div className="profile-page">
        <h2>Profile</h2>
        <p>No user is logged in.</p>
        <button onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <h2>Admin Profile</h2>
      <div className="profile-avatar">
        {user.email ? user.email[0].toUpperCase() : 'A'}
      </div>
      <div className="profile-info">
        <p><strong>User ID:</strong> {user._id}</p>
        <p><strong>First Name:</strong> {user.firstName}</p>
        <p><strong>Last Name:</strong> {user.lastName}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
        <p><strong>Created At:</strong> {user.createdAt ? new Date(user.createdAt).toLocaleString() : ''}</p>
        <p><strong>Last Login:</strong> {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : ''}</p>
        <p><strong>Active:</strong> {user.isActive ? 'Yes' : 'No'}</p>
      </div>
      <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
    </div>
  );
};

export default Profile; 