import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import {
    BarChart3,
    TrendingUp,
    Users,
    BookOpen,
    Award,
    Clock,
    Target,
    Activity,
    Filter,
    Calendar,
    ChevronDown,
    Star,
    Trophy,
    Brain,
    FileText,
    PieChart,
    ArrowUp,
    ArrowDown,
    Minus,
    CheckCircle,
    XCircle,
    AlertCircle
} from 'lucide-react';

const AnalyticsTab = () => {
    const [user] = useAuthState(auth);
    const [students, setStudents] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [selectedAnalyticsTopic, setSelectedAnalyticsTopic] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [topics, setTopics] = useState([]);
    const [activeView, setActiveView] = useState('topics'); // 'topics' or 'exams'

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    const fetchTopics = async () => {
        try {
            console.log("API_BASE_URL:", API_BASE_URL);
            const response = await fetch(`${API_BASE_URL}/api/topics`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });
            console.log("Response:", response);

            if (!response.ok) {
                throw new Error(`Failed to fetch topics: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            setTopics(data.topics || []);
            setLoading(false);
            setError(null);
        } catch (apiError) {
            console.error("Error fetching topics:", apiError);
            setError(apiError.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            setLoading(true);
            setError(null);
            try {
                const studentsRes = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
                const studentsData = studentsRes.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const questionsRes = await getDocs(collection(db, 'questions'));
                const questionsData = questionsRes.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setQuestions(questionsData);

                await fetchTopics();

                const updatedStudentsData = await Promise.all(studentsData.map(async (student) => {
                    try {
                        const userRef = doc(db, 'users', student.id);
                        const userSnap = await getDoc(userRef);
                        const userData = userSnap.exists() ? userSnap.data() : {};

                        const examResultsRef = collection(db, 'examResults');
                        const q = query(examResultsRef, where('userId', '==', student.id));
                        const examSnapshot = await getDocs(q);

                        const examResults = [];
                        examSnapshot.forEach((doc) => {
                            examResults.push({
                                id: doc.id,
                                ...doc.data()
                            });
                        });

                        examResults.sort((a, b) => {
                            const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp);
                            const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp);
                            return timeB - timeA;
                        });

                        const quizAttemptsRef = collection(db, 'users', student.id, 'quizAttempts');
                        const quizSnapshot = await getDocs(quizAttemptsRef);

                        const quizAttempts = [];
                        quizSnapshot.forEach((doc) => {
                            quizAttempts.push({
                                id: doc.id,
                                ...doc.data()
                            });
                        });

                        return {
                            ...student,
                            topicsMastery: userData.topicsMastery || {},
                            examResults,
                            quizAttempts
                        };
                    } catch (error) {
                        console.error(`Error fetching data for student ${student.id}:`, error);
                        return student;
                    }
                }));

                setStudents(updatedStudentsData);
            } catch (error) {
                console.error("Error in fetchData:", error);
                setError(error.message);
                setStudents([]);
                setQuestions([]);
                setTopics([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const getTopicQuizData = (topicData) => {
        if (topicData?.topicQuiz) {
            return {
                correct: topicData.topicQuiz.correct || 0,
                incorrect: topicData.topicQuiz.incorrect || 0
            };
        }

        return {
            correct: topicData?.correct || 0,
            incorrect: topicData?.incorrect || 0
        };
    };

    const calculateMasteryPercentage = (topicData) => {
        if (!topicData) return 0;

        const quizData = getTopicQuizData(topicData);
        const total = quizData.correct + quizData.incorrect;

        return total === 0 ? 0 : Number(((quizData.correct / total) * 100).toFixed(1));
    };

    const getTopicCompletionStatus = (topicData) => {
        if (!topicData) return 'Not Started';

        const quizData = getTopicQuizData(topicData);
        const total = quizData.correct + quizData.incorrect;

        if (topicData.currentLevel === 'Advanced' || topicData.currentLevel === 'Hard') {
            return total >= 9 ? 'Completed' : `Level ${topicData.currentLevel}`;
        }

        return topicData.currentLevel ? `Level ${topicData.currentLevel}` : 'In Progress';
    };

    const getExamAverage = (examResults) => {
        if (!examResults || !examResults.length) return 0;
        const total = examResults.reduce((sum, exam) => sum + (parseFloat(exam.score) || 0), 0);
        return total / examResults.length;
    };

    const getStats = () => {
        if (activeView === 'topics') {
            return getTopicStats();
        } else {
            return getExamStats();
        }
    };

    const getTopicStats = () => {
        if (selectedAnalyticsTopic === 'all') {
            const totalAttemptsAcrossAllTopics = students.reduce((sum, student) => {
                const topicsMastery = student.topicsMastery || {};
                const topicKeys = Object.keys(topicsMastery);

                const totalQuestionsForStudent = topicKeys.reduce((topicSum, topic) => {
                    const topicData = topicsMastery[topic];
                    if (!topicData) return topicSum;

                    const quizData = getTopicQuizData(topicData);
                    return topicSum + quizData.correct + quizData.incorrect;
                }, 0);

                return sum + totalQuestionsForStudent;
            }, 0);

            return {
                totalStudents: students.length,
                averageScore: students.length > 0
                    ? (students.reduce((sum, student) => {
                        const topicKeys = Object.keys(student.topicsMastery || {});
                        if (topicKeys.length === 0) return sum;

                        const avgMastery = topicKeys.reduce((tSum, topic) => {
                            return tSum + calculateMasteryPercentage(student.topicsMastery[topic]);
                        }, 0) / topicKeys.length;

                        return sum + avgMastery;
                    }, 0) / students.length).toFixed(1)
                    : '0.0',
                totalTopicQuestions: totalAttemptsAcrossAllTopics
            };
        } else {
            const studentsWithTopic = students.filter(s => s.topicsMastery && s.topicsMastery[selectedAnalyticsTopic]);

            const totalAttemptsForTopic = studentsWithTopic.reduce((sum, student) => {
                const topicData = student.topicsMastery[selectedAnalyticsTopic];
                if (!topicData) return sum;

                const quizData = getTopicQuizData(topicData);
                return sum + quizData.correct + quizData.incorrect;
            }, 0);

            const topicMasteryAverage = studentsWithTopic.length > 0
                ? (studentsWithTopic.reduce((sum, s) =>
                    sum + calculateMasteryPercentage(s.topicsMastery[selectedAnalyticsTopic]), 0) / studentsWithTopic.length).toFixed(1)
                : '0.0';

            return {
                totalStudents: studentsWithTopic.length,
                averageScore: topicMasteryAverage,
                totalTopicQuestions: totalAttemptsForTopic
            };
        }
    };

    const getExamStats = () => {
        if (selectedAnalyticsTopic === 'all') {
            const studentsWithExams = students.filter(s => s.examResults && s.examResults.length > 0);

            const examAverage = studentsWithExams.length > 0
                ? (studentsWithExams.reduce((sum, student) => {
                    const avgScore = getExamAverage(student.examResults || []);
                    return sum + avgScore;
                }, 0) / studentsWithExams.length).toFixed(1)
                : '0.0';

            const totalExams = students.reduce((sum, s) => sum + (s.examResults?.length || 0), 0);

            return {
                totalStudents: studentsWithExams.length,
                averageScore: examAverage,
                totalExamsTaken: totalExams
            };
        } else {
            const examsWithTopic = students.flatMap(s =>
                (s.examResults || []).filter(exam =>
                    exam.topics && exam.topics.includes(selectedAnalyticsTopic)
                )
            );

            const studentsWithTopicExam = new Set(
                examsWithTopic.map(exam => exam.userId)
            ).size;

            const topicExamAverage = examsWithTopic.length > 0
                ? (examsWithTopic.reduce((sum, exam) => sum + (parseFloat(exam.score) || 0), 0) / examsWithTopic.length).toFixed(1)
                : '0.0';

            return {
                totalStudents: studentsWithTopicExam,
                averageScore: topicExamAverage,
                totalExamsTaken: examsWithTopic.length
            };
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-emerald-600';
        if (score >= 70) return 'text-green-500';
        if (score >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getScoreColorBg = (score) => {
        if (score >= 80) return 'bg-emerald-500';
        if (score >= 70) return 'bg-green-500';
        if (score >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getPerformanceIcon = (score) => {
        if (score >= 80) return <ArrowUp className="w-4 h-4 text-emerald-600" />;
        if (score >= 60) return <Minus className="w-4 h-4 text-yellow-500" />;
        return <ArrowDown className="w-4 h-4 text-red-500" />;
    };

    const stats = getStats();

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
                        <p className="text-slate-600 text-lg font-medium">Loading analytics...</p>
                        <p className="text-slate-400 text-sm mt-1">Gathering insights from your data</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
                <div className="max-w-md mx-auto mt-20">
                    <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl shadow-lg">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Activity className="h-5 w-5 text-red-400" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium">Error Loading Data</h3>
                                <p className="text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                Class Analytics
                            </h1>
                            <p className="text-slate-600 mt-2 flex items-center">
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Comprehensive insights into student performance and engagement
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-white/20">
                                <div className="flex items-center text-sm text-slate-600">
                                    <Users className="mr-2 h-4 w-4" />
                                    {students.length} Students
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-2 mb-8">
                    <button
                        onClick={() => setActiveView('topics')}
                        className={`group flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-200 ${activeView === 'topics'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                            : 'bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-white shadow-sm border border-white/20'
                            }`}
                    >
                        <Brain className="mr-2 h-4 w-4" />
                        Topic Quizzes
                    </button>
                    <button
                        onClick={() => setActiveView('exams')}
                        className={`group flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-200 ${activeView === 'exams'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                            : 'bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-white shadow-sm border border-white/20'
                            }`}
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        Exams
                    </button>
                </div>

                {/* Filter Section */}
                <div className="mb-8">
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/20">
                        <div className="flex items-center space-x-4">
                            <Filter className="h-5 w-5 text-slate-400" />
                            <div className="relative">
                                <select
                                    className="appearance-none bg-white/50 backdrop-blur-sm border border-slate-200 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700"
                                    value={selectedAnalyticsTopic}
                                    onChange={(e) => setSelectedAnalyticsTopic(e.target.value)}
                                >
                                    <option value="all">All {activeView === 'topics' ? 'Topics' : 'Exams'}</option>
                                    {topics.map(topic => (
                                        <option key={topic} value={topic}>{topic}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 text-sm font-medium mb-1">
                                    {activeView === 'topics'
                                        ? (selectedAnalyticsTopic === 'all' ? 'Total Students' : `Students Studying ${selectedAnalyticsTopic}`)
                                        : (selectedAnalyticsTopic === 'all' ? 'Students Taking Exams' : `Students Taking ${selectedAnalyticsTopic} Exams`)
                                    }
                                </p>
                                <p className="text-3xl font-bold text-slate-800">{stats.totalStudents}</p>
                            </div>
                            <div className="bg-blue-100 p-3 rounded-lg">
                                <Users className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-emerald-50/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 text-sm font-medium mb-1">
                                    {activeView === 'topics'
                                        ? (selectedAnalyticsTopic === 'all' ? 'Average Topic Score' : `Average ${selectedAnalyticsTopic} Mastery`)
                                        : (selectedAnalyticsTopic === 'all' ? 'Average Exam Score' : `Average ${selectedAnalyticsTopic} Score`)
                                    }
                                </p>
                                <div className="flex items-center space-x-2">
                                    <p className={`text-3xl font-bold ${getScoreColor(parseFloat(stats.averageScore))}`}>
                                        {stats.averageScore}%
                                    </p>
                                    {getPerformanceIcon(parseFloat(stats.averageScore))}
                                </div>
                            </div>
                            <div className="bg-emerald-100 p-3 rounded-lg">
                                <Target className="h-6 w-6 text-emerald-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-purple-50/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 text-sm font-medium mb-1">
                                    {activeView === 'topics'
                                        ? (selectedAnalyticsTopic === 'all' ? 'Total Attempted Questions' : `Questions Attempted in ${selectedAnalyticsTopic}`)
                                        : (selectedAnalyticsTopic === 'all' ? 'Total Exams Taken' : `${selectedAnalyticsTopic} Exams Taken`)
                                    }
                                </p>
                                <p className="text-3xl font-bold text-slate-800">
                                    {activeView === 'topics' ? stats.totalTopicQuestions : stats.totalExamsTaken}
                                </p>
                            </div>
                            <div className="bg-purple-100 p-3 rounded-lg">
                                {activeView === 'topics' ?
                                    <BookOpen className="h-6 w-6 text-purple-600" /> :
                                    <FileText className="h-6 w-6 text-purple-600" />
                                }
                            </div>
                        </div>
                    </div>
                </div>

                {/* Topic View Content */}
                {activeView === 'topics' && (
                    <>
                        {selectedAnalyticsTopic === 'all' && (
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20 mb-8">
                                <div className="flex items-center mb-6">
                                    <PieChart className="h-5 w-5 text-slate-400 mr-2" />
                                    <h4 className="text-lg font-semibold text-slate-800">Class Topic Mastery</h4>
                                </div>

                                {topics.length > 0 ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {topics.map(topic => {
                                            const studentsWithTopic = students.filter(s => s.topicsMastery && s.topicsMastery[topic]);
                                            const averageMastery = studentsWithTopic.length > 0
                                                ? studentsWithTopic.reduce((sum, s) =>
                                                    sum + calculateMasteryPercentage(s.topicsMastery[topic]), 0) / studentsWithTopic.length
                                                : 0;

                                            return (
                                                <div key={topic} className="bg-gradient-to-r from-slate-50 to-white p-4 rounded-lg border border-slate-100">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <h5 className="font-medium text-slate-800 flex items-center">
                                                            <BookOpen className="h-4 w-4 mr-2 text-slate-500" />
                                                            {topic}
                                                        </h5>
                                                        <div className="flex items-center space-x-2">
                                                            <span className={`text-lg font-bold ${getScoreColor(averageMastery)}`}>
                                                                {averageMastery.toFixed(1)}%
                                                            </span>
                                                            {getPerformanceIcon(averageMastery)}
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
                                                        <div
                                                            className={`h-3 rounded-full ${getScoreColorBg(averageMastery)} transition-all duration-500`}
                                                            style={{ width: `${averageMastery}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm text-slate-500">
                                                        <span className="flex items-center">
                                                            <Users className="h-3 w-3 mr-1" />
                                                            {studentsWithTopic.length} of {students.length} students
                                                        </span>
                                                        <span>{studentsWithTopic.length > 0 ? 'Active' : 'No attempts'}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                        <p className="text-slate-500">No topics data available</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedAnalyticsTopic !== 'all' && (
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 mb-8">
                                <div className="p-6 border-b border-slate-100">
                                    <div className="flex items-center">
                                        <Trophy className="h-5 w-5 text-slate-400 mr-2" />
                                        <h4 className="text-lg font-semibold text-slate-800">{selectedAnalyticsTopic} - Student Performance</h4>
                                    </div>
                                </div>

                                {students.filter(s => s.topicsMastery && s.topicsMastery[selectedAnalyticsTopic]).length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full">
                                            <thead className="bg-slate-50/50">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                                                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Mastery</th>
                                                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Correct</th>
                                                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Incorrect</th>
                                                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {students
                                                    .filter(s => s.topicsMastery && s.topicsMastery[selectedAnalyticsTopic])
                                                    .sort((a, b) =>
                                                        calculateMasteryPercentage(b.topicsMastery[selectedAnalyticsTopic]) -
                                                        calculateMasteryPercentage(a.topicsMastery[selectedAnalyticsTopic])
                                                    )
                                                    .map((student, index) => {
                                                        const topicData = student.topicsMastery[selectedAnalyticsTopic];
                                                        const quizData = getTopicQuizData(topicData);
                                                        const masteryPercentage = calculateMasteryPercentage(topicData);

                                                        return (
                                                            <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center">
                                                                        {/* Show ranking badge for all students */}
                                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 text-xs font-bold text-white ${index === 0 ? 'bg-yellow-400' :
                                                                                index === 1 ? 'bg-gray-400' :
                                                                                    index === 2 ? 'bg-orange-400' :
                                                                                        'bg-blue-400'  // Default color for 4th place and beyond
                                                                            }`}>
                                                                            {index + 1}
                                                                        </div>
                                                                        <span className="text-slate-800 font-medium">{student.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center space-x-3">
                                                                        <span className={`text-lg font-bold ${getScoreColor(masteryPercentage)}`}>
                                                                            {masteryPercentage}%
                                                                        </span>
                                                                        <div className="w-24 bg-slate-200 rounded-full h-2">
                                                                            <div
                                                                                className={`h-2 rounded-full ${getScoreColorBg(masteryPercentage)} transition-all duration-500`}
                                                                                style={{ width: `${masteryPercentage}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                                        {quizData.correct}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                        <XCircle className="w-3 h-3 mr-1" />
                                                                        {quizData.incorrect}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTopicCompletionStatus(topicData) === 'Completed'
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : 'bg-blue-100 text-blue-800'
                                                                        }`}>
                                                                        {getTopicCompletionStatus(topicData) === 'Completed' ?
                                                                            <Award className="w-3 h-3 mr-1" /> :
                                                                            <Clock className="w-3 h-3 mr-1" />
                                                                        }
                                                                        {getTopicCompletionStatus(topicData)}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                        <p className="text-slate-500">No students have attempted this topic yet</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Exam View Content */}
                {activeView === 'exams' && (
                    <>
                        {selectedAnalyticsTopic === 'all' && (
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20 mb-8">
                                <div className="flex items-center mb-6">
                                    <TrendingUp className="h-5 w-5 text-slate-400 mr-2" />
                                    <h4 className="text-lg font-semibold text-slate-800">Overall Exam Performance</h4>
                                </div>

                                {students.filter(s => s.examResults && s.examResults.length > 0).length > 0 ? (
                                    <div className="space-y-8">
                                        <div>
                                            <h5 className="text-sm font-medium mb-4 text-slate-700">Score Distribution</h5>

                                            {[
                                                { range: '90-100%', label: 'Excellent', color: 'bg-emerald-500', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' },
                                                { range: '80-89%', label: 'Good', color: 'bg-green-500', bgClass: 'bg-green-50', textClass: 'text-green-700' },
                                                { range: '70-79%', label: 'Satisfactory', color: 'bg-yellow-500', bgClass: 'bg-yellow-50', textClass: 'text-yellow-700' },
                                                { range: '0-69%', label: 'Needs Improvement', color: 'bg-red-500', bgClass: 'bg-red-50', textClass: 'text-red-700' }
                                            ].map((category) => {
                                                const allExams = students.flatMap(s => s.examResults || []);

                                                let minScore, maxScore;
                                                if (category.range === '90-100%') {
                                                    minScore = 90; maxScore = 100;
                                                } else if (category.range === '80-89%') {
                                                    minScore = 80; maxScore = 89.99;
                                                } else if (category.range === '70-79%') {
                                                    minScore = 70; maxScore = 79.99;
                                                } else {
                                                    minScore = 0; maxScore = 69.99;
                                                }

                                                const examsInRange = allExams.filter(
                                                    exam => {
                                                        const score = parseFloat(exam.score) || 0;
                                                        return score >= minScore && score <= maxScore;
                                                    }
                                                );

                                                const percentage = allExams.length > 0
                                                    ? Math.round((examsInRange.length / allExams.length) * 100)
                                                    : 0;

                                                return (
                                                    <div key={category.range} className={`${category.bgClass} p-4 rounded-lg mb-3`}>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className={`font-medium ${category.textClass}`}>
                                                                {category.label} ({category.range})
                                                            </span>
                                                            <span className={`text-sm ${category.textClass}`}>
                                                                {examsInRange.length} exams ({percentage}%)
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-white/50 rounded-full h-3">
                                                            <div
                                                                className={`h-3 rounded-full ${category.color} transition-all duration-500`}
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div>
                                            <h5 className="text-sm font-medium mb-4 text-slate-700">Average Score by Exam</h5>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {topics.map(topic => {
                                                    const topicExams = students.flatMap(s =>
                                                        (s.examResults || []).filter(exam =>
                                                            exam.topics && exam.topics.includes(topic)
                                                        )
                                                    );

                                                    if (topicExams.length === 0) return null;

                                                    const avgScore = topicExams.reduce(
                                                        (sum, exam) => sum + (parseFloat(exam.score) || 0), 0
                                                    ) / topicExams.length;

                                                    return (
                                                        <div key={topic} className="bg-gradient-to-r from-slate-50 to-white p-4 rounded-lg border border-slate-100">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-sm font-medium text-slate-800">{topic}</span>
                                                                <div className="flex items-center space-x-2">
                                                                    <span className={`text-lg font-bold ${getScoreColor(avgScore)}`}>
                                                                        {avgScore.toFixed(1)}%
                                                                    </span>
                                                                    {getPerformanceIcon(avgScore)}
                                                                </div>
                                                            </div>
                                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                                <div
                                                                    className={`h-2 rounded-full ${getScoreColorBg(avgScore)} transition-all duration-500`}
                                                                    style={{ width: `${avgScore}%` }}
                                                                />
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-1">
                                                                {topicExams.length} exam{topicExams.length !== 1 ? 's' : ''}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                        <p className="text-slate-500">No exam data available</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedAnalyticsTopic !== 'all' && (
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 mb-8">
                                <div className="p-6 border-b border-slate-100">
                                    <div className="flex items-center">
                                        <Star className="h-5 w-5 text-slate-400 mr-2" />
                                        <h4 className="text-lg font-semibold text-slate-800">{selectedAnalyticsTopic} - Exam Performance</h4>
                                    </div>
                                </div>

                                {(() => {
                                    const topicExams = students.flatMap(s =>
                                        (s.examResults || [])
                                            .filter(exam => exam.topics && exam.topics.includes(selectedAnalyticsTopic))
                                            .map(exam => ({
                                                ...exam,
                                                studentName: s.name || 'Unknown Student'
                                            }))
                                    );

                                    if (topicExams.length === 0) {
                                        return (
                                            <div className="text-center py-8">
                                                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                                <p className="text-slate-500">No exams have included this topic yet</p>
                                            </div>
                                        );
                                    }

                                    topicExams.sort((a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0));

                                    return (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full">
                                                <thead className="bg-slate-50/50">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Score</th>
                                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Topics</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {topicExams.map((exam, index) => {
                                                        const timestamp = exam.timestamp?.toDate?.() || new Date(exam.timestamp);
                                                        const formattedDate = timestamp instanceof Date && !isNaN(timestamp)
                                                            ? timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                            : 'Unknown date';

                                                        return (
                                                            <tr key={exam.id || index} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center">
                                                                        {/* Show ranking badge for all students, not just top 3 */}
                                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 text-xs font-bold text-white ${index === 0 ? 'bg-yellow-400' :
                                                                            index === 1 ? 'bg-gray-400' :
                                                                                index === 2 ? 'bg-orange-400' :
                                                                                    'bg-blue-400'  // Default color for 4th place and beyond
                                                                            }`}>
                                                                            {index + 1}
                                                                        </div>
                                                                        <span className="text-slate-800 font-medium">{exam.studentName}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center space-x-2">
                                                                        <span className={`text-lg font-bold ${getScoreColor(parseFloat(exam.score) || 0)}`}>
                                                                            {parseFloat(exam.score).toFixed(1)}%
                                                                        </span>
                                                                        {getPerformanceIcon(parseFloat(exam.score) || 0)}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center text-slate-500">
                                                                        <Calendar className="h-4 w-4 mr-1" />
                                                                        {formattedDate}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {(exam.topics || []).map(topic => (
                                                                            <span
                                                                                key={topic}
                                                                                className={`px-2 py-1 text-xs rounded-full font-medium ${topic === selectedAnalyticsTopic
                                                                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                                                                    : 'bg-slate-100 text-slate-600'
                                                                                    }`}
                                                                            >
                                                                                {topic}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </>
                )}

                {/* Student Performance Overview */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 mb-8">
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center">
                            <Users className="h-5 w-5 text-slate-400 mr-2" />
                            <h4 className="text-lg font-semibold text-slate-800">Student Performance Overview</h4>
                        </div>
                    </div>

                    {students.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            {activeView === 'topics' ? 'Topics Attempted' : 'Exams Taken'}
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            {activeView === 'topics' ? 'Average Score' : 'Average Score'}
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            {activeView === 'topics' ? 'Last Activity' : 'Last Exam'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {students
                                        .filter(student => {
                                            if (activeView === 'topics') {
                                                if (selectedAnalyticsTopic === 'all') {
                                                    return Object.keys(student.topicsMastery || {}).length > 0;
                                                }
                                                return student.topicsMastery && student.topicsMastery[selectedAnalyticsTopic];
                                            } else {
                                                if (selectedAnalyticsTopic === 'all') {
                                                    return (student.examResults || []).length > 0;
                                                }
                                                return (student.examResults || [])
                                                    .some(exam => exam.topics && exam.topics.includes(selectedAnalyticsTopic));
                                            }
                                        })
                                        .sort((a, b) => {
                                            if (activeView === 'topics') {
                                                const getAvgMastery = (student) => {
                                                    const topicKeys = selectedAnalyticsTopic === 'all'
                                                        ? Object.keys(student.topicsMastery || {})
                                                        : [selectedAnalyticsTopic];

                                                    if (topicKeys.length === 0) return 0;

                                                    return topicKeys.reduce((sum, topic) => {
                                                        const topicData = student.topicsMastery?.[topic];
                                                        return sum + (topicData ? calculateMasteryPercentage(topicData) : 0);
                                                    }, 0) / topicKeys.length;
                                                };

                                                return getAvgMastery(b) - getAvgMastery(a);
                                            } else {
                                                const getAvgExamScore = (student) => {
                                                    const relevantExams = selectedAnalyticsTopic === 'all'
                                                        ? (student.examResults || [])
                                                        : (student.examResults || [])
                                                            .filter(exam => exam.topics && exam.topics.includes(selectedAnalyticsTopic));

                                                    if (relevantExams.length === 0) return 0;

                                                    return relevantExams.reduce((sum, exam) =>
                                                        sum + (parseFloat(exam.score) || 0), 0) / relevantExams.length;
                                                };

                                                return getAvgExamScore(b) - getAvgExamScore(a);
                                            }
                                        })
                                        .map((student, index) => {
                                            const topicKeys = Object.keys(student.topicsMastery || {});
                                            const relevantTopics = selectedAnalyticsTopic === 'all'
                                                ? topicKeys
                                                : [selectedAnalyticsTopic];

                                            const avgMastery = relevantTopics.length > 0
                                                ? relevantTopics.reduce((sum, topic) => {
                                                    const topicData = student.topicsMastery?.[topic];
                                                    return sum + (topicData ? calculateMasteryPercentage(topicData) : 0);
                                                }, 0) / relevantTopics.length
                                                : 0;

                                            const relevantExams = selectedAnalyticsTopic === 'all'
                                                ? (student.examResults || [])
                                                : (student.examResults || [])
                                                    .filter(exam => exam.topics && exam.topics.includes(selectedAnalyticsTopic));

                                            const avgExamScore = relevantExams.length > 0
                                                ? relevantExams.reduce((sum, exam) =>
                                                    sum + (parseFloat(exam.score) || 0), 0) / relevantExams.length
                                                : 0;

                                            const lastActivityDate = (() => {
                                                if (activeView === 'topics') {
                                                    const attempts = (student.quizAttempts || [])
                                                        .filter(attempt => selectedAnalyticsTopic === 'all' ||
                                                            attempt.topic === selectedAnalyticsTopic)
                                                        .map(attempt => attempt.timestamp?.toDate?.() || new Date(attempt.timestamp))
                                                        .filter(date => date instanceof Date && !isNaN(date));

                                                    return attempts.length > 0
                                                        ? new Date(Math.max(...attempts.map(d => d.getTime())))
                                                        : null;
                                                } else {
                                                    const examDates = relevantExams
                                                        .map(exam => exam.timestamp?.toDate?.() || new Date(exam.timestamp))
                                                        .filter(date => date instanceof Date && !isNaN(date));

                                                    return examDates.length > 0
                                                        ? new Date(Math.max(...examDates.map(d => d.getTime())))
                                                        : null;
                                                }
                                            })();

                                            const formattedLastActivity = lastActivityDate instanceof Date && !isNaN(lastActivityDate)
                                                ? lastActivityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                : '-';

                                            return (
                                                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center">
                                                            {/* Show ranking badge for all students */}
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 text-xs font-bold text-white ${index === 0 ? 'bg-yellow-400' :
                                                                index === 1 ? 'bg-gray-400' :
                                                                    index === 2 ? 'bg-orange-400' :
                                                                        'bg-blue-400'  // Default color for 4th place and beyond
                                                                }`}>
                                                                {index + 1}
                                                            </div>
                                                            <span className="text-slate-800 font-medium">{student.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                                            {activeView === 'topics'
                                                                ? (selectedAnalyticsTopic === 'all' ? topicKeys.length : 1)
                                                                : relevantExams.length}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center space-x-2">
                                                            <span className={`text-lg font-bold ${getScoreColor(activeView === 'topics' ? avgMastery : avgExamScore)}`}>
                                                                {(activeView === 'topics' ? avgMastery : avgExamScore).toFixed(1)}%
                                                            </span>
                                                            {getPerformanceIcon(activeView === 'topics' ? avgMastery : avgExamScore)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center text-slate-500">
                                                            <Clock className="h-4 w-4 mr-1" />
                                                            {formattedLastActivity}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No student data available</p>
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                    <div className="flex items-center mb-6">
                        <Activity className="h-5 w-5 text-slate-400 mr-2" />
                        <h4 className="text-lg font-semibold text-slate-800">
                            {selectedAnalyticsTopic === 'all'
                                ? `Recent ${activeView === 'topics' ? 'Quiz' : 'Exam'} Activity`
                                : `Recent ${activeView === 'topics' ? 'Quiz' : 'Exam'} Activity - ${selectedAnalyticsTopic}`}
                        </h4>
                    </div>

                    {students.length > 0 ? (
                        <div className="space-y-3">
                            {students
                                .flatMap(student => {
                                    if (activeView === 'topics') {
                                        return (student.quizAttempts || [])
                                            .filter(attempt =>
                                                (selectedAnalyticsTopic === 'all' || attempt.topic === selectedAnalyticsTopic))
                                            .map(attempt => ({
                                                ...attempt,
                                                type: attempt.quizType || 'topic',
                                                studentName: student.name || 'Unknown student'
                                            }));
                                    } else {
                                        return (student.examResults || [])
                                            .filter(exam => selectedAnalyticsTopic === 'all' ||
                                                (exam.topics && exam.topics.includes(selectedAnalyticsTopic)))
                                            .map(exam => ({
                                                id: exam.id,
                                                type: 'examResult',
                                                studentName: student.name || 'Unknown student',
                                                timestamp: exam.timestamp,
                                                score: exam.score || 0,
                                                topics: exam.topics || []
                                            }));
                                    }
                                })
                                .sort((a, b) => {
                                    const dateA = a.timestamp?.toDate?.() || new Date(a.timestamp);
                                    const dateB = b.timestamp?.toDate?.() || new Date(b.timestamp);
                                    return dateB - dateA;
                                })
                                .slice(0, 10)
                                .map((activity, index) => {
                                    const activityDate = new Date(activity.timestamp?.toDate?.() || activity.timestamp);
                                    const formattedTimestamp = activityDate.toLocaleString();

                                    return (
                                        <div key={index} className="bg-gradient-to-r from-slate-50 to-white p-4 rounded-lg border border-slate-100 hover:shadow-md transition-all duration-200">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeView === 'topics'
                                                        ? (activity.isCorrect ? 'bg-emerald-100' : 'bg-red-100')
                                                        : 'bg-blue-100'
                                                        }`}>
                                                        {activeView === 'topics' ? (
                                                            activity.isCorrect ?
                                                                <CheckCircle className="h-5 w-5 text-emerald-600" /> :
                                                                <XCircle className="h-5 w-5 text-red-600" />
                                                        ) : (
                                                            <FileText className="h-5 w-5 text-blue-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-800">{activity.studentName}</p>
                                                        <p className="text-sm text-slate-500">
                                                            {activeView === 'topics' ? (
                                                                <>
                                                                    Quiz: {activity.topic || 'Unknown Topic'}
                                                                    {activity.difficulty && ` - ${activity.difficulty}`}
                                                                    {activity.levelChange && ` → Level ${activity.levelChange}`}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    Exam{activity.topics?.length > 0 ?
                                                                        ` (${activity.topics.join(', ')})` :
                                                                        ''}
                                                                </>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center space-x-2">
                                                        {activeView === 'topics' ? (
                                                            <span className={`text-sm font-medium ${activity.isCorrect ? 'text-emerald-600' : 'text-red-600'
                                                                }`}>
                                                                {activity.isCorrect ? 'Correct' : 'Incorrect'}
                                                            </span>
                                                        ) : (
                                                            <span className={`text-sm font-medium ${getScoreColor(activity.score)}`}>
                                                                {activity.score?.toFixed(1) || 0}%
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        {formattedTimestamp}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                            {/* Show appropriate "no data" message based on the active view */}
                            {(() => {
                                const hasActivities = students.flatMap(s =>
                                    activeView === 'topics'
                                        ? (s.quizAttempts || [])
                                            .filter(attempt => selectedAnalyticsTopic === 'all' || attempt.topic === selectedAnalyticsTopic)
                                        : (s.examResults || [])
                                            .filter(exam => selectedAnalyticsTopic === 'all' ||
                                                (exam.topics && exam.topics.includes(selectedAnalyticsTopic)))
                                ).length === 0;

                                if (hasActivities) {
                                    return (
                                        <div className="text-center py-8">
                                            <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                            <p className="text-slate-500">
                                                No recent {activeView === 'topics' ? 'quiz' : 'exam'} activity
                                                {selectedAnalyticsTopic !== 'all' ? ` for ${selectedAnalyticsTopic}` : ''}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No student data available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsTab;