import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from '../firebase';
import { User, Lock, AlertCircle, CheckCircle, Loader, Book, School, ArrowRight } from 'lucide-react';

function StudentLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    Enrollment_ID: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  // Animation effect when component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    try {
      if (isLogin) {
        // Login logic
        const userCredential = await signInWithEmailAndPassword(
          auth,
          `${formData.Enrollment_ID}@student.bahria.edu.pk`,
          formData.password
        );

        const token = await userCredential.user.getIdToken();
        localStorage.setItem('authToken', token);
        localStorage.setItem('studentAuthToken', token);

        // Fetch user data from Firestore to store locally
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          localStorage.setItem('studentData', JSON.stringify({
            name: userData.name,
            enrollmentId: userData.enrollmentId || userData.Enrollment_ID || formData.Enrollment_ID,
            email: userData.email || `${formData.Enrollment_ID}@student.bahria.edu.pk`,
          }));
          localStorage.setItem('studentName', userData.name);
          localStorage.setItem('enrollmentId', userData.enrollmentId || userData.Enrollment_ID || formData.Enrollment_ID);
          localStorage.setItem('userEmail', userData.email || `${formData.Enrollment_ID}@student.bahria.edu.pk`);
        } else {
          localStorage.setItem('enrollmentId', formData.Enrollment_ID);
          localStorage.setItem('userEmail', `${formData.Enrollment_ID}@student.bahria.edu.pk`);
        }

        setSuccess('Login successful! Redirecting...');
        setTimeout(() => navigate('/quiz'), 1000);
      } else {
        // Signup logic
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          `${formData.Enrollment_ID}@student.bahria.edu.pk`,
          formData.password
        );

        await setDoc(doc(db, 'users', userCredential.user.uid), {
          enrollmentId: formData.Enrollment_ID,
          Enrollment_ID: formData.Enrollment_ID,
          name: formData.name,
          email: `${formData.Enrollment_ID}@student.bahria.edu.pk`,
          role: 'student',
          topicsMastery: {},
          examResults: [],
          createdAt: new Date(),
        });

        localStorage.setItem('studentData', JSON.stringify({
          name: formData.name,
          enrollmentId: formData.Enrollment_ID,
          email: `${formData.Enrollment_ID}@student.bahria.edu.pk`,
        }));
        localStorage.setItem('studentName', formData.name);
        localStorage.setItem('enrollmentId', formData.Enrollment_ID);
        localStorage.setItem('userEmail', `${formData.Enrollment_ID}@student.bahria.edu.pk`);

        const token = await userCredential.user.getIdToken();
        localStorage.setItem('authToken', token);
        localStorage.setItem('studentAuthToken', token);

        setSuccess('Signup successful! Redirecting to login...');
        setTimeout(() => {
          setSuccess(''); 
          setIsLogin(true);
          setFormData(prev => ({
            ...prev,
            password: '',
            confirmPassword: ''
          }));
        }, 1000);
      }
    } catch (error) {
      let errorMessage = 'Authentication failed';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This enrollment ID is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid enrollment ID format';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this enrollment ID';
          break;
        default:
          errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isLogin) {
      // Signup validation
      if (!formData.name) {
        setError('Full name is required');
        return;
      }
      if (!formData.Enrollment_ID) {
        setError('Enrollment ID is required');
        return;
      }
      if (!/^\d{2}-\d{6}-\d{3}$/.test(formData.Enrollment_ID)) {
        setError('Enrollment ID must be in format 01-134212-162');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    } else {
      // Login validation
      if (!formData.Enrollment_ID) {
        setError('Enrollment ID is required');
        return;
      }
      if (!formData.password) {
        setError('Password is required');
        return;
      }
    }

    handleAuth();
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError(''); 
    setSuccess('');
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      Enrollment_ID: formData.Enrollment_ID
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 relative">
      {/* Background animated elements - Fixed z-index and pointer-events */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" style={{zIndex: -1}}>
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-32 h-32 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-10 left-1/3 w-32 h-32 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className={`flex flex-col md:flex-row w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden relative transition-all duration-500 ${mounted ? 'opacity-100 transform-none' : 'opacity-0 transform translate-y-12'}`} style={{zIndex: 10}}>
        {/* Left panel - only visible on medium screens and up */}
        <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-blue-600 to-indigo-800 p-12 flex-col justify-between relative">
          <div>
            <div className="flex items-center mb-8">
              <Book className="h-10 w-10 text-white mr-4" />
              <h1 className="text-[27px] font-bold text-white">Student-Login</h1>
            </div>
            <h2 className="text-2xl font-bold text-white mb-6">Welcome to your learning journey</h2>
            <p className="text-blue-100 mb-6">Access personalized quizzes, track your progress, and enhance your academic performance.</p>
          </div>
          
          <div className="relative z-10">
            <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
              <div className="flex items-center mb-4">
                <School className="h-6 w-6 text-blue-200 mr-3" />
                <h3 className="text-xl font-semibold text-white">Student Portal</h3>
              </div>
              <p className="text-blue-100 text-sm">{isLogin ? "Sign in to access your personalized learning dashboard" : "Join our learning platform to boost your academic success"}</p>
            </div>
          </div>
          
          {/* Decorative circles - Fixed z-index */}
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full transform translate-x-1/3 translate-y-1/3" style={{zIndex: -1}}></div>
          <div className="absolute top-1/4 right-0 w-32 h-32 bg-white/5 rounded-full" style={{zIndex: -1}}></div>
        </div>

        {/* Right panel - Form */}
        <div className="w-full md:w-3/5 p-8 md:p-12 relative" style={{zIndex: 20}}>
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              {isLogin ? 'Login to Your Account' : 'Create Your Account'}
            </h2>
            <p className="text-gray-600">
              {isLogin 
                ? "Enter your credentials to access your personalized learning dashboard" 
                : "Register to start your personalized learning journey"}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 flex items-center p-4 bg-red-50 border-l-4 border-red-500 rounded-md animate-fadeIn">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 flex items-center p-4 bg-green-50 border-l-4 border-green-500 rounded-md animate-fadeIn">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
              <span className="text-green-700">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="group">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    required
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={formData.Enrollment_ID}
                  onChange={(e) => setFormData({ ...formData, Enrollment_ID: e.target.value })}
                  placeholder="e.g., 01-134212-162"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Format: XX-XXXXXX-XXX</p>
            </div>

            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={isLogin ? "Enter your password" : "Create a password (min. 6 characters)"}
                  minLength={6}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="group">
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    required
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm your password"
                    minLength={6}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 shadow-lg group relative"
              style={{zIndex: 30}}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                  {isLogin ? 'Logging in...' : 'Signing up...'}
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  {isLogin ? 'Login' : 'Sign Up'}
                  <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 relative" style={{zIndex: 30}}>
            <p className="text-gray-600 text-center">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={toggleAuthMode}
                className="ml-1 text-blue-600 hover:text-blue-800 font-medium focus:outline-none hover:underline transition-colors relative"
                style={{zIndex: 40}}
              >
                {isLogin ? 'Sign up here' : 'Login here'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Add CSS for animations */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -20px) scale(1.1); }
          50% { transform: translate(0, 20px) scale(1); }
          75% { transform: translate(-20px, -20px) scale(0.9); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default StudentLogin;