import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

const QuestionsBankTab = () => {
  const [user] = useAuthState(auth);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('questions');
  const [newQuestion, setNewQuestion] = useState({
    topic: '',
    difficulty: 'Easy',
    question: '',
    correct_answer: '',
    incorrect_answers: ['', '']
  });
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedTopic && selectedTopic !== 'all') queryParams.append('topic', selectedTopic);
        if (selectedDifficulty) queryParams.append('difficulty', selectedDifficulty);

        const response = await fetch(`${API_BASE_URL}/api/questions?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${await user.getIdToken()}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setQuestions(data.questions || []);
          setTotalQuestions(data.total || 0);
        }
      } catch (err) {
        setError("Failed to load questions");
      } finally {
        setLoading(false);
      }
    };

    const fetchTopics = async () => {
      try {
        // In fetchTopics
        const response = await fetch(`${API_BASE_URL}/api/topics`, {
          headers: {
            'Authorization': `Bearer ${await user.getIdToken()}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setTopics(data.topics || []);
        }
      } catch (err) {
        console.error("Error fetching topics:", err);
      }
    };

    if (user) {
      fetchQuestions();
      fetchTopics();
    }
  }, [user, selectedTopic, selectedDifficulty]);

  // Fix 1: Update handleAddQuestion function
  const handleAddQuestion = async (e) => {
    e.preventDefault();

    // Form validation
    if (!newQuestion.topic || !newQuestion.question ||
      !newQuestion.correct_answer || !newQuestion.incorrect_answers[0]) {
      setError("Please fill all required fields");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          topic: newQuestion.topic,
          difficulty: newQuestion.difficulty,
          text: newQuestion.question,
          correctAnswer: newQuestion.correct_answer,
          incorrectAnswers: newQuestion.incorrect_answers
        })
      });

      if (response.ok) {
        // Reset form
        setNewQuestion({
          topic: '',
          difficulty: 'Easy',
          question: '',
          correct_answer: '',
          incorrect_answers: ['', '']
        });
        setActiveTab('questions');

        // Refetch questions
        const queryParams = new URLSearchParams();
        if (selectedTopic) queryParams.append('topic', selectedTopic);
        if (selectedDifficulty) queryParams.append('difficulty', selectedDifficulty);

        const questionsResponse = await fetch(`${API_BASE_URL}/api/questions?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${await user.getIdToken()}`
          }
        });

        if (questionsResponse.ok) {
          const data = await questionsResponse.json();
          setQuestions(data.questions || []);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add question');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Fix 2: Update handleUpdateQuestion function
  const handleUpdateQuestion = async (e) => {
    e.preventDefault();

    if (!editingQuestion?.id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          topic: editingQuestion.topic,
          difficulty: editingQuestion.difficulty,
          text: editingQuestion.question,
          correctAnswer: editingQuestion.correctAnswer,
          incorrectAnswers: [
            editingQuestion.incorrectAnswer1,
            editingQuestion.incorrectAnswer2 || ""
          ]
        })
      });

      if (response.ok) {
        setEditingQuestion(null);
        // Refetch questions
        const queryParams = new URLSearchParams();
        if (selectedTopic) queryParams.append('topic', selectedTopic);
        if (selectedDifficulty) queryParams.append('difficulty', selectedDifficulty);

        const questionsResponse = await fetch(`${API_BASE_URL}/api/questions?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${await user.getIdToken()}`
          }
        });

        if (questionsResponse.ok) {
          const data = await questionsResponse.json();
          setQuestions(data.questions || []);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update question');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Fix 3: Update handleDeleteConfirm function
  const handleDeleteConfirm = async () => {
    if (!questionToDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/questions/${questionToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });

      if (response.ok) {
        // Remove from local state
        setQuestions(questions.filter(q => q.id !== questionToDelete));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete question');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteConfirmOpen(false);
      setQuestionToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setQuestionToDelete(null);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="w-full md:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Topic</label>
          <select
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
          >
            <option value="">All Topics</option>
            {topics.map(topic => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Difficulty</label>
          <select
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
          >
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      <div className="mb-4 flex justify-between items-center">
        <h3 className="font-medium text-lg">Question Bank</h3>
        <button
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          onClick={() => setActiveTab('add-question')}
        >
          Add New Question
        </button>
      </div>

      {activeTab === 'questions' ? (
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-8">Loading questions...</div>
          ) : (
            questions.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No questions found matching your criteria</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct Answer</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {questions.map((question) => (
                    <tr key={question.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{question.topic}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${question.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                          question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                          {question.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{question.text}</td>
                      <td className="px-6 py-4 text-sm">{question.correctAnswer}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          onClick={() => setEditingQuestion({
                            id: question.id,
                            topic: question.topic,
                            difficulty: question.difficulty,
                            question: question.text,
                            correctAnswer: question.correctAnswer,
                            incorrectAnswer1: question.incorrectAnswers[0],
                            incorrectAnswer2: question.incorrectAnswers[1] || ""
                          })}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => {
                            setQuestionToDelete(question.id);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4 flex items-center">
            <button
              className="mr-2 text-blue-600 hover:text-blue-800"
              onClick={() => setActiveTab('questions')}
            >
              ← Back to Questions
            </button>
            <h3 className="font-medium text-lg">Add New Question</h3>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleAddQuestion} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newQuestion.topic}
                  onChange={(e) => setNewQuestion({ ...newQuestion, topic: e.target.value })}
                  required
                >
                  <option value="">Select Topic</option>
                  {topics.map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newQuestion.difficulty}
                  onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                  required
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={newQuestion.question}
                onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                placeholder="Enter the question text here..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                value={newQuestion.correct_answer}
                onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                placeholder="Enter the correct answer..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Incorrect Answer 1</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                value={newQuestion.incorrect_answers[0]}
                onChange={(e) => setNewQuestion({
                  ...newQuestion,
                  incorrect_answers: [e.target.value, newQuestion.incorrect_answers[1]]
                })}
                placeholder="Enter first incorrect answer..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Incorrect Answer 2</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                value={newQuestion.incorrect_answers[1]}
                onChange={(e) => setNewQuestion({
                  ...newQuestion,
                  incorrect_answers: [newQuestion.incorrect_answers[0], e.target.value]
                })}
                placeholder="Enter second incorrect answer..."
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                Add Question
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-medium mb-4">Edit Question</h3>
            <form onSubmit={handleUpdateQuestion}>
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={editingQuestion.topic}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, topic: e.target.value })}
                    required
                  >
                    <option value="">Select Topic</option>
                    {topics.map(topic => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={editingQuestion.difficulty}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })}
                    required
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                  rows={3}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={editingQuestion.correctAnswer}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, correctAnswer: e.target.value })}
                  rows={2}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Incorrect Answer1</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={editingQuestion.incorrectAnswer1}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, incorrectAnswer1: e.target.value })}
                  rows={2}
                  required
                />
              </div>'
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Incorrect Answer2</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={editingQuestion.incorrectAnswer2}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, incorrectAnswer2: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                  onClick={() => setEditingQuestion(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this question? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                onClick={handleDeleteCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                onClick={handleDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionsBankTab;