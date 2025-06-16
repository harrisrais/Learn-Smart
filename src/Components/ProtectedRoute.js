import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const ProtectedRoute = ({ role, children }) => {
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login/student');
        return;
      }

      try {
        // Get the user's ID token with Firebase claims
        const idTokenResult = await user.getIdTokenResult();
        
        // For students, we don't need special claims
        if (!role || role === 'student') {
          setVerified(true);
        } 
        // For teachers, check the custom claims
        else if (role === 'teacher') {
          const userRole = idTokenResult.claims.role;
          if (userRole === 'teacher') {
            setVerified(true);
          } else {
            console.log('Not authorized as teacher');
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    });

    // Clean up subscription
    return () => unsubscribe();
  }, [navigate, role]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  return verified ? children : null;
};

export default ProtectedRoute;