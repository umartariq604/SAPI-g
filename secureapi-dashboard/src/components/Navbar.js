import React from 'react';
import '../styles/Navbar.css';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="top-nav">
      <Link to="/about" className="nav-link">About Us</Link>
      <Link to="/contact" className="nav-link">Contact</Link>
      <Link to="/signup" className="nav-link">Sign Up</Link>
    </nav>
  );
};

export default Navbar;
