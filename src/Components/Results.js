import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import {
  Trophy,
  Target,
  TrendingUp,
  Award,
  BookOpen,
  CheckCircle,
  XCircle,
  Star,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  BarChart3,
  Brain,
  AlertCircle,
  Clock,
  Zap,
  School
} from 'lucide-react';

function Results() {
  const [user] = useAuthState(auth);
  const [topicsMastery, setTopicsMastery] = useState({});
  const [examResults, setExamResults] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('topics');
  const [selectedExam, setSelectedExam] = useState(null);
  const [teacherFeedback, setTeacherFeedback] = useState({});
  const [expandedExamReview, setExpandedExamReview] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user topics mastery
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setTopicsMastery(data.topicsMastery || {});
        }

        // Fetch exam results with questions data
        const examResultsRef = collection(db, 'examResults');
        const q = query(examResultsRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);

        const results = [];
        querySnapshot.forEach((doc) => {
          const examData = doc.data();
          results.push({
            id: doc.id,
            ...examData,
            // Include questions array if available
            questions: examData.questions || []
          });
        });

        // Sort by timestamp descending
        results.sort((a, b) => {
          const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp);
          const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp);
          return timeB - timeA;
        });

        setExamResults(results);

        // Fetch teacher feedback
        const feedbackRef = collection(db, 'users', user.uid, 'feedback');
        const feedbackSnapshot = await getDocs(feedbackRef);

        const feedbackData = {};
        feedbackSnapshot.forEach((doc) => {
          const feedback = doc.data();
          if (!feedbackData[feedback.topic]) {
            feedbackData[feedback.topic] = [];
          }
          feedbackData[feedback.topic].push(feedback);
        });

        // Sort feedback by timestamp
        Object.keys(feedbackData).forEach(topic => {
          feedbackData[topic].sort((a, b) => {
            const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp);
            const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp);
            return timeB - timeA;
          });
        });

        setTeacherFeedback(feedbackData);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const startNewQuiz = () => navigate('/quiz');

  const handleTopicClick = (topicName) => {
    setSelectedTopic(prev => prev === topicName ? null : topicName);
  };

  const handleExamClick = (index) => {
    setSelectedExam(prev => prev === index ? null : index);
  };

  const toggleExamReview = (examId) => {
    setExpandedExamReview(prev => prev === examId ? null : examId);
  };

  const takeAnotherQuiz = (quizType) => {
    if (quizType === 'topic' && selectedTopic) {
      navigate(`/quiz?topic=${encodeURIComponent(selectedTopic)}`);
    } else {
      navigate('/quiz');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-600';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Satisfactory';
    return 'Poor';
  };

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

  const getFeedbackForTopic = (topicData) => {
    if (!topicData) return null;

    const quizData = getTopicQuizData(topicData);
    const total = quizData.correct + quizData.incorrect;
    const percentage = total > 0 ? (quizData.correct / total * 100) : 0;

    if (percentage >= 90) return "Outstanding mastery! You've demonstrated exceptional understanding of this topic.";
    if (percentage >= 80) return "Excellent progress! You have a strong grasp of this material.";
    if (percentage >= 70) return "Good job! You're showing solid understanding but there's room to improve.";
    if (percentage >= 60) return "You're making progress, but more practice is needed to master this topic.";
    return "This topic needs more attention. Consider reviewing the fundamentals and practicing more.";
  };

  const getFeedbackForExam = (examData) => {
    if (!examData) return null;
    const score = examData.score || 0;

    if (score >= 90) return "Outstanding performance! You've demonstrated exceptional understanding across all tested topics.";
    if (score >= 80) return "Excellent work! You have a strong grasp of the material with only minor gaps.";
    if (score >= 70) return "Good job! Your understanding is solid, though there are some areas that could use improvement.";
    if (score >= 60) return "You've passed, but there are significant knowledge gaps to address. Review the topics you struggled with.";
    return "You need additional study and practice. Focus on understanding the core concepts before moving forward.";
  };

  const isTopicCompleted = (topicData) => {
    if (!topicData) return false;
    const quizData = getTopicQuizData(topicData);
    return (topicData.currentLevel === "Advanced" || (quizData.correct + quizData.incorrect >= 9));
  };

  const renderTeacherFeedback = (topicName) => {
    if (!teacherFeedback[topicName] || teacherFeedback[topicName].length === 0) {
      return null;
    }

    const latestFeedback = teacherFeedback[topicName][0];

    return (
      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Teacher Feedback</h3>
          </div>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(latestFeedback.timestamp?.toDate?.() || latestFeedback.timestamp).toLocaleDateString()}
          </span>
        </div>

        <div className="mb-2">
          <div className="flex items-center gap-2">
            <div className="flex text-yellow-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < latestFeedback.rating ? 'fill-current' : ''}`} />
              ))}
            </div>
            <span className="text-sm text-gray-600">
              by {latestFeedback.teacherName || 'Teacher'}
            </span>
          </div>
        </div>

        <p className="text-gray-700 leading-relaxed">{latestFeedback.feedback}</p>
      </div>
    );
  };

  // Fixed Wrong Answers Rendering
  const renderWrongAnswers = (exam) => {
    // Check if questions data exists and is properly formatted
    if (!exam.questions || !Array.isArray(exam.questions) || exam.questions.length === 0) {
      return (
        <div className="text-center py-6 text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium">No detailed question data available</p>
          <p className="text-sm">This exam was taken before detailed tracking was enabled.</p>
        </div>
      );
    }

    // Filter wrong answers more safely
    const wrongAnswers = exam.questions.filter(q => {
      // Handle different possible data structures
      return q && (q.isCorrect === false || q.correct === false || q.userAnswer !== q.correctAnswer);
    });

    if (wrongAnswers.length === 0) {
      return (
        <div className="text-center py-6 text-green-600">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <p className="text-lg font-semibold">Perfect Score! 🎉</p>
          <p className="text-sm text-gray-600">You answered all questions correctly.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-lg flex items-center gap-2 text-gray-800">
            <XCircle className="w-5 h-5 text-red-500" />
            Questions to Review
          </h4>
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            {wrongAnswers.length} incorrect
          </span>
        </div>

        {wrongAnswers.map((question, idx) => (
          <div key={idx} className="bg-white border border-red-200 rounded-lg p-4 shadow-sm">
            <div className="mb-3">
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  Question {question.questionNumber || question.number || idx + 1}
                </span>
                {question.topic && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {question.topic}
                  </span>
                )}
              </div>
              <p className="text-gray-800 font-medium leading-relaxed">
                {question.question || question.text || 'Question text not available'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-red-700">Your Answer:</span>
                  <p className="text-red-600 font-medium mt-1">
                    {question.userAnswer || question.selectedAnswer || 'No answer provided'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-green-700">Correct Answer:</span>
                  <p className="text-green-600 font-medium mt-1">
                    {question.correctAnswer || question.correct || 'Not available'}
                  </p>
                </div>
              </div>

              {(question.explanation || question.reasoning) && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Brain className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-blue-700">Explanation:</span>
                      <p className="text-blue-800 mt-1 text-sm leading-relaxed">
                        {question.explanation || question.reasoning}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="font-medium text-blue-800 mb-1">Study Recommendation</h5>
              <p className="text-blue-700 text-sm">
                Review these {wrongAnswers.length} questions and their explanations. 
                Consider taking another quiz on the same topics to reinforce your learning.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Fixed Performance Trend Chart
  const renderPerformanceTrend = () => {
    if (examResults.length < 2) return null;

    // Get last 5 exams for the trend chart
    const recentExams = examResults.slice(0, 5).reverse();
    const maxScore = 100;

    return (
      <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
        <h4 className="font-semibold text-sm text-gray-700 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Recent Performance Trend ({recentExams.length} exams)
        </h4>
        
        <div className="relative">
          {/* Chart container */}
          <div className="flex items-end justify-between gap-2 h-24 bg-gray-50 rounded-lg p-3 border">
            {recentExams.map((exam, idx) => {
              const score = exam.score || 0;
              const height = Math.max((score / maxScore) * 100, 5); // Minimum 5% height for visibility
              
              return (
                <div key={exam.id || idx} className="flex-1 flex flex-col items-center group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {score.toFixed(1)}% - Exam #{examResults.length - examResults.indexOf(exam)}
                    </div>
                  </div>
                  
                  {/* Bar */}
                  <div
                    className={`w-full rounded-t transition-all duration-500 hover:opacity-80 ${
                      score >= 80 ? 'bg-gradient-to-t from-green-500 to-green-400' :
                      score >= 70 ? 'bg-gradient-to-t from-blue-500 to-blue-400' :
                      score >= 60 ? 'bg-gradient-to-t from-yellow-500 to-yellow-400' :
                      'bg-gradient-to-t from-red-500 to-red-400'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  
                  {/* Exam number */}
                  <span className="text-xs text-gray-500 mt-1 font-medium">
                    #{examResults.length - examResults.indexOf(exam)}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-400 -ml-8">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>
        </div>

        {/* Trend analysis */}
        {recentExams.length >= 3 && (() => {
          const firstScore = recentExams[0]?.score || 0;
          const lastScore = recentExams[recentExams.length - 1]?.score || 0;
          const trend = lastScore - firstScore;
          
          return (
            <div className="mt-3 text-sm">
              {trend > 5 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>Improving trend! (+{trend.toFixed(1)}% over recent exams)</span>
                </div>
              ) : trend < -5 ? (
                <div className="flex items-center gap-2 text-red-600">
                  <TrendingUp className="w-4 h-4 rotate-180" />
                  <span>Declining trend ({trend.toFixed(1)}% over recent exams)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-600">
                  <BarChart3 className="w-4 h-4" />
                  <span>Stable performance (±{Math.abs(trend).toFixed(1)}% variation)</span>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
      </div>
      <p className="mt-4 text-gray-600 font-medium">Loading your Results...</p>
    </div>
  );

  // Calculate mastery percentages for topics
  const topicEntries = Object.entries(topicsMastery)
    .filter(([name]) => !name.toLowerCase().includes('exam'))
    .map(([name, data]) => {
      const quizData = getTopicQuizData(data);
      const total = quizData.correct + quizData.incorrect;
      const percentage = total > 0 ? (quizData.correct / total * 100) : 0;
      return { name, data, percentage };
    });

  return (
    <div className="max-w-6xl mx-auto mt-[80px] mb-8 p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Your Learning Progress
        </h1>
        <p className="text-gray-600">Track your journey to mastery</p>
      </div>

      {/* View Selection */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-xl inline-flex shadow-inner">
          <button
            onClick={() => setActiveView('topics')}
            className={`px-6 py-3 font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${activeView === 'topics'
                ? 'bg-white text-blue-600 shadow-md'
                : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            <Target className="w-4 h-4" />
            Topics Mastery
          </button>
          <button
            onClick={() => setActiveView('exams')}
            className={`px-6 py-3 font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${activeView === 'exams'
                ? 'bg-white text-blue-600 shadow-md'
                : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            <FileText className="w-4 h-4" />
            Exam Results
          </button>
        </div>
      </div>

      {/* TOPICS VIEW */}
      {activeView === 'topics' && (
        <>
          {/* Selected Topic Details */}
          {selectedTopic && topicsMastery[selectedTopic] && (
            <div className="mb-8 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                  {selectedTopic}
                </h2>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <span className="text-lg font-bold text-gray-800">
                    {topicsMastery[selectedTopic].currentLevel || 'Beginner'}
                  </span>
                </div>
              </div>

              {/* Progress Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {(() => {
                  const quizData = getTopicQuizData(topicsMastery[selectedTopic]);
                  const total = quizData.correct + quizData.incorrect;
                  const accuracy = total > 0 ? (quizData.correct / total * 100) : 0;

                  return (
                    <>
                      <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Correct Answers</p>
                            <p className="text-2xl font-bold text-green-600">{quizData.correct}</p>
                          </div>
                          <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                      </div>

                      <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Incorrect Answers</p>
                            <p className="text-2xl font-bold text-red-600">{quizData.incorrect}</p>
                          </div>
                          <XCircle className="w-8 h-8 text-red-500" />
                        </div>
                      </div>

                      <div className="col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Accuracy Rate</span>
                          <span className="text-lg font-bold text-blue-600">{accuracy.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                            style={{ width: `${accuracy}%` }}
                          />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* System Feedback */}
              {isTopicCompleted(topicsMastery[selectedTopic]) && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-purple-800">System Analysis</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{getFeedbackForTopic(topicsMastery[selectedTopic])}</p>
                </div>
              )}

              {/* Teacher Feedback */}
              {renderTeacherFeedback(selectedTopic)}

              <div className="text-center mt-6">
                <button
                  onClick={() => takeAnotherQuiz('topic')}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 mx-auto"
                >
                  <Target className="w-5 h-5" />
                  Practice {selectedTopic} Again
                </button>
              </div>
            </div>
          )}

          {/* Topics Grid */}
          {topicEntries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {topicEntries.map(({ name, data, percentage }) => {
                const hasTeacherFeedback = teacherFeedback[name] && teacherFeedback[name].length > 0;
                const quizData = getTopicQuizData(data);
                const totalQuestions = quizData.correct + quizData.incorrect;

                return (
                  <div
                    key={name}
                    onClick={() => handleTopicClick(name)}
                    className={`relative p-5 bg-white rounded-xl shadow-lg cursor-pointer transition-all duration-300 border-2 ${selectedTopic === name
                        ? 'border-blue-500 shadow-xl transform scale-105'
                        : 'border-transparent hover:shadow-xl hover:transform hover:scale-105'
                      }`}
                  >
                    {hasTeacherFeedback && (
                      <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1.5 shadow-md">
                        <School className="w-4 h-4" />
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-lg text-gray-800">{name}</h3>
                      <Award className={`w-5 h-5 ${percentage >= 80 ? 'text-yellow-500' : 'text-gray-300'}`} />
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Mastery</span>
                        <span className="font-semibold text-gray-800">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${percentage >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                              percentage >= 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                'bg-gradient-to-r from-red-500 to-pink-500'
                            }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 flex items-center gap-1">
                        <BarChart3 className="w-4 h-4" />
                        {totalQuestions} questions
                      </span>
                      <span className={`font-medium px-2 py-1 rounded-full text-xs ${data.currentLevel === 'Advanced' ? 'bg-purple-100 text-purple-700' :
                          data.currentLevel === 'Intermediate' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                        {data.currentLevel || 'Not started'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">You haven't completed any topic quizzes yet.</p>
              <p className="text-gray-500 mt-2">Start practicing to track your progress!</p>
            </div>
          )}
        </>
      )}

      {/* EXAMS VIEW */}
      {activeView === 'exams' && (
        <>
          {examResults.length > 0 ? (
            <div className="space-y-4">
              {examResults.map((exam, index) => (
                <div
                  key={exam.id || index}
                  className={`bg-white rounded-xl shadow-lg transition-all duration-300 border-2 ${selectedExam === index
                      ? 'border-blue-500 shadow-xl'
                      : 'border-transparent hover:shadow-xl'
                    }`}
                >
                  <div
                    onClick={() => handleExamClick(index)}
                    className="p-5 cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Trophy className={`w-8 h-8 ${exam.score >= 80 ? 'text-yellow-500' :
                            exam.score >= 70 ? 'text-gray-400' :
                              'text-gray-300'
                          }`} />
                        <div>
                          <h3 className="font-bold text-lg">Exam #{examResults.length - index}</h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(exam.timestamp?.toDate?.() || exam.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${getScoreColor(exam.score)}`}>
                          {exam.score?.toFixed(1) || '0.0'}%
                        </div>
                        <p className={`text-sm font-medium ${getScoreColor(exam.score)}`}>
                          {getScoreLabel(exam.score)}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${exam.score >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                              exam.score >= 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                'bg-gradient-to-r from-red-500 to-pink-500'
                            }`}
                          style={{ width: `${exam.score || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {selectedExam === index && (
                    <div className="px-5 pb-5 border-t">
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
                          <p className="text-sm text-gray-600">Correct</p>
                          <p className="font-bold text-green-600">{exam.correct || 0}</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3 text-center">
                          <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                          <p className="text-sm text-gray-600">Incorrect</p>
                          <p className="font-bold text-red-600">
                            {(exam.totalQuestions || 0) - (exam.correct || 0)}
                          </p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <FileText className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                          <p className="text-sm text-gray-600">Total</p>
                          <p className="font-bold text-blue-600">{exam.totalQuestions || 0}</p>
                        </div>
                      </div>

                      {/* Topics covered */}
                      {exam.topics && exam.topics.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Topics Covered:</p>
                          <div className="flex flex-wrap gap-2">
                            {exam.topics.map((topic, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm rounded-full font-medium"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Exam Feedback */}
                      {exam.totalQuestions >= 5 && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="w-5 h-5 text-purple-600" />
                            <h3 className="font-semibold text-purple-800">Performance Analysis</h3>
                          </div>
                          <p className="text-gray-700">{getFeedbackForExam(exam)}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExamReview(exam.id);
                          }}
                          className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Review Wrong Answers
                          {expandedExamReview === exam.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const topicParam = exam.topics && exam.topics[0]
                              ? `?topic=${encodeURIComponent(exam.topics[0])}`
                              : '';
                            navigate(`/quiz${topicParam}`);
                          }}
                          className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          <Target className="w-4 h-4" />
                          Practice Similar Exam
                        </button>
                      </div>

                      {/* Expanded Review Section */}
                      {expandedExamReview === exam.id && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                          {renderWrongAnswers(exam)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">You haven't completed any exams yet.</p>
              <p className="text-gray-500 mt-2">Take your first exam to see results here!</p>
            </div>
          )}

          {/* Stats summary */}
          {examResults.length > 0 && (
            <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6 border border-blue-200">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                Your Exam Statistics
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <span className="text-2xl font-bold text-gray-800">{examResults.length}</span>
                  </div>
                  <p className="text-sm text-gray-600">Total Exams</p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-8 h-8 text-green-500" />
                    <span className="text-2xl font-bold text-gray-800">
                      {examResults.length > 0 ? (examResults.reduce((sum, exam) => sum + (exam.score || 0), 0) / examResults.length).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Average Score</p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <Trophy className="w-8 h-8 text-yellow-500" />
                    <span className="text-2xl font-bold text-gray-800">
                      {examResults.length > 0 ? Math.max(...examResults.map(exam => exam.score || 0)).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Best Score</p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <BookOpen className="w-8 h-8 text-purple-500" />
                    <span className="text-2xl font-bold text-gray-800">
                      {examResults.reduce((sum, exam) => sum + (exam.totalQuestions || 0), 0)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Total Questions</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8">
        <button
          onClick={startNewQuiz}
          className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-full shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200 flex items-center gap-2"
        >
          <Zap className="w-5 h-5 group-hover:animate-pulse" />
          Start New Quiz
        </button>
      </div>
    </div>
  );
}

export default Results;