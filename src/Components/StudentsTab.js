import React, { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc, addDoc } from 'firebase/firestore';
import {
    ChevronDown,
    ChevronUp,
    User,
    Mail,
    BookOpen,
    Trophy,
    TrendingUp,
    Star,
    MessageSquare,
    Calendar,
    CheckCircle,
    XCircle,
    Clock,
    Target,
    Award,
    BarChart3,
    Send,
    X,
    Plus,
    Edit3
} from 'lucide-react';

const StudentsTab = () => {
    const [user] = useAuthState(auth);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedStudent, setExpandedStudent] = useState(null);
    const [studentFeedback, setStudentFeedback] = useState({});
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [currentFeedback, setCurrentFeedback] = useState({
        studentId: '',
        studentName: '',
        topic: '',
        feedback: '',
        rating: 3,
    });
    
    // New state for dialog positioning
    const [dialogPosition, setDialogPosition] = useState({ top: 0, left: 0, width: 500, height: 400 });
    const dialogRef = useRef(null);

    // Function to calculate dialog position - center it in current viewport
    const calculateDialogPosition = () => {
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Get current scroll position
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        
        // Dialog dimensions
        const dialogWidth = Math.min(500, viewportWidth * 0.9);
        const dialogHeight = Math.min(600, viewportHeight * 0.85);
        
        // Center the dialog in the current viewport
        const left = scrollX + (viewportWidth - dialogWidth) / 2;
        const top = scrollY + (viewportHeight - dialogHeight) / 2;
        
        console.log('Feedback dialog centering in viewport:', { 
            viewportWidth,
            viewportHeight,
            scrollX, 
            scrollY, 
            dialogWidth,
            dialogHeight,
            centeredTop: top, 
            centeredLeft: left
        });
        
        return { top, left, width: dialogWidth, height: dialogHeight };
    };

    const fetchUserData = async (userId) => {
        try {
            const data = { topicsMastery: {}, examResults: [] };
            const userDocRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.topicsMastery) {
                    Object.entries(userData.topicsMastery).forEach(([topic, topicData]) => {
                        data.topicsMastery[topic] = {
                            correct: topicData.topicQuiz?.correct || 0,
                            incorrect: topicData.topicQuiz?.incorrect || 0,
                            currentLevel: topicData.currentLevel || 'Easy',
                        };
                    });
                }

                if (userData.examResults) {
                    data.examResults = userData.examResults;
                }
            }

            const examResultsRef = collection(db, 'examResults');
            const q = query(examResultsRef, where('userId', '==', userId));
            const querySnapshot = await getDocs(q);

            const collectionResults = [];
            querySnapshot.forEach((doc) => {
                collectionResults.push({ id: doc.id, ...doc.data() });
            });

            if (collectionResults.length > 0) {
                data.examResults = collectionResults.sort((a, b) => {
                    const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp);
                    const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp);
                    return timeB - timeA;
                });
            }

            return data;
        } catch (error) {
            console.error("Error fetching user data:", error);
            return { topicsMastery: {}, examResults: [] };
        }
    };

    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'users'), where('role', '==', 'student'));
                const querySnapshot = await getDocs(q);

                const studentsData = await Promise.all(
                    querySnapshot.docs.map(async (doc) => {
                        const data = doc.data();
                        const studentId = doc.id;
                        const userData = await fetchUserData(studentId);

                        const quizAttemptsSnapshot = await getDocs(collection(db, 'users', studentId, 'quizAttempts'));
                        const quizAttempts = quizAttemptsSnapshot.docs.map(quizDoc => ({
                            id: quizDoc.id,
                            ...quizDoc.data(),
                        }));

                        const feedbackSnapshot = await getDocs(collection(db, 'users', studentId, 'feedback'));
                        const feedback = feedbackSnapshot.docs.map(feedbackDoc => ({
                            id: feedbackDoc.id,
                            ...feedbackDoc.data(),
                        }));

                        return {
                            id: studentId,
                            name: data.name || 'Anonymous Student',
                            email: data.email,
                            topicsMastery: userData.topicsMastery,
                            examResults: userData.examResults,
                            quizAttempts,
                            feedback
                        };
                    })
                );

                const feedbackByStudent = {};
                studentsData.forEach(student => {
                    if (student.feedback?.length > 0) {
                        feedbackByStudent[student.id] = {};
                        student.feedback.forEach(item => {
                            if (!feedbackByStudent[student.id][item.topic]) {
                                feedbackByStudent[student.id][item.topic] = [];
                            }
                            feedbackByStudent[student.id][item.topic].push(item);
                        });
                    }
                });

                setStudentFeedback(feedbackByStudent);
                setStudents(studentsData);
            } catch (e) {
                console.error("Error loading students:", e);
                setError("Failed to load student data");
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchStudents();
    }, [user]);

    const calculateMasteryPercentage = (topicData) => {
        const total = (topicData.correct || 0) + (topicData.incorrect || 0);
        return total === 0 ? 0 : Number(((topicData.correct / total) * 100).toFixed(1));
    };

    const getExamAverage = (examResults) => {
        if (!examResults?.length) return 0;
        const total = examResults.reduce((sum, exam) => sum + (exam.score || 0), 0);
        return Number((total / examResults.length).toFixed(1));
    };

    const getTopicCompletionStatus = (topicData) => {
        if (!topicData) return {
            status: 'Not Started',
            color: 'gray',
            icon: Clock,
            description: 'No attempts yet',
            badge: 'bg-gray-100 text-gray-600'
        };

        const masteryPercentage = calculateMasteryPercentage(topicData);
        const totalAttempts = (topicData.correct || 0) + (topicData.incorrect || 0);

        // Completed - Hard level with good performance
        if (topicData.currentLevel === 'Hard' && topicData.correct >= 3 && masteryPercentage >= 70) {
            return {
                status: 'Mastered',
                color: 'green',
                icon: Award,
                description: `${masteryPercentage}% accuracy achieved`,
                badge: 'bg-green-100 text-green-700 border border-green-200'
            };
        }

        // Hard level but struggling
        if (topicData.currentLevel === 'Hard' && masteryPercentage < 70) {
            return {
                status: 'Advanced (Struggling)',
                color: 'orange',
                icon: TrendingUp,
                description: `${masteryPercentage}% accuracy - needs improvement`,
                badge: 'bg-orange-100 text-orange-700 border border-orange-200'
            };
        }

        // Medium level progression
        if (topicData.currentLevel === 'Medium') {
            if (masteryPercentage >= 80) {
                return {
                    status: 'Intermediate (Excelling)',
                    color: 'blue',
                    icon: TrendingUp,
                    description: `${masteryPercentage}% accuracy - ready for advanced`,
                    badge: 'bg-blue-100 text-blue-700 border border-blue-200'
                };
            }
            return {
                status: 'Intermediate',
                color: 'blue',
                icon: Target,
                description: `${masteryPercentage}% accuracy`,
                badge: 'bg-blue-100 text-blue-600 border border-blue-200'
            };
        }

        // Easy level progression
        if (topicData.currentLevel === 'Easy') {
            if (masteryPercentage >= 80) {
                return {
                    status: 'Beginner (Ready to Advance)',
                    color: 'purple',
                    icon: TrendingUp,
                    description: `${masteryPercentage}% accuracy - progressing well`,
                    badge: 'bg-purple-100 text-purple-700 border border-purple-200'
                };
            }
            if (totalAttempts >= 5) {
                return {
                    status: 'Beginner (Practicing)',
                    color: 'yellow',
                    icon: Clock,
                    description: `${masteryPercentage}% accuracy - needs more practice`,
                    badge: 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                };
            }
            return {
                status: 'Just Started',
                color: 'indigo',
                icon: Target,
                description: `${totalAttempts} attempts so far`,
                badge: 'bg-indigo-100 text-indigo-600 border border-indigo-200'
            };
        }

        // Fallback
        return {
            status: `Level ${topicData.currentLevel}`,
            color: 'blue',
            icon: Target,
            description: `${masteryPercentage}% accuracy`,
            badge: 'bg-blue-100 text-blue-600 border border-blue-200'
        };
    };

    const getPerformanceColor = (percentage) => {
        if (percentage >= 80) return 'text-green-600 bg-green-50';
        if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
        return 'text-red-600 bg-red-50';
    };

    const getScoreColor = (score) => {
        if (score >= 70) return 'text-green-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    // Updated function to handle positioning
    const openFeedbackModal = (event, student, topic) => {
        const position = calculateDialogPosition();
        setDialogPosition(position);
        
        const existingFeedback = studentFeedback[student.id]?.[topic];
        const latestFeedback = existingFeedback?.length > 0 ?
            existingFeedback.sort((a, b) => b.timestamp - a.timestamp)[0] : null;

        setCurrentFeedback({
            studentId: student.id,
            studentName: student.name,
            topic,
            feedback: latestFeedback?.feedback || '',
            rating: latestFeedback?.rating || 3
        });
        setFeedbackModalOpen(true);
    };

    const handleFeedbackChange = (e) => {
        setCurrentFeedback({
            ...currentFeedback,
            [e.target.name]: e.target.name === 'rating' ? parseInt(e.target.value) : e.target.value
        });
    };

    const submitFeedback = async () => {
        if (!currentFeedback.feedback.trim()) {
            setError("Feedback cannot be empty");
            return;
        }

        try {
            const feedbackData = {
                ...currentFeedback,
                teacherId: user.uid,
                teacherName: user.displayName || user.email,
                timestamp: new Date()
            };

            await addDoc(
                collection(db, 'users', currentFeedback.studentId, 'feedback'),
                feedbackData
            );

            const updatedFeedback = { ...studentFeedback };
            if (!updatedFeedback[currentFeedback.studentId]) {
                updatedFeedback[currentFeedback.studentId] = {};
            }
            if (!updatedFeedback[currentFeedback.studentId][currentFeedback.topic]) {
                updatedFeedback[currentFeedback.studentId][currentFeedback.topic] = [];
            }
            updatedFeedback[currentFeedback.studentId][currentFeedback.topic].push(feedbackData);

            setStudentFeedback(updatedFeedback);
            setFeedbackModalOpen(false);
            setError(null);
        } catch (err) {
            console.error("Error submitting feedback:", err);
            setError("Failed to submit feedback");
        }
    };

    const StatCard = ({ icon: Icon, title, value, color = "blue" }) => (
        <div className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${color === 'blue' ? 'bg-blue-50 border-blue-100' :
                color === 'purple' ? 'bg-purple-50 border-purple-100' :
                    color === 'green' ? 'bg-green-50 border-green-100' :
                        'bg-gray-50 border-gray-100'
            }`}>
            <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${color === 'blue' ? 'bg-blue-100' :
                        color === 'purple' ? 'bg-purple-100' :
                            color === 'green' ? 'bg-green-100' :
                                'bg-gray-100'
                    }`}>
                    <Icon className={`w-5 h-5 ${color === 'blue' ? 'text-blue-600' :
                            color === 'purple' ? 'text-purple-600' :
                                color === 'green' ? 'text-green-600' :
                                    'text-gray-600'
                        }`} />
                </div>
                <div>
                    <p className="text-sm text-gray-600">{title}</p>
                    <p className={`text-lg font-bold ${color === 'blue' ? 'text-blue-700' :
                            color === 'purple' ? 'text-purple-700' :
                                color === 'green' ? 'text-green-700' :
                                    'text-gray-700'
                        }`}>{value}</p>
                </div>
            </div>
        </div>
    );

    // Fixed ProgressBar component with proper color handling
    const ProgressBar = ({ percentage, color = "blue" }) => {
        // Ensure percentage is a valid number between 0 and 100
        const safePercentage = Math.max(0, Math.min(100, percentage || 0));

        const getBarColors = (colorName) => {
            switch (colorName) {
                case 'green':
                    return 'bg-gradient-to-r from-green-400 to-green-500';
                case 'blue':
                    return 'bg-gradient-to-r from-blue-400 to-blue-500';
                case 'purple':
                    return 'bg-gradient-to-r from-purple-400 to-purple-500';
                case 'yellow':
                    return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
                case 'orange':
                    return 'bg-gradient-to-r from-orange-400 to-orange-500';
                case 'red':
                    return 'bg-gradient-to-r from-red-400 to-red-500';
                case 'indigo':
                    return 'bg-gradient-to-r from-indigo-400 to-indigo-500';
                case 'gray':
                    return 'bg-gradient-to-r from-gray-400 to-gray-500';
                default:
                    return 'bg-gradient-to-r from-blue-400 to-blue-500';
            }
        };

        return (
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out transform origin-left ${getBarColors(color)}`}
                    style={{
                        width: `${safePercentage}%`,
                        minWidth: safePercentage > 0 ? '2px' : '0px' // Ensure very small percentages are visible
                    }}
                />
            </div>
        );
    };

    const StarRating = ({ rating, interactive = false, onChange = null }) => (
        <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={!interactive}
                    onClick={() => interactive && onChange && onChange(star)}
                    className={`text-lg transition-colors ${interactive ? 'hover:text-yellow-400 cursor-pointer' : ''
                        } ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                >
                    <Star className={`w-5 h-5 ${star <= rating ? 'fill-current' : ''}`} />
                </button>
            ))}
        </div>
    );

    const renderExamResults = (student) => (
        <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <h4 className="text-lg font-semibold text-gray-800">Exam Performance</h4>
            </div>

            {student.examResults?.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <StatCard
                            icon={BookOpen}
                            title="Total Exams"
                            value={student.examResults.length}
                            color="purple"
                        />
                        <StatCard
                            icon={Trophy}
                            title="Average Score"
                            value={`${getExamAverage(student.examResults)}%`}
                            color="blue"
                        />
                        <StatCard
                            icon={Award}
                            title="Passed Exams"
                            value={student.examResults.filter(exam => exam.score >= 70).length}
                            color="green"
                        />
                    </div>

                    <div className="space-y-3">
                        {student.examResults.map((exam, index) => {
                            const examDate = exam.timestamp?.toDate
                                ? exam.timestamp.toDate()
                                : exam.timestamp instanceof Date
                                    ? exam.timestamp
                                    : new Date(exam.timestamp || Date.now());

                            return (
                                <div key={index} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all duration-300">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <div className="p-1.5 bg-purple-100 rounded-lg">
                                                    <BookOpen className="w-4 h-4 text-purple-600" />
                                                </div>
                                                <h5 className="font-semibold text-gray-800">Exam {index + 1}</h5>
                                                <div className="flex items-center text-xs text-gray-500 space-x-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{examDate.toLocaleDateString()}</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="flex items-center space-x-2">
                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                    <span>Correct: <strong>{exam.correct || 0}</strong></span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Target className="w-4 h-4 text-blue-600" />
                                                    <span>Total: <strong>{exam.totalQuestions || exam.total || 'N/A'}</strong></span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <BookOpen className="w-4 h-4 text-purple-600" />
                                                    <span className="truncate">Topics: <strong>{exam.topics?.join(', ') || 'N/A'}</strong></span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    {exam.score >= 70 ?
                                                        <CheckCircle className="w-4 h-4 text-green-600" /> :
                                                        <XCircle className="w-4 h-4 text-red-600" />
                                                    }
                                                    <span>Status: <strong>{exam.score >= 70 ? 'Passed' : 'Failed'}</strong></span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className={`inline-flex items-center px-3 py-2 rounded-full text-lg font-bold ${getPerformanceColor(exam.score || 0)}`}>
                                                {(exam.score || 0).toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No exam results available</p>
                </div>
            )}
        </div>
    );

    const renderTopicMastery = (student) => (
        <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h4 className="text-lg font-semibold text-gray-800">Topic Mastery</h4>
            </div>

            {Object.keys(student.topicsMastery).length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(student.topicsMastery).map(([topic, data]) => {
                        const masteryPercentage = calculateMasteryPercentage(data);
                        const completionStatus = getTopicCompletionStatus(data);
                        const StatusIcon = completionStatus.icon;

                        return (
                            <div key={topic} className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-5 border border-gray-200 hover:shadow-lg transition-all duration-300">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h5 className="font-semibold text-gray-800 text-lg">{topic}</h5>
                                            <div className={`px-3 py-1 rounded-full text-sm font-bold ${getPerformanceColor(masteryPercentage)}`}>
                                                {masteryPercentage}%
                                            </div>
                                        </div>

                                        {/* Enhanced Status Section */}
                                        <div className="space-y-2">
                                            <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium ${completionStatus.badge}`}>
                                                <StatusIcon className="w-4 h-4" />
                                                <span>{completionStatus.status}</span>
                                            </div>
                                            <p className="text-sm text-gray-600">{completionStatus.description}</p>

                                            {/* Additional Status Indicators */}
                                            <div className="flex items-center space-x-4 text-xs">
                                                <div className="flex items-center space-x-1">
                                                    <div className={`w-2 h-2 rounded-full ${data.currentLevel === 'Hard' ? 'bg-red-400' :
                                                            data.currentLevel === 'Medium' ? 'bg-yellow-400' : 'bg-green-400'
                                                        }`}></div>
                                                    <span className="text-gray-500">Difficulty: {data.currentLevel || 'Not Set'}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                    <span className="text-gray-500">
                                                        {(data.correct || 0) + (data.incorrect || 0)} total attempts
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                                        <span>Progress</span>
                                        <span>{masteryPercentage}% Mastery</span>
                                    </div>
                                    <ProgressBar percentage={masteryPercentage} color={completionStatus.color} />

                                    {/* Performance Indicator */}
                                    <div className="mt-2 flex justify-between text-xs">
                                        <span className={`font-medium ${masteryPercentage >= 80 ? 'text-green-600' :
                                                masteryPercentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                                            }`}>
                                            {masteryPercentage >= 80 ? 'Excellent Performance' :
                                                masteryPercentage >= 60 ? 'Good Performance' : 'Needs Improvement'}
                                        </span>
                                        <span className="text-gray-500">
                                            Next: {data.currentLevel === 'Easy' ? 'Medium Level' :
                                                data.currentLevel === 'Medium' ? 'Hard Level' : 'Topic Mastered'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span>Correct: <strong>{data.correct || 0}</strong></span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <XCircle className="w-4 h-4 text-red-600" />
                                        <span>Incorrect: <strong>{data.incorrect || 0}</strong></span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Target className="w-4 h-4 text-blue-600" />
                                        <span>Attempts: <strong>{(data.correct || 0) + (data.incorrect || 0)}</strong></span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Award className="w-4 h-4 text-purple-600" />
                                        <span>Level: <strong>{data.currentLevel || 'N/A'}</strong></span>
                                    </div>
                                </div>

                                {/* Enhanced Feedback Section */}
                                <div className="pt-4 border-t border-gray-200">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center space-x-2">
                                            <MessageSquare className="w-4 h-4 text-indigo-600" />
                                            <span className="text-sm font-medium text-gray-700">Teacher Feedback</span>
                                        </div>
                                        <button
                                            onClick={(e) => openFeedbackModal(e, student, topic)}
                                            className="flex items-center space-x-1 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-full transition-colors duration-200"
                                        >
                                            {studentFeedback[student.id]?.[topic]?.length > 0 ?
                                                <Edit3 className="w-3 h-3" /> :
                                                <Plus className="w-3 h-3" />
                                            }
                                            <span>{studentFeedback[student.id]?.[topic]?.length > 0 ? 'Update' : 'Add'}</span>
                                        </button>
                                    </div>

                                    {studentFeedback[student.id]?.[topic]?.length > 0 ? (
                                        <div className="space-y-2">
                                            {studentFeedback[student.id][topic]
                                                .sort((a, b) => b.timestamp - a.timestamp)
                                                .slice(0, 1)
                                                .map((feedback, idx) => (
                                                    <div key={idx} className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <StarRating rating={feedback.rating} />
                                                            <span className="text-xs text-gray-500 flex items-center space-x-1">
                                                                <Calendar className="w-3 h-3" />
                                                                <span>{new Date(feedback.timestamp?.toDate?.() || feedback.timestamp).toLocaleDateString()}</span>
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 leading-relaxed">{feedback.feedback}</p>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-3 text-gray-400 text-sm">
                                            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                            <p>No feedback provided yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No topic mastery data available</p>
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600">Loading students...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <XCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {students.map(student => (
                <div key={student.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                    <div
                        className="p-6 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
                        onClick={() => setExpandedStudent(prev => prev === student.id ? null : student.id)}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full">
                                    <User className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{student.name}</h3>
                                    <div className="flex items-center space-x-2 text-gray-600">
                                        <Mail className="w-4 h-4" />
                                        <span className="text-sm">{student.email}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="text-right">
                                    <div className="text-sm text-gray-500">Topics Completed</div>
                                    <div className="text-lg font-bold text-blue-600">
                                        {Object.values(student.topicsMastery).filter(topic =>
                                            topic.currentLevel === 'Hard' && topic.correct >= 3
                                        ).length} / {Object.keys(student.topicsMastery).length}
                                    </div>
                                </div>
                                <div className={`transform transition-transform duration-200 ${expandedStudent === student.id ? 'rotate-180' : ''}`}>
                                    <ChevronDown className="w-6 h-6 text-gray-400" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {expandedStudent === student.id && (
                        <div className="border-t border-gray-100 bg-gray-50">
                            <div className="p-6 space-y-8">
                                {renderTopicMastery(student)}
                                {renderExamResults(student)}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {/* Positioned Feedback Modal */}
            {feedbackModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
                    <div 
                        ref={dialogRef}
                        className="absolute bg-white rounded-xl shadow-2xl overflow-hidden"
                        style={{
                            top: `${dialogPosition.top}px`,
                            left: `${dialogPosition.left}px`,
                            width: `${dialogPosition.width}px`,
                            maxHeight: `${dialogPosition.height}px`
                        }}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Provide Feedback</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    For {currentFeedback.studentName} - {currentFeedback.topic}
                                </p>
                            </div>
                            <button
                                onClick={() => setFeedbackModalOpen(false)}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="overflow-y-auto p-4" style={{ maxHeight: `${dialogPosition.height - 140}px` }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Rating</label>
                                    <StarRating
                                        rating={currentFeedback.rating}
                                        interactive={true}
                                        onChange={(rating) => setCurrentFeedback({ ...currentFeedback, rating })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Feedback</label>
                                    <textarea
                                        name="feedback"
                                        value={currentFeedback.feedback}
                                        onChange={handleFeedbackChange}
                                        rows={5}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none text-sm"
                                        placeholder="Provide detailed feedback on the student's progress with this topic..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50">
                            <button
                                type="button"
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 text-sm"
                                onClick={() => setFeedbackModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg text-sm"
                                onClick={submitFeedback}
                            >
                                <Send className="w-4 h-4" />
                                <span>Submit Feedback</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentsTab;