import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingHeader from './Components/LandingHeader';
import LandingFooter from './Components/LandingFooter';
import Home from './Components/Home';
import TeacherDashboard from './Components/TeacherDashboard';
import StudentLogin from './Components/StudentLogin';
import TopicSelection from './Components/TopicSelection';
import QuizScreen from './Components/QuizScreen';
import Results from './Components/Results';
import QuizNavBar from './Components/QuizNavBar';
import StudentProfile from './Components/StudentProfile';
import FacultyLogin from './Components/FacultyLogin';
import QuizFooter from './Components/QuizFooter';
import FacultyNavBar from './Components/FacultyNavBar';
import ProtectedRoute from './Components/ProtectedRoute';
import TeacherProfile from './Components/TeacherProfile';
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    fetch('http://localhost:5000/api/test')
      .then(response => response.json())
      .then(data => setIsConnected(data.status === 'success'))
      .catch(() => setIsConnected(false));
  }, []);

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={
            <>
              <LandingHeader />
              <Home />
            </>
          } />

          {/* Auth routes */}
          <Route path="/login/student" element={
            <>
              <LandingHeader />
              <StudentLogin />
              <LandingFooter />
            </>
          } />
          <Route path="/login/teacher" element={
            <>
              <LandingHeader />
              <FacultyLogin />
              <LandingFooter />
            </>
          } />

          {/* Teacher dashboard and profile */}
          <Route path="/teacher/*" element={
            <ProtectedRoute role="teacher"> 
                <Routes>
                  <Route index element={<TeacherDashboard />} />
                  <Route path="profile" element={<TeacherProfile />} />
                </Routes>
            </ProtectedRoute>
          } />

          {/* Quiz routes */}
          <Route path="/quiz/*" element={
            <ProtectedRoute role="student">
              <QuizNavBar />
              <div>
                {!isConnected && <ConnectionError />}
                <Routes>
                  <Route index element={<TopicSelection />} />
                  <Route path="screen" element={<QuizScreen />} />
                  <Route path="results" element={<Results />} />
                  <Route path="profile" element={<StudentProfile />} />
                </Routes>
              </div>
              <QuizFooter />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

function ConnectionError() {
  return (
    <div className="connection-error bg-red-100 p-4 mb-4 rounded-lg">
      <p>Cannot connect to the backend server. Please make sure it's running at http://localhost:5000</p>
    </div>
  );
}

export default App;