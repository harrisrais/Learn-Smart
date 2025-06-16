import React, { useState, useEffect } from 'react';
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

function StudentProfile() {
  // States for different UI modes
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Student data state
  const [studentData, setStudentData] = useState({
    name: '',
    enrollmentId: '',
    email: '',
  });

  // Form data for editing profile
  const [formData, setFormData] = useState({
    name: '',
  });

  // Password change form data
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const auth = getAuth();

  // Fetch student data on component mount
  useEffect(() => {
    const fetchStudentData = async () => {
      setIsLoading(true);
      try {
        const user = auth.currentUser;
        
        if (!user) {
          // If no authenticated user, try to get data from localStorage
          const storedData = localStorage.getItem('studentData');
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            setStudentData(parsedData);
            setFormData({ name: parsedData.name });
          } else {
            // Try to get enrollment ID directly
            const enrollmentId = localStorage.getItem('enrollmentId');
            const userEmail = localStorage.getItem('userEmail') || 
                             (enrollmentId ? `${enrollmentId}@student.bahria.edu.pk` : '');
            
            setStudentData({
              name: localStorage.getItem('studentName') || 'Student',
              enrollmentId: enrollmentId || 'Not available',
              email: userEmail || 'Not available',
            });
            setFormData({ name: localStorage.getItem('studentName') || 'Student' });
          }
        } else {
          // If user is authenticated, get data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setStudentData({
              name: userData.name,
              enrollmentId: userData.enrollmentId || userData.Enrollment_ID, // Handle both field names
              email: userData.email,
            });
            setFormData({ name: userData.name });
            
            // Save to localStorage for persistence
            localStorage.setItem('studentData', JSON.stringify({
              name: userData.name,
              enrollmentId: userData.enrollmentId || userData.Enrollment_ID,
              email: userData.email,
            }));
            localStorage.setItem('studentName', userData.name);
            localStorage.setItem('enrollmentId', userData.enrollmentId || userData.Enrollment_ID);
            localStorage.setItem('userEmail', userData.email);
          }
        }
      } catch (error) {
        console.error("Error fetching student data:", error);
        setError("Failed to load profile data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentData();
  }, [auth]);

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error("You must be logged in to update your profile");
      }
      
      // Update Firestore document
      await updateDoc(doc(db, 'users', user.uid), {
        name: formData.name,
      });
      
      // Update local state
      setStudentData(prev => ({
        ...prev,
        name: formData.name
      }));
      
      // Update localStorage
      const storedData = localStorage.getItem('studentData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        localStorage.setItem('studentData', JSON.stringify({
          ...parsedData,
          name: formData.name
        }));
      }
      localStorage.setItem('studentName', formData.name);
      
      setSuccess("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      setError(error.message || "Failed to update profile. Please try again.");
    }
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error("You must be logged in to change your password");
      }
      
      // Validate passwords
      if (passwordData.newPassword.length < 6) {
        setError("New password must be at least 6 characters");
        return;
      }
      
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError("New passwords don't match");
        return;
      }
      
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );
      
      await reauthenticateWithCredential(user, credential);
      
      // Change password
      await updatePassword(user, passwordData.newPassword);
      
      setSuccess("Password changed successfully!");
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error("Error changing password:", error);
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/wrong-password':
          setError("Current password is incorrect");
          break;
        case 'auth/weak-password':
          setError("New password is too weak, please use at least 6 characters");
          break;
        case 'auth/requires-recent-login':
          setError("This operation requires recent authentication. Please log in again.");
          break;
        default:
          setError(error.message || "Failed to change password. Please try again.");
      }
    }
  };

  // Cancel editing/password change modes
  const handleCancel = () => {
    setIsEditing(false);
    setIsChangingPassword(false);
    setError('');
    setSuccess('');
    
    // Reset form data to current values
    setFormData({ name: studentData.name });
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="font-sans max-w-4xl mx-auto px-4 py-8 mt-[90px]">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Student Profile</h1>
      
      {/* Success or Error Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <div className="p-6">
          {/* Profile View Mode */}
          {!isEditing && !isChangingPassword && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-700">Personal Information</h2>
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
                >
                  Edit Profile
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row">
                  <div className="font-medium text-gray-500 md:w-1/3">Full Name:</div>
                  <div className="md:w-2/3">{studentData.name}</div>
                </div>
                
                <div className="flex flex-col md:flex-row">
                  <div className="font-medium text-gray-500 md:w-1/3">Enrollment ID:</div>
                  <div className="md:w-2/3">{studentData.enrollmentId}</div>
                </div>
                
                <div className="flex flex-col md:flex-row">
                  <div className="font-medium text-gray-500 md:w-1/3">Email:</div>
                  <div className="md:w-2/3">{studentData.email}</div>
                </div>
                
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Change Password
                  </button>
                  
                </div>
              </div>
            </>
          )}

          {/* Edit Profile Form */}
          {isEditing && (
            <form onSubmit={handleProfileUpdate}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Edit Profile</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enrollment ID
                    </label>
                    <input
                      type="text"
                      value={studentData.enrollmentId}
                      className="w-full px-3 py-2 border rounded-lg bg-gray-100"
                      disabled
                    />
                    <p className="text-sm text-gray-500 mt-1">Enrollment ID cannot be changed</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={studentData.email}
                      className="w-full px-3 py-2 border rounded-lg bg-gray-100"
                      disabled
                    />
                    <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* Change Password Form */}
          {isChangingPassword && (
            <form onSubmit={handlePasswordChange}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Change Password</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password (min 6 characters)
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      minLength={6}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Update Password
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentProfile;