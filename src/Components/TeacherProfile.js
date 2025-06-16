import React, { useState, useEffect } from 'react';
import { getAuth, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import FacultyNavBar from './FacultyNavBar'; // Import the NavBar component

function TeacherProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [authPassword, setAuthPassword] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const auth = getAuth();

  useEffect(() => {
    const fetchTeacherData = async () => {
      setIsLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfileData({
            name: data.name,
            email: data.email,
            createdAt: data.createdAt,
            role: data.role
          });
          setFormData({
            name: data.name,
            email: data.email
          });
        } else {
          setProfileData({});
        }
      } catch (error) {
        console.error("Error fetching teacher data:", error);
        setError("Failed to load profile data");
        setProfileData({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeacherData();
  }, [auth]);

  const updateRelatedDocuments = async (oldName, newName) => {
    const batch = writeBatch(db);

    const questionsQuery = query(
      collection(db, 'questions'),
      where('createdBy', '==', oldName)
    );
    const questionsSnapshot = await getDocs(questionsQuery);
    questionsSnapshot.forEach(doc => {
      batch.update(doc.ref, { createdBy: newName });
    });

    const resultsQuery = query(
      collection(db, 'examResults'),
      where('teacher', '==', oldName)
    );
    const resultsSnapshot = await getDocs(resultsQuery);
    resultsSnapshot.forEach(doc => {
      batch.update(doc.ref, { teacher: newName });
    });

    await batch.commit();
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Authentication required");

      const updates = {};
      let emailChanged = false;
      let nameChanged = false;

      if (formData.name !== profileData?.name) {
        updates.name = formData.name;
        nameChanged = true;
      }

      if (formData.email !== profileData?.email) {
        if (!authPassword) {
          setShowEmailAuth(true);
          return;
        }

        const credential = EmailAuthProvider.credential(user.email, authPassword);
        await reauthenticateWithCredential(user, credential);
        await updateEmail(user, formData.email);
        updates.email = formData.email;
        emailChanged = true;
      }

      if (Object.keys(updates).length > 0) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, updates);

        if (nameChanged) {
          await updateRelatedDocuments(profileData.name, formData.name);
        }
      }

      setProfileData(prev => ({
        ...prev,
        ...updates
      }));

      setSuccess("Profile updated successfully!");
      setIsEditing(false);
      setAuthPassword('');
      setShowEmailAuth(false);
    } catch (error) {
      console.error("Update error:", error);
      setAuthPassword('');
      setShowEmailAuth(false);

      switch (error.code) {
        case 'auth/email-already-in-use':
          setError("Email is already in use");
          break;
        case 'auth/invalid-email':
          setError("Invalid email address");
          break;
        case 'auth/wrong-password':
          setError("Incorrect password");
          break;
        case 'auth/requires-recent-login':
          setError("This operation requires recent authentication. Please log in again.");
          break;
        default:
          setError(error.message || "Failed to update profile");
      }
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Authentication required");

      if (passwordData.newPassword.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordData.newPassword);

      setSuccess("Password changed successfully!");
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error("Password change error:", error);
      switch (error.code) {
        case 'auth/wrong-password':
          setError("Incorrect current password");
          break;
        case 'auth/weak-password':
          setError("New password is too weak");
          break;
        default:
          setError(error.message || "Password change failed");
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsChangingPassword(false);
    setShowEmailAuth(false);
    setError('');
    setSuccess('');
    setFormData({
      name: profileData?.name || '',
      email: profileData?.email || ''
    });
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setAuthPassword('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 w-screen overflow-x-hidden">
        <FacultyNavBar />
        <div className="flex justify-center items-center mt-12 w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gray-50 w-screen overflow-x-hidden">
        <FacultyNavBar />
        <div className="font-sans w-full px-4 py-8">
          <div className="max-w-4xl mx-auto">Error loading profile.</div>
        </div>
      </div>
    );
  }

  const createdAt = profileData?.createdAt;
  const formattedDate = createdAt instanceof Timestamp
    ? createdAt.toDate().toLocaleDateString()
    : createdAt instanceof Date
      ? createdAt.toLocaleDateString()
      : createdAt ? new Date(createdAt).toLocaleDateString() : 'N/A';

  return (
    <div className="min-h-screen bg-gray-50 w-screen overflow-x-hidden">
      <FacultyNavBar />
      <div className="font-sans w-full px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 max-w-4xl mx-auto">Faculty Profile</h1>

        {error && <div className="bg-red-100 border-red-400 text-red-700 p-3 rounded mb-4 max-w-4xl mx-auto">{error}</div>}
        {success && <div className="bg-green-100 border-green-400 text-green-700 p-3 rounded mb-4 max-w-4xl mx-auto">{success}</div>}

        {showEmailAuth && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96">
              <h3 className="text-lg font-semibold mb-4">Confirm Password</h3>
              <p className="mb-4">Please enter your current password to update your email:</p>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg mb-4"
                placeholder="Current Password"
                autoFocus
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowEmailAuth(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProfileUpdate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6 max-w-4xl mx-auto">
          <div className="p-6">
            {!isEditing && !isChangingPassword ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-700">Profile Information</h2>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  >
                    Edit Profile
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row">
                    <div className="font-medium text-gray-500 md:w-1/3">Full Name:</div>
                    <div className="md:w-2/3">{profileData?.name || 'N/A'}</div>
                  </div>
                  <div className="flex flex-col md:flex-row">
                    <div className="font-medium text-gray-500 md:w-1/3">Email:</div>
                    <div className="md:w-2/3">{profileData?.email || 'N/A'}</div>
                  </div>
                  <div className="flex flex-col md:flex-row">
                    <div className="font-medium text-gray-500 md:w-1/3">Account Created:</div>
                    <div className="md:w-2/3">
                      {formattedDate}
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row">
                    <div className="font-medium text-gray-500 md:w-1/3">Role:</div>
                    <div className="md:w-2/3 capitalize">{profileData?.role || 'N/A'}</div>
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
            ) : isEditing ? (
              <form onSubmit={handleProfileUpdate}>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Edit Profile</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordChange}>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Change Password</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      minLength={6}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Update Password
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-600 max-w-4xl mx-auto">
          <p>&copy; 2025 Faculty Dashboard. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

export default TeacherProfile;