// src/Components/QuizScreen.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { doc, collection, addDoc, updateDoc, increment, getDoc } from 'firebase/firestore';
import {
  CheckCircle,
  XCircle,
  Clock,
  Brain,
  Target,
  BookOpen,
  GraduationCap,
  Star,
  TrendingUp,
  Award,
  Zap,
  MessageSquare,
  X,
  ArrowRight,
  Lightbulb,
  BarChart3,
  Timer,
  FileText,
  Trophy
} from 'lucide-react';

function QuizScreen() {
  const [user] = useAuthState(auth);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [quizType, setQuizType] = useState('exam');
  const [currentLevels, setCurrentLevels] = useState({});
  const [startTime] = useState(new Date());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserProgress = async () => {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            setCurrentLevels(userData.topicsMastery || {});
          }
        } catch (error) {
          console.error("Error loading user progress:", error);
        }
      }
    };

    loadUserProgress();

    const quizData = JSON.parse(localStorage.getItem('currentQuiz'));
    if (quizData) {
      setCurrentQuestion(quizData.currentQuestion);
      setTotalQuestions(quizData.totalQuestions);
      setQuestionNumber(quizData.questionNumber);
      setQuizType(quizData.quizType);
    } else {
      navigate('/');
    }
  }, [user, navigate]);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((new Date() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const getCurrentLevelForTopic = (topic) => {
    return currentLevels[topic]?.currentLevel || 'Easy';
  };

  const recordAttemptInFirestore = async (userId, question, isCorrect, confidence, aiFeedback) => {
    try {
      const userRef = doc(db, 'users', userId);
      const attemptsRef = collection(userRef, 'quizAttempts');
  
      // Always record the attempt
      await addDoc(attemptsRef, {
        questionId: question.id,
        topic: question.topic,
        difficulty: question.difficulty,
        isCorrect,
        confidence: confidence || null,
        feedback: aiFeedback || null,
        quizType: quizType,
        timestamp: new Date(),
      });
  
      const topicPath = `topicsMastery.${question.topic}`;
  
      // Only update topicQuiz for topic quizzes (not exams)
      if (quizType === 'topic') {
        await updateDoc(userRef, {
          [`${topicPath}.topicQuiz.correct`]: increment(isCorrect ? 1 : 0),
          [`${topicPath}.topicQuiz.incorrect`]: increment(isCorrect ? 0 : 1),
          [`${topicPath}.topicQuiz.lastUpdated`]: new Date(),
          [`${topicPath}.lastUpdated`]: new Date(),
        });
      }
    } catch (error) {
      console.error("Error saving attempt:", error);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      setFeedback({ isCorrect: false, message: 'Please enter an answer before submitting' });
      return;
    }
  
    setIsSubmitting(true);
    setFeedback(null);
  
    try {
      const response = await fetch('http://localhost:5000/api/quiz/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': user ? `Bearer ${await user.getIdToken()}` : ''
        },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          answer: answer,
          quiz_type: quizType
        })
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to submit answer: ${response.status} ${response.statusText}`);
      }
  
      const data = await response.json();
      console.log('Answer submission response:', data);
  
      // Store all feedback data including AI-generated feedback
      setFeedback({
        isCorrect: data.is_correct === true,
        message: data.feedback || "",
        correctAnswer: data.correct_answer || "",
        improvements: data.improvements || [],
        confidence: data.confidence || 0
      });
  
      if (user) {
        await recordAttemptInFirestore(
          user.uid,
          currentQuestion,
          data.is_correct === true,
          data.confidence,
          data.feedback
        );
      }
  
      if (user && data.new_level && currentQuestion?.topic && quizType === 'topic') {
        const topic = currentQuestion.topic;
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          [`topicsMastery.${topic}.currentLevel`]: data.new_level
        });
        setCurrentLevels(prevLevels => ({
          ...prevLevels,
          [topic]: {
            ...prevLevels[topic],
            currentLevel: data.new_level
          }
        }));
      }
  
      if (quizType === 'exam') {
        if (data.next_question) {
          updateQuizState(data.next_question, data.current_question || questionNumber + 1);
        } else {
          await completeQuiz(data);
        }
      } else {
        setTimeout(() => {
          if (data.quiz_complete) {
            completeQuiz(data);
          } else if (data.next_question) {
            updateQuizState(data.next_question, data.current_question);
          }
        }, 1500);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setFeedback({ isCorrect: false, message: `Submission failed: ${error.message}. Please try again.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateQuizState = (nextQuestion, newQuestionNumber) => {
    setCurrentQuestion(nextQuestion);
    setQuestionNumber(newQuestionNumber);
    setAnswer('');
    localStorage.setItem('currentQuiz', JSON.stringify({
      currentQuestion: nextQuestion,
      totalQuestions,
      questionNumber: newQuestionNumber,
      quizType,
    }));
  };

  const completeQuiz = async (resultsData) => {
    if (user && currentQuestion?.topic) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const topic = currentQuestion.topic;
  
        if (resultsData.quiz_complete && quizType === 'topic') {
          await updateDoc(userRef, {
            [`topicsMastery.${topic}.currentLevel`]: 
              resultsData.new_level || currentQuestion.difficulty,
            [`topicsMastery.${topic}.lastUpdated`]: new Date()
          });
          setCurrentLevels(prevLevels => ({
            ...prevLevels,
            [topic]: {
              ...prevLevels[topic],
              currentLevel: resultsData.new_level || currentQuestion.difficulty
            }
          }));
        }
  
        if (quizType === 'exam' && resultsData.quiz_complete) {
          const examResultsRef = collection(db, 'examResults');
          await addDoc(examResultsRef, {
            userId: user.uid,
            topics: [currentQuestion.topic],
            score: resultsData.score || 0,
            totalQuestions: totalQuestions,
            correct: resultsData.correct || Math.round((resultsData.score / 100) * totalQuestions) || 0,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error("Error saving quiz results:", error);
      }
    }
    localStorage.removeItem('currentQuiz');
    navigate('/quiz/results');
  };
  
  const handleDismissFeedback = () => {
    setFeedback(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getDifficultyIcon = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return <BookOpen className="w-4 h-4" />;
      case 'medium':
        return <Target className="w-4 h-4" />;
      case 'hard':
        return <Award className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getQuizTypeIcon = () => {
    return quizType === 'exam' ? <GraduationCap className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />;
  };

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        
        <div className="relative z-10 text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-gray-800">Preparing Your Question</h2>
            <p className="text-gray-600 text-lg">Getting everything ready for your learning journey...</p>
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <Brain className="w-5 h-5 animate-pulse" />
              <span className="text-sm font-medium">AI is generating personalized content</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-indigo-600/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 rounded-full mix-blend-multiply filter blur-xl animate-bounce" style={{ animationDuration: '3s' }}></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
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

      <div className="relative z-10 pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header Stats Bar */}
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Progress */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Progress</p>
                  <p className="text-xl font-bold text-gray-800">{questionNumber} / {totalQuestions}</p>
                </div>
              </div>

              {/* Time Elapsed */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-700 rounded-xl flex items-center justify-center">
                  <Timer className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Time Elapsed</p>
                  <p className="text-xl font-bold text-gray-800">{formatTime(timeElapsed)}</p>
                </div>
              </div>

              {/* Topic & Difficulty */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center">
                  {getDifficultyIcon(currentQuestion.difficulty)}
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Topic</p>
                  <p className="text-lg font-bold text-gray-800 truncate">{currentQuestion.topic}</p>
                </div>
              </div>

              {/* Quiz Type */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-700 rounded-xl flex items-center justify-center">
                  {getQuizTypeIcon()}
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Mode</p>
                  <p className="text-lg font-bold text-gray-800 capitalize">{quizType}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Quiz Card */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Progress Bar */}
            <div className="relative h-2 bg-gray-200">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 transition-all duration-700 ease-out"
                style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
              />
              <div className="absolute top-0 right-0 w-4 h-2 bg-gradient-to-l from-white/50 to-transparent" />
            </div>

            {/* Question Header */}
            <div className="p-8 pb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-white font-bold">
                    {questionNumber}
                  </div>
                  <div>
                    <h1 className="text-sm font-medium text-gray-600">Question {questionNumber} of {totalQuestions}</h1>
                    <p className="text-xs text-gray-500">Keep going! You're doing great 🚀</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className={`inline-flex items-center px-3 py-2 rounded-xl text-sm font-semibold border ${getDifficultyColor(currentQuestion.difficulty)}`}>
                    {getDifficultyIcon(currentQuestion.difficulty)}
                    <span className="ml-2 capitalize">{currentQuestion.difficulty}</span>
                  </div>
                  <div className="inline-flex items-center px-3 py-2 rounded-xl text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                    {getQuizTypeIcon()}
                    <span className="ml-2 capitalize">{quizType}</span>
                  </div>
                </div>
              </div>

              {/* Question Text */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-800 leading-relaxed mb-2">
                      {currentQuestion.text}
                    </h2>
                    <p className="text-sm text-gray-600 flex items-center">
                      <Lightbulb className="w-4 h-4 mr-1" />
                      Take your time to think through your answer carefully
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Answer Section */}
            <div className="px-8 pb-8">
              <div className="mb-6">
                <label htmlFor="answer" className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  Your Answer:
                </label>
                <div className="relative">
                  <textarea
                    id="answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="w-full p-6 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-lg resize-none bg-white/80 backdrop-blur-sm"
                    rows="5"
                    placeholder="Type your thoughtful answer here... Express your understanding clearly and in detail."
                    disabled={isSubmitting}
                  />
                  <div className="absolute bottom-4 right-4 text-sm text-gray-400">
                    {answer.length} characters
                  </div>
                </div>
              </div>

              {/* Feedback Section */}
              {feedback && (
                <div className={`relative mb-6 rounded-2xl border-2 overflow-hidden backdrop-blur-sm ${
                  feedback.isCorrect 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                    : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
                }`}>
                  {/* Close button */}
                  <button 
                    onClick={handleDismissFeedback}
                    className="absolute top-4 right-4 p-2 hover:bg-white/50 rounded-full transition-colors z-10"
                    aria-label="Close feedback"
                  >
                    <X className="w-5 h-5 text-gray-500 hover:text-gray-800" />
                  </button>
                  
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        feedback.isCorrect ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {feedback.isCorrect ? 
                          <CheckCircle className="w-6 h-6 text-white" /> : 
                          <XCircle className="w-6 h-6 text-white" />
                        }
                      </div>
                      <div>
                        <h3 className={`text-xl font-bold ${
                          feedback.isCorrect ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {feedback.isCorrect ? '🎉 Correct!' : '😔 Incorrect'}
                        </h3>
                        <p className={`text-sm ${
                          feedback.isCorrect ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {feedback.isCorrect ? 'You nailed it!' : 'Let\'s learn from this'}
                        </p>
                      </div>
                    </div>

                    {/* Confidence Score */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700 flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          Confidence Score
                        </span>
                        <span className="text-lg font-bold text-gray-800">{Math.round(feedback.confidence)}%</span>
                      </div>
                      <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            feedback.confidence >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 
                            feedback.confidence >= 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 
                            'bg-gradient-to-r from-red-500 to-pink-500'
                          }`}
                          style={{ width: `${feedback.confidence}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Feedback Message */}
                    <div className="bg-white/60 rounded-xl p-4 mb-4 border border-white/40">
                      <p className="text-gray-800 leading-relaxed">{feedback.message}</p>
                    </div>

                    {/* Incorrect Answer Details */}
                    {!feedback.isCorrect && (
                      <div className="space-y-4">
                        <div className="bg-white/60 rounded-xl p-4 border border-white/40">
                          <div className="flex items-center mb-2">
                            <Trophy className="w-5 h-5 text-green-600 mr-2" />
                            <span className="font-semibold text-gray-800">Correct Answer:</span>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-gray-800">
                            {feedback.correctAnswer}
                          </div>
                        </div>

                        {feedback.improvements?.length > 0 && (
                          <div className="bg-white/60 rounded-xl p-4 border border-white/40">
                            <div className="flex items-center mb-3">
                              <Lightbulb className="w-5 h-5 text-blue-600 mr-2" />
                              <span className="font-semibold text-gray-800">Tips for Improvement:</span>
                            </div>
                            <ul className="space-y-2">
                              {feedback.improvements.map((item, index) => (
                                <li key={index} className="flex items-start space-x-2">
                                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                                  </div>
                                  <span className="text-gray-700">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmitAnswer}
                disabled={isSubmitting || !answer.trim()}
                className={`group w-full py-4 px-8 rounded-2xl font-bold text-lg shadow-xl transition-all duration-300 transform relative overflow-hidden ${
                  isSubmitting || !answer.trim()
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white hover:scale-105 hover:shadow-2xl'
                }`}
              >
                {/* Button background effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                <div className="relative flex items-center justify-center space-x-3">
                  {isSubmitting ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Analyzing Your Answer...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-6 h-6 group-hover:animate-pulse" />
                      <span>Submit Answer</span>
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>

              {!answer.trim() && (
                <p className="text-center mt-3 text-sm text-gray-500 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Please enter your answer to continue
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizScreen;