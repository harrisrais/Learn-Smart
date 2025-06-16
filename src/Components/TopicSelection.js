import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import {
  BookOpen,
  GraduationCap,
  Trophy,
  Brain,
  Layers,
  CheckCircle,
  XCircle,
  Sparkles,
  Clock,
  ChevronRight,
  BookMarked,
  CircleHelp,
  Target,
  Star,
  TrendingUp,
  User,
  BarChart3,
  Flame
} from 'lucide-react';

function TopicSelection() {
  const [user] = useAuthState(auth);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(''); // Changed to single topic
  const [quizType, setQuizType] = useState('exam');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topicProgress, setTopicProgress] = useState({});
  const [examResults, setExamResults] = useState({});
  const [userStats, setUserStats] = useState({ 
    totalExams: 0, 
    averageExamScore: 0, 
    masteredTopics: 0, 
    averageTopicScore: 0,
    topicsAttempted: 0,
    examsPassed: 0
  });
  const navigate = useNavigate();

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchTopics();
    if (user) {
      fetchUserProgress();
      fetchExamResults();
      fetchUserStats();
    }
  }, [user]);

  const fetchTopics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/topics`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch topics: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setTopics(data.topics || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching topics:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const fetchUserProgress = async () => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.topicsMastery) {
          setTopicProgress(userData.topicsMastery);
        }
      }
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }
  };

  const fetchExamResults = async () => {
    try {
      const results = {};

      const examResultsRef = collection(db, 'examResults');
      const q = query(examResultsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        if (data.topics && Array.isArray(data.topics)) {
          data.topics.forEach(topic => {
            if (!results[topic]) {
              results[topic] = { correct: 0, incorrect: 0, total: 0 };
            }

            results[topic].correct += data.correct || 0;
            results[topic].total += data.totalQuestions || 0;
            results[topic].incorrect = results[topic].total - results[topic].correct;
          });
        }
      });

      setExamResults(results);
    } catch (error) {
      console.error('Error fetching exam results:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      // Fetch exam results
      const examResultsRef = collection(db, 'examResults');
      const q = query(examResultsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      let totalExams = 0;
      let totalExamScore = 0;
      let examsPassed = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalExams++;
        const score = data.score || 0;
        totalExamScore += score;

        if (score >= 60) {
          examsPassed++;
        }
      });

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      let masteredTopicsCount = 0;
      let totalTopicScore = 0;
      let topicsAttempted = 0;

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const topicsMastery = userData.topicsMastery || {};

        Object.entries(topicsMastery).forEach(([topic, data]) => {
          const quizData = data?.topicQuiz || data;
          const correct = quizData?.correct || 0;
          const incorrect = quizData?.incorrect || 0;
          const total = correct + incorrect;

          if (total > 0) {
            topicsAttempted++;
            const percentage = (correct / total) * 100;
            totalTopicScore += percentage;

            // Check if topic is mastered - completed all levels (Hard/Advanced) with good performance
            const currentLevel = data?.currentLevel;
            if ((currentLevel === 'Advanced' || currentLevel === 'Hard') && correct >= 3) {
              masteredTopicsCount++;
            }
          }
        });
      }

      setUserStats({
        totalExams,
        averageExamScore: totalExams > 0 ? totalExamScore / totalExams : 0,
        masteredTopics: masteredTopicsCount,
        averageTopicScore: topicsAttempted > 0 ? totalTopicScore / topicsAttempted : 0,
        topicsAttempted,
        examsPassed
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  // Modified to handle single topic selection for both modes
  const handleTopicChange = (topic) => {
    setSelectedTopic(selectedTopic === topic ? '' : topic);
  };

  const getTopicScore = (topic) => {
    if (quizType === 'topic') {
      if (!topicProgress[topic] || !topicProgress[topic].topicQuiz) return null;

      const stats = topicProgress[topic].topicQuiz;
      const total = stats.correct + stats.incorrect;

      return total > 0 ? { correct: stats.correct, total } : null;
    } else {
      if (!examResults[topic]) return null;

      const examStats = examResults[topic];
      return examStats.total > 0 ? { correct: examStats.correct, total: examStats.total } : null;
    }
  };

  const getTopicLevel = (topic) => {
    if (!topicProgress[topic] || !topicProgress[topic].currentLevel) {
      return 'Not started';
    }
    return topicProgress[topic].currentLevel;
  };

  const getTopicLevelColor = (level) => {
    switch (level) {
      case 'Not started':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'Beginner':
      case 'Easy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Intermediate':
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Advanced':
      case 'Hard':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Expert':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'Not started':
        return <CircleHelp size={16} />;
      case 'Beginner':
      case 'Easy':
        return <BookOpen size={16} />;
      case 'Intermediate':
      case 'Medium':
        return <BookMarked size={16} />;
      case 'Advanced':
      case 'Hard':
        return <GraduationCap size={16} />;
      case 'Expert':
        return <Trophy size={16} />;
      default:
        return <CircleHelp size={16} />;
    }
  };

  const handleTopicDoubleClick = async (topic) => {
    setSelectedTopic(topic);
    setIsSubmitting(true);
    setError(null);

    try {
      const userId = user ? user.uid : null;

      const response = await fetch(`${API_BASE_URL}/api/quiz/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': user ? `Bearer ${await user.getIdToken()}` : ''
        },
        body: JSON.stringify({
          type: quizType, // Uses current quiz type (exam or topic)
          topics: [topic],
          user_id: userId
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to start quiz: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      localStorage.setItem('currentQuiz', JSON.stringify({
        currentQuestion: data.question,
        totalQuestions: data.total_questions,
        questionNumber: 1,
        quizType: quizType
      }));

      navigate('/quiz/screen');
    } catch (error) {
      console.error('Error starting quiz:', error);
      setError(error.message || 'Failed to start quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const userId = user ? user.uid : null;

      const response = await fetch(`${API_BASE_URL}/api/quiz/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': user ? `Bearer ${await user.getIdToken()}` : ''
        },
        body: JSON.stringify({
          type: quizType,
          topics: selectedTopic ? [selectedTopic] : undefined,
          user_id: userId
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to start quiz: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      localStorage.setItem('currentQuiz', JSON.stringify({
        currentQuestion: data.question,
        totalQuestions: data.total_questions,
        questionNumber: 1,
        quizType: quizType
      }));

      navigate('/quiz/screen');
    } catch (error) {
      console.error('Error starting quiz:', error);
      setError(error.message || 'Failed to start quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-screen h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 flex flex-col items-center justify-center relative overflow-hidden pt-20">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        
        <div className="relative z-10 text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-2xl font-bold text-gray-800">Loading Your Learning Journey</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 relative overflow-x-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-indigo-600/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 rounded-full mix-blend-multiply filter blur-xl animate-bounce" style={{ animationDuration: '3s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-pink-600/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-blue-300/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full px-4 py-[100px]">
        <div className="max-w-7xl mx-auto">
          {/* Hero Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl mb-6 shadow-2xl">
              <Brain className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-4">
              Choose Your Learning Path
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Select a topic to challenge yourself, track your progress, and master new concepts with our intelligent quiz system
            </p>
          </div>

          {/* User Stats Dashboard */}
          {user && (
            <div className="mb-10">
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Welcome back, {user.displayName || user.email?.split('@')[0] || 'Learner'}!</h2>
                      <p className="text-gray-600">Ready to expand your knowledge?</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-gradient-to-r from-amber-100 to-yellow-100 px-4 py-2 rounded-full border border-amber-200">
                    <Flame className="w-5 h-5 text-amber-600" />
                    <span className="font-bold text-amber-800">
                      {quizType === 'topic' 
                        ? `${Math.floor(userStats.averageTopicScore)}% avg`
                        : `${Math.floor(userStats.averageExamScore)}% avg`
                      }
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">
                          {quizType === 'topic' ? 'Topics Attempted' : 'Total Attempted Exams'}
                        </p>
                        <p className="text-2xl font-bold text-blue-800">
                          {quizType === 'topic' ? userStats.topicsAttempted : userStats.totalExams}
                        </p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">
                          {quizType === 'topic' ? 'Topics Mastered' : 'Exams Passed'}
                        </p>
                        <p className="text-2xl font-bold text-green-800">
                          {quizType === 'topic' ? userStats.masteredTopics : userStats.examsPassed}
                        </p>
                      </div>
                      <Trophy className="w-8 h-8 text-green-500" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600 font-medium">Average Score</p>
                        <p className="text-2xl font-bold text-purple-800">
                          {quizType === 'topic' 
                            ? Math.floor(userStats.averageTopicScore)
                            : Math.floor(userStats.averageExamScore)
                          }%
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-500" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-600 font-medium">Available Topics</p>
                        <p className="text-2xl font-bold text-orange-800">{topics.length}</p>
                      </div>
                      <Target className="w-8 h-8 text-orange-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Card */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-white/20">
            
            {error && (
              <div className="m-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl flex items-center backdrop-blur-sm">
                <XCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Quiz Type Selector */}
            <div className="p-8 pb-0">
              <div className="flex justify-center mb-8">
                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl p-2 inline-flex items-center shadow-inner border border-blue-200">
                  <button
                    type="button"
                    className={`flex items-center px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${quizType === 'exam'
                      ? 'bg-white text-blue-700 shadow-lg scale-105'
                      : 'text-blue-600 hover:bg-white/50'
                      }`}
                    onClick={() => setQuizType('exam')}
                  >
                    <GraduationCap className="mr-3 h-5 w-5" />
                    Topic Exam
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Single topic</span>
                  </button>
                  <button
                    type="button"
                    className={`flex items-center px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${quizType === 'topic'
                      ? 'bg-white text-blue-700 shadow-lg scale-105'
                      : 'text-blue-600 hover:bg-white/50'
                      }`}
                    onClick={() => setQuizType('topic')}
                  >
                    <BookOpen className="mr-3 h-5 w-5" />
                    Topic Quiz
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Single topic</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center mb-8 space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-800">Available Topics</h2>
                  <p className="text-gray-600">
                    Select one topic to focus your learning or double-click to start immediately ({quizType === 'exam' ? 'exam' : 'quiz'} mode)
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 pt-0">
              <div className="mb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {topics.map(topic => {
                    const isSelected = selectedTopic === topic;
                    const score = getTopicScore(topic);
                    const level = getTopicLevel(topic);
                    const levelColor = getTopicLevelColor(level);
                    const levelIcon = getLevelIcon(level);
                    const percentage = score ? (score.correct / score.total) * 100 : 0;

                    return (
                      <div
                        key={topic}
                        onClick={() => handleTopicChange(topic)}
                        onDoubleClick={() => handleTopicDoubleClick(topic)}
                        className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-105 backdrop-blur-sm ${isSelected
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg scale-105'
                          : 'border-gray-200 bg-white/60 hover:border-blue-300 hover:bg-white/80'
                          }`}
                      >
                        {/* Topic header */}
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-700 transition-colors">
                            {topic}
                          </h3>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full font-medium">
                              Double-click to start {quizType === 'exam' ? 'exam' : 'quiz'}
                            </span>
                          </div>
                        </div>

                        {/* Level badge */}
                        <div className="flex items-center mb-4">
                          <div className={`inline-flex items-center px-3 py-2 rounded-xl text-sm font-semibold border ${levelColor}`}>
                            {levelIcon}
                            <span className="ml-2">{level}</span>
                          </div>
                          {(level === 'Expert' || level === 'Advanced' || level === 'Hard') && (
                            <div className="ml-2 flex items-center">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            </div>
                          )}
                        </div>

                        {/* Progress section */}
                        {score && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center">
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                  <span className="text-green-600 font-medium">{score.correct}</span>
                                </div>
                                <div className="flex items-center">
                                  <XCircle className="h-4 w-4 text-red-400 mr-1" />
                                  <span className="text-red-500 font-medium">{score.total - score.correct}</span>
                                </div>
                              </div>
                              <span className="font-bold text-gray-700">{percentage.toFixed(0)}%</span>
                            </div>
                            
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  percentage >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                  percentage >= 60 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                                  'bg-gradient-to-r from-yellow-500 to-orange-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute top-4 right-4 flex items-center justify-center h-8 w-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-full shadow-lg">
                            <CheckCircle className="h-5 w-5" />
                          </div>
                        )}

                        {/* Hover glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/0 to-indigo-400/0 group-hover:from-blue-400/5 group-hover:to-indigo-400/5 transition-all duration-300 pointer-events-none" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  className={`group flex items-center px-10 py-4 rounded-2xl font-bold text-lg text-white shadow-2xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden ${!selectedTopic || isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700'
                    }`}
                  disabled={!selectedTopic || isSubmitting}
                >
                  {/* Button background effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  
                  {isSubmitting ? (
                    <>
                      <Clock className="animate-spin h-6 w-6 mr-3" />
                      <span>Starting Your Quiz...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-6 w-6 mr-3 group-hover:animate-pulse" />
                      <span>Start New Quiz</span>
                      <ChevronRight className="h-6 w-6 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>

              {/* Helper text */}
              <div className="text-center mt-6">
                <p className="text-gray-600 text-sm">
                  {!selectedTopic 
                    ? 'Select a topic to start your focused learning session'
                    : `Ready to start your ${quizType === 'topic' ? 'topic quiz' : 'exam'} on "${selectedTopic}"?`
                  }
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopicSelection;