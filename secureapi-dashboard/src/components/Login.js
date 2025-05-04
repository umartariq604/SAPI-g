import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Login.css';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

const Login = ({ setIsLoggedIn }) => {
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let THREE;
    let renderer, scene, camera, sphere1, sphere2, glow1, glow2, animationId, clock;
    let canvas = document.getElementById('three-bg');

    function getPositions(width) {
      // Move spheres even further to the right
      const cameraX = (width / window.innerHeight) * 8;
      const sphere1X = (width / window.innerHeight) * 10;
      const sphere2X = (width / window.innerHeight) * 8.2;
      return { cameraX, sphere1X, sphere2X };
    }

    async function init() {
      THREE = await import('three');
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.z = 4;
      const { cameraX, sphere1X, sphere2X } = getPositions(width);
      camera.position.x = cameraX;

      // Sphere 1
      const geometry1 = new THREE.SphereGeometry(1.2, 32, 32);
      const material1 = new THREE.MeshBasicMaterial({ color: 0x00fff7, wireframe: true });
      sphere1 = new THREE.Mesh(geometry1, material1);
      sphere1.position.x = sphere1X;
      scene.add(sphere1);
      // Glow 1
      const glowMaterial1 = new THREE.MeshBasicMaterial({ color: 0x00f2c3, wireframe: true, opacity: 0.15, transparent: true });
      glow1 = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), glowMaterial1);
      glow1.position.x = sphere1X;
      scene.add(glow1);

      // Sphere 2
      const geometry2 = new THREE.SphereGeometry(1.2, 32, 32);
      const material2 = new THREE.MeshBasicMaterial({ color: 0x6c5ce7, wireframe: true });
      sphere2 = new THREE.Mesh(geometry2, material2);
      sphere2.position.x = sphere2X;
      scene.add(sphere2);
      // Glow 2
      const glowMaterial2 = new THREE.MeshBasicMaterial({ color: 0x6c5ce7, wireframe: true, opacity: 0.12, transparent: true });
      glow2 = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), glowMaterial2);
      glow2.position.x = sphere2X;
      scene.add(glow2);

      clock = new THREE.Clock();
      function animate() {
        animationId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        // Sphere 1 animation
        sphere1.rotation.x += 0.01;
        sphere1.rotation.y += 0.012;
        sphere1.position.y = Math.sin(t) * 0.3;
        glow1.position.y = Math.sin(t) * 0.3;
        // Sphere 2 animation (different phase and amplitude)
        sphere2.rotation.x -= 0.012;
        sphere2.rotation.y += 0.009;
        sphere2.position.y = Math.cos(t + 1.2) * 0.35;
        glow2.position.y = Math.cos(t + 1.2) * 0.35;
        renderer.render(scene, camera);
      }
      animate();
    }

    function onResize() {
      if (!renderer || !camera || !sphere1 || !sphere2) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      const { cameraX, sphere1X, sphere2X } = getPositions(width);
      camera.position.x = cameraX;
      sphere1.position.x = sphere1X;
      glow1.position.x = sphere1X;
      sphere2.position.x = sphere2X;
      glow2.position.x = sphere2X;
      camera.updateProjectionMatrix();
    }

    if (canvas) init();
    window.addEventListener('resize', onResize);
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (renderer) renderer.dispose && renderer.dispose();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/login`, loginData);
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        setIsLoggedIn(true);
        navigate('/Dashboard');
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    }
  };

  return (
    <div className="page-border-wrapper">
      <div className="login-center-wrapper" style={{ position: 'relative', overflow: 'hidden', marginLeft: '-24vw' }}>
        <canvas id="three-bg"></canvas>
        <div className="login-container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="cyber-border"></div>
          <form onSubmit={handleLogin}>
            <div className="login-header">
              <div style={{ fontSize: '2.2rem', marginBottom: '0.2rem' }}>👋</div>
              <h1 className="login-title">SAPI-G</h1>
              <p className="login-subtitle">Admin Login</p>
            </div>
            <div className="form-group">
              <input
                type="email"
                className="form-input"
                required
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              />
              <label className="input-label">Email</label>
            </div>
            <div className="form-group password-container">
              <input
                type={showLoginPassword ? 'text' : 'password'}
                className="form-input"
                required
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              />
              <label className="input-label">Password</label>
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
              >
                👁
              </button>
            </div>
            {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
            <button type="submit" className="login-btn">Login</button>
            <a
              href={`${API_URL}/auth/google`}
              className="google-login-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '0.5rem', textDecoration: 'none' }}
            >
              <img
                src="https://www.google.com/favicon.ico"
                alt="Google"
                style={{ width: '20px', height: '20px', marginRight: '10px' }}
              />
              Login with Google
            </a>
            <div className="toggle-form-container">
              <button
                type="button"
                className="toggle-form-btn"
                onClick={() => navigate('/register')}
              >
                Create new admin account
              </button>
            </div>
            <div className="security-tag">AI-Powered Threat Detection Active</div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
