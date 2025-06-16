// src/Components/AdminDashboard.js
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

function AdminDashboard() {
  const [pendingFaculty, setPendingFaculty] = useState([]);

  useEffect(() => {
    const fetchPending = async () => {
      const snapshot = await getDocs(collection(db, 'faculty_pending'));
      setPendingFaculty(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchPending();
  }, []);

  const approveFaculty = async (email, username) => {
    try {
      // 1. Add to faculty_usernames
      await setDoc(doc(db, 'faculty_usernames', username.toLowerCase()), {
        email,
        approvedAt: new Date()
      });

      // 2. Remove from pending
      await deleteDoc(doc(db, 'faculty_pending', email));

      // 3. Set custom claim (via Cloud Function - see step 3)
      console.log(`Approved ${email} as faculty`);
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Pending Faculty Approvals</h2>
      {pendingFaculty.map(faculty => (
        <div key={faculty.id} className="border p-4 mb-4 rounded-lg">
          <p>Email: {faculty.id}</p>
          <p>Username: {faculty.username}</p>
          <button 
            onClick={() => approveFaculty(faculty.id, faculty.username)}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Approve
          </button>
        </div>
      ))}
    </div>
  );
}