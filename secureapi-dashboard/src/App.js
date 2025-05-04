// App.js
import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import OAuthCallback from './components/OAuthCallback';
import Profile from './components/Profile';
import Logs from './components/Logs';
import Threats from './components/Threats';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const location = useLocation();
  const showNavbar = !['/login', '/register', '/dashboard'].includes(location.pathname);

  useEffect(() => {
    // Check for existing token on initial load
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <div>
      {showNavbar && <Navbar />}

      <Routes>
        <Route
          path="/login"
          element={
            isLoggedIn ? <Navigate to="/dashboard" /> : <Login setIsLoggedIn={setIsLoggedIn} />
          }
        />
        <Route
          path="/register"
          element={
            isLoggedIn ? <Navigate to="/dashboard" /> : <Register setIsLoggedIn={setIsLoggedIn} />
          }
        />
        <Route
          path="/dashboard"
          element={
            isLoggedIn ? <Dashboard setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/auth/callback"
          element={<OAuthCallback setIsLoggedIn={setIsLoggedIn} />}
        />
        <Route
          path="/profile"
          element={<Profile />}
        />
        <Route
          path="/logs"
          element={<Logs />}
        />
        <Route
          path="/threats"
          element={<Threats />}
        />
        <Route
          path="/"
          element={<Navigate to="/login" />}
        />
      </Routes>
    </div>
  );
};

export default App;
