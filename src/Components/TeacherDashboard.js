import StudentsTab from './StudentsTab';
import QuestionsBankTab from './QuestionsBankTab';
import AnalyticsTab from './AnalyticsTab';
import FacultyNavBar from './FacultyNavBar';
import LandingFooter from './LandingFooter';
import React, { useState, useEffect} from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {auth,  db} from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const TeacherDashboard = () => {
  const [activeTab, setActiveTab] = useState('students');
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [user, loading] = useAuthState(auth);

  useEffect(() => {
    let unsubscribe;
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          setUserData(doc.data());
        }
      }, (error) => {
        console.error('Error fetching user data:', error);
        setError('Failed to load user data');
      });
    }
    return () => unsubscribe && unsubscribe();
  }, [user]);

  const tabs = [
    { 
      id: 'students', 
      label: 'Students', 
      icon: '👥',
      description: 'Manage and track student progress'
    },
    { 
      id: 'questions', 
      label: 'Question Bank', 
      icon: '📚',
      description: 'Create and manage quiz questions'
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: '📊',
      description: 'View detailed performance analytics'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <FacultyNavBar />
        <div className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-slate-600 text-lg font-medium">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header with proper z-index */}
      <div className="relative z-50">
        <FacultyNavBar />
      </div>
      
      {/* Main Content with Background */}
      <div className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-emerald-400/20 to-blue-600/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        <div className="relative z-10 min-h-full w-full">
          <div className="w-full px-4 py-6 max-w-7xl mx-auto">
            {/* Enhanced Header Section */}
            <div className="mb-8">
              <div className="backdrop-blur-sm bg-white/80 rounded-3xl p-8 shadow-xl border border-white/30">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div className="mb-4 lg:mb-0">
                    <h1 className="text-3xl lg:text-5xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2">
                      {userData?.name ? `${userData.name}'s Dashboard` : 'Faculty Dashboard'}
                    </h1>
                    <p className="text-slate-600 text-lg leading-relaxed">
                      Welcome back! Manage your classes and track student progress with advanced analytics.
                    </p>
                    <div className="flex items-center mt-3 space-x-4 text-sm text-slate-500">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Online
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Last active: {new Date().toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="hidden lg:flex flex-col items-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                        {userData?.name ? userData.name.charAt(0).toUpperCase() : 'F'}
                      </div>
                    
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50/90 backdrop-blur-sm border border-red-200/70 text-red-800 rounded-xl shadow-lg animate-pulse">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-red-500">⚠️</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Error</h4>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Tab Navigation */}
            <div className="mb-8">
              <div className="backdrop-blur-sm bg-white/70 rounded-3xl p-3 shadow-xl border border-white/40">
                <nav className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      className={`
                        group relative flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-3 px-6 py-4 rounded-2xl font-semibold transition-all duration-300 ease-out
                        ${activeTab === tab.id 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 transform scale-105' 
                          : 'text-slate-600 hover:bg-white/60 hover:text-slate-800 hover:shadow-md hover:scale-102'
                        }
                      `}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <span className="text-2xl">{tab.icon}</span>
                      <div className="text-center sm:text-left">
                        <span className="font-medium block">{tab.label}</span>
                        <span className={`text-xs ${activeTab === tab.id ? 'text-white/80' : 'text-slate-500'} hidden sm:block`}>
                          {tab.description}
                        </span>
                      </div>
                      
                      {/* Active indicator */}
                      {activeTab === tab.id && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 blur-lg -z-10"></div>
                      )}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Content Area with proper z-index */}
            <div className="relative z-20 w-full">
              <div className="backdrop-blur-sm bg-white/80 rounded-3xl shadow-2xl border border-white/30 overflow-hidden">
                {/* Tab Content Header */}
                <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-white/20 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                        <span className="text-3xl mr-3">
                          {tabs.find(tab => tab.id === activeTab)?.icon}
                        </span>
                        {tabs.find(tab => tab.id === activeTab)?.label}
                      </h2>
                      <p className="text-slate-600 mt-1">
                        {tabs.find(tab => tab.id === activeTab)?.description}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-slate-500">Live Data</span>
                    </div>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-8">
                  <div className="animate-fadeIn w-full">
                    {activeTab === 'students' && <StudentsTab />}
                    {activeTab === 'questions' && <QuestionsBankTab />}
                    {activeTab === 'analytics' && <AnalyticsTab />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10">
        <LandingFooter />
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          /* Reset any default margins/padding */
          * {
            box-sizing: border-box;
          }
          
          body, html {
            margin: 0;
            padding: 0;
            overflow-x: hidden;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.6s ease-out;
          }
          
          /* Custom scrollbar */
          ::-webkit-scrollbar {
            width: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.5);
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #3b82f6, #6366f1);
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, #2563eb, #4f46e5);
          }
          
          /* Remove any unwanted spacing */
          .container {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          
          /* Ensure proper z-index stacking */
          .relative {
            position: relative;
          }
          
          /* Hover scale animation */
          .hover\\:scale-102:hover {
            transform: scale(1.02);
          }
          
          /* Enhanced backdrop blur */
          .backdrop-blur-sm {
            backdrop-filter: blur(12px);
          }
          
          /* Enhanced shadows */
          .shadow-xl {
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }
          
          .shadow-2xl {
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }
          
          /* Gradient text animation */
          @keyframes gradient-x {
            0%, 100% {
              background-size: 200% 200%;
              background-position: left center;
            }
            50% {
              background-size: 200% 200%;
              background-position: right center;
            }
          }
          
          .bg-gradient-to-r {
            background-size: 200% 200%;
            animation: gradient-x 3s ease infinite;
          }
        `
      }} />
    </div>
  );
};

export default TeacherDashboard;