import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function QuizNavBar() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Fetch student data from local storage when component mounts
  useEffect(() => {
    // Try to get student data from storage
    const studentData = localStorage.getItem('studentData');
    if (studentData) {
      try {
        const parsed = JSON.parse(studentData);
        if (parsed.enrollmentId) {
          setEnrollmentId(parsed.enrollmentId);
        }
        if (parsed.name) {
          setStudentName(parsed.name);
        }
        return;
      } catch (e) {
        console.error("Error parsing student data", e);
      }
    }

    // Check if directly stored enrollment ID
    const directEnrollment = localStorage.getItem('enrollmentId');
    if (directEnrollment) {
      setEnrollmentId(directEnrollment);
    }

    // If not found, extract from email if possible
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail && userEmail.includes('@student.bahria.edu.pk')) {
      const id = userEmail.split('@')[0];
      setEnrollmentId(id);
    }

    // Fallback to default if still not set
    setEnrollmentId(prev => prev || 'Student');
    setStudentName(prev => prev || 'Student');
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navbarClasses = `bg-blue-600 text-white shadow-md py-4 fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-opacity-70 backdrop-filter backdrop-blur-md shadow-lg' : ''
    }`;

  const handleLogout = () => {
    // Clear student-specific session data
    localStorage.removeItem('studentAuthToken');
    localStorage.removeItem('studentData');
    localStorage.removeItem('authToken');
    localStorage.removeItem('enrollmentId');
    localStorage.removeItem('userEmail');

    // Navigate to home page after logout
    navigate('/');
  };

  return (
    <>
      <nav className={navbarClasses}>
        <div className="container mx-auto py-0 flex justify-between items-center">
          <Link to="/quiz" className="text-3xl font-bold flex items-center">
            <lord-icon
              src="https://cdn.lordicon.com/exymduqj.json"
              trigger="in"
              delay="1000"
              state="in-reveal"
              colors="primary:#ffffff,secondary:#ffffff"
              style={{ width: '30px', height: '40px', marginRight: '4px' }}
            ></lord-icon>
            Learn-Smart
          </Link>
          <div className="flex space-x-4 items-center">
            <Link to="/quiz" className="hover:text-blue-200 transition">Home</Link>
            <Link to="/quiz/results" className="hover:text-blue-200 transition">Results</Link>

            {/* Student Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center hover:text-blue-200 transition px-1 py-2 rounded-md hover:bg-blue-800"
              >
                <span className="mr-1">{studentName}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                  className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                >
                  <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                </svg>
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                  <div className="py-1">
                    <Link
                      to="/quiz/profile"
                      className="block px-4 py-2 text-gray-800 hover:bg-gray-100"
                      onClick={() => setShowDropdown(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      to="/quiz"
                      className="block px-4 py-2 text-gray-800 hover:bg-gray-100"
                      onClick={() => setShowDropdown(false)}
                    >
                      Back
                    </Link>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        setShowLogoutModal(true);
                      }}
                      className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="font-sans fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Logout</h3>
            <p className="mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default QuizNavBar;