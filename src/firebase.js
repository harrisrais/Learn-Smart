import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyCSHeYxXhuUmK74C0xy-p4OT81cYznF7SY",
    authDomain: "learn-smart-5bc4b.firebaseapp.com",
    projectId: "learn-smart-5bc4b",
    storageBucket: "learn-smart-5bc4b.firebasestorage.app",
    messagingSenderId: "991690387099",
    appId: "1:991690387099:web:012dbdab71488a3708203e",
    measurementId: "G-YCPC1NYE5T"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);