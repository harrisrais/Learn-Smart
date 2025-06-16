import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User, Lock, Mail, AlertCircle, CheckCircle, Loader, BookOpen, Briefcase, ArrowRight, School } from 'lucide-react';

function FacultyLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [notification, setNotification] = useState({ type: '', message: '' });
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
          formData.email,
          formData.password
        );

        const token = await userCredential.user.getIdToken();
        localStorage.setItem('authToken', token);
        localStorage.setItem('facultyAuthToken', token);
        localStorage.setItem('userEmail', formData.email);

        setNotification({
          type: 'success',
          message: 'Login successful! Redirecting to dashboard...'
        });
        
        setTimeout(() => navigate('/teacher'), 1500);
      } else {
        // Signup logic
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        // Store faculty data in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: formData.name,
          email: formData.email,
          role: 'teacher',
          createdAt: serverTimestamp()
        });

        setNotification({
          type: 'success',
          message: 'Account created successfully! You can now login with your credentials.'
        });
        
        setTimeout(() => {
          setNotification({ type: '', message: '' });
          setIsLogin(true);
          setFormData(prev => ({
            ...prev,
            password: '',
            confirmPassword: ''
          }));
        }, 2000);
      }
    } catch (error) {
      let errorMessage = 'Authentication failed';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email address is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email format';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        default:
          errorMessage = error.message || 'Authentication failed';
      }

      setNotification({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setNotification({ type: '', message: '' });

    // Validate form inputs
    if (!isLogin) {
      if (!formData.name.trim()) {
        setNotification({
          type: 'error',
          message: 'Full name is required'
        });
        return;
      }
    }

    if (!formData.email.trim()) {
      setNotification({
        type: 'error',
        message: 'Email address is required'
      });
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(formData.email)) {
      setNotification({
        type: 'error',
        message: 'Please enter a valid email address'
      });
      return;
    }

    if (formData.password.length < 6) {
      setNotification({
        type: 'error',
        message: 'Password must be at least 6 characters'
      });
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setNotification({
        type: 'error',
        message: 'Passwords do not match'
      });
      return;
    }

    handleAuth();
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setNotification({ type: '', message: '' });
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
      {/* Background animated elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none style={{zIndex: -1}}">
        <div className="absolute top-10 right-10 w-32 h-32 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 left-10 w-32 h-32 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-10 right-1/3 w-32 h-32 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className={`flex flex-col md:flex-row w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden z-10 transition-all duration-500 ${mounted ? 'opacity-100 transform-none' : 'opacity-0 transform translate-y-12'}`}>
        {/* Left panel - only visible on medium screens and up */}
        <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-indigo-600 to-purple-800 p-12 flex-col justify-between relative">
          <div>
            <div className="flex items-center mb-8">
              <BookOpen className="h-10 w-10 text-white mr-4" />
              <h1 className="text-[27px] font-bold text-white">Faculty-Login</h1>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Welcome to your Mangaing Journey</h2>
            <p className="text-indigo-100 mb-6">Create and manage quizzes, track student progress, and enhance your teaching effectiveness.</p>
          </div>
          
          <div className="relative z-10">
            <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
              <div className="flex items-center mb-4">
                <Briefcase className="h-6 w-6 text-indigo-200 mr-3" />
                <h3 className="text-xl font-semibold text-white">Faculty Dashboard</h3>
              </div>
              <p className="text-indigo-100 text-sm">{isLogin ? "Sign in to access your teaching tools and resources" : "Join our platform to unlock powerful teaching tools"}</p>
            </div>
          </div>
          
          {/* Decorative circles */}
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full transform translate-x-1/3 translate-y-1/3"></div>
          <div className="absolute top-1/4 right-0 w-32 h-32 bg-white/5 rounded-full"></div>
        </div>

        {/* Right panel - Form */}
        <div className="w-full md:w-3/5 p-8 md:p-12">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              {isLogin ? 'Login to Faculty Dashboard' : 'Create Faculty Account'}
            </h2>
            <p className="text-gray-600">
              {isLogin 
                ? "Enter your credentials to access your teaching tools and resources" 
                : "Register to start creating quizzes and managing student progress"}
            </p>
          </div>

          {/* Notifications */}
          {notification.message && (
            <div className={`mb-6 flex items-center p-4 ${
              notification.type === 'error' 
                ? 'bg-red-50 border-l-4 border-red-500' 
                : 'bg-green-50 border-l-4 border-green-500'
              } rounded-md animate-fadeIn`}>
              {notification.type === 'error' ? (
                <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
              )}
              <span className={notification.type === 'error' ? 'text-red-700' : 'text-green-700'}>
                {notification.message}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="group">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    required
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Dr. John Doe"
                  />
                </div>
              </div>
            )}

            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="faculty@example.com"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {!isLogin && '(min 6 characters)'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  minLength={6}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="group">
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    required
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
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
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-3 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-800 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70 shadow-lg group"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                  {isLogin ? 'Logging in...' : 'Creating account...'}
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  {isLogin ? 'Login' : 'Create Account'}
                  <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-gray-600 text-center">
              {isLogin ? "New to Learn-Smart?" : "Already have an account?"}
              <button
                type="button"
                onClick={toggleAuthMode}
                className="ml-1 text-indigo-600 hover:text-indigo-800 font-medium focus:outline-none hover:underline transition-colors"
              >
                {isLogin ? 'Create faculty account' : 'Login to your account'}
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

export default FacultyLogin;