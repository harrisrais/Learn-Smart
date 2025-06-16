import React from 'react';
import { Link } from 'react-router-dom';

function LandingHeader() {
  return (
    <header className="font-sans bg-blue-600 text-white shadow-md">
      <div className="container mx-auto py-3 flex justify-between items-center">
        <Link to="/" className="text-3xl font-bold flex items-center space-x-6">
          <lord-icon
            src="https://cdn.lordicon.com/exymduqj.json"
            trigger="always"
            delay="1000"
            state="in-reveal"
            colors="primary:#ffffff,secondary:#ffffff"
            style={{ width: '30px', height: '40px', marginRight: '4px' }}
          ></lord-icon>
          Learn-Smart</Link>
        <nav className="flex space-x-6">
          <Link to="/" className="hover:text-blue-200 transition">Home</Link>
          <Link to="/login/student" className="hover:text-blue-200 transition">Student</Link>
          <Link to="/login/teacher" className="hover:text-blue-200 transition">Faculty</Link>
        </nav>
      </div>
    </header>
  );
}

export default LandingHeader;