// src/Components/QuizScreen.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { doc, collection, addDoc, updateDoc, increment, arrayUnion, getDoc } from 'firebase/firestore';

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
  
      // Remove the examQuiz updates and combined correct/incorrect updates
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
        isCorrect: data.is_correct === true, // Ensure boolean conversion
        message: data.feedback || "",
        correctAnswer: data.correct_answer || "",
        improvements: data.improvements || [],
        confidence: data.confidence || 0
      });
  
      if (user) {
        await recordAttemptInFirestore(
          user.uid,
          currentQuestion,
          data.is_correct === true, // Ensure boolean conversion
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
  
  // New function to dismiss feedback
  const handleDismissFeedback = () => {
    setFeedback(null);
  };

  if (!currentQuestion) {
    return (
      <div className="text-center py-10">
        <svg
          className="animate-spin -ml-1 mr-3 h-10 w-10 text-blue-600 mx-auto"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p className="mt-2 text-gray-600">Loading question...</p>
      </div>
    );
  }

  return (
    <>
      <div className="font-sans max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              Question {questionNumber} of {totalQuestions}
            </span>
            <span className="text-sm font-medium px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
              {currentQuestion.difficulty} • {currentQuestion.topic} • {quizType === 'exam' ? 'Exam' : 'Topic Quiz'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">{currentQuestion.text}</h2>

          <div className="mb-4">
            <label htmlFor="answer" className="block text-sm font-medium mb-1">
              Your Answer:
            </label>
            <textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              rows="4"
              placeholder="Type your answer here..."
              disabled={isSubmitting}
            ></textarea>
          </div>

          {feedback && (
            <div className={`p-4 mb-4 rounded-lg relative ${feedback.isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
              {/* Close button */}
              <button 
                onClick={handleDismissFeedback}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                aria-label="Close feedback"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              <div className="font-semibold mb-2">
                {feedback.isCorrect ? '✓ Correct!' : '✗ Needs Improvement'}
              </div>
              
              {/* Confidence score display */}
              <div className="mb-2 flex items-center">
                <span className="text-sm font-medium mr-2">Confidence Score:</span>
                <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${
                      feedback.confidence >= 80 ? 'bg-green-600' : 
                      feedback.confidence >= 60 ? 'bg-yellow-400' : 'bg-red-500'
                    }`}
                    style={{ width: `${feedback.confidence}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-sm font-medium">{Math.round(feedback.confidence)}%</span>
              </div>
              
              <p className="mb-2">{feedback.message}</p>

              {!feedback.isCorrect && (
                <div className="mt-3">
                  <div className="font-semibold text-sm mb-1">Correct Answer:</div>
                  <div className="bg-gray-100 p-2 rounded">{feedback.correctAnswer}</div>

                  <div className="mt-2 font-semibold text-sm mb-1">Improvement Areas:</div>
                  <ul className="list-disc pl-4">
                    {feedback.improvements?.map((item, index) => (
                      <li key={index} className="text-sm">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleSubmitAnswer}
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>
      </div>
    </>
  );
}

export default QuizScreen;