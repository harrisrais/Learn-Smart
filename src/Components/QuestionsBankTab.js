import React, { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowLeft, 
  Filter, 
  Search,
  BookOpen,
  Target,
  CheckCircle,
  XCircle,
  Save,
  X,
  AlertTriangle,
  FileText,
  BarChart3,
  Layers
} from 'lucide-react';

const QuestionsBankTab = () => {
  const [user] = useAuthState(auth);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('questions');
  const [searchTerm, setSearchTerm] = useState('');
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
  
  // State for dialog positioning
  const [dialogPosition, setDialogPosition] = useState({ top: 0, left: 0, width: 400, height: 400 });
  const dialogRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Function to get centered dialog position
  const getCenteredDialogPosition = () => {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Get current scroll position
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    
    // Dialog dimensions
    const dialogWidth = Math.min(800, viewportWidth * 0.95);
    const dialogHeight = Math.min(600, viewportHeight * 0.85);
    
    // Center the dialog in the current viewport
    const left = scrollX + (viewportWidth - dialogWidth) / 2;
    const top = scrollY + (viewportHeight - dialogHeight) / 2;
    
    return { top, left, width: dialogWidth, height: dialogHeight };
  };

  // Difficulty color mapping
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Filter questions based on search term
  const filteredQuestions = questions.filter(question =>
    question.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.correctAnswer.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setError(null);

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
        setNewQuestion({
          topic: '',
          difficulty: 'Easy',
          question: '',
          correct_answer: '',
          incorrect_answers: ['', '']
        });
        setActiveTab('questions');

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

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    setError(null);

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

  // Handle edit button click with centered positioning
  const handleEditClick = (event, question) => {
    const position = getCenteredDialogPosition();
    setDialogPosition(position);
    setEditingQuestion({
      id: question.id,
      topic: question.topic,
      difficulty: question.difficulty,
      question: question.text,
      correctAnswer: question.correctAnswer,
      incorrectAnswer1: question.incorrectAnswers[0],
      incorrectAnswer2: question.incorrectAnswers[1] || ""
    });
  };

  // Handle delete button click with centered positioning
  const handleDeleteClick = (event, questionId) => {
    const position = getCenteredDialogPosition();
    setDialogPosition(position);
    setQuestionToDelete(questionId);
    setDeleteConfirmOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Questions Bank</h1>
                <p className="text-gray-600 mt-1">Manage your quiz questions with ease</p>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="flex space-x-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Total Questions</p>
                    <p className="text-2xl font-bold text-gray-900">{totalQuestions}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center space-x-2">
                  <Layers className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Topics</p>
                    <p className="text-2xl font-bold text-gray-900">{topics.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Topic Filter */}
              <div>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                >
                  <option value="">All Topics</option>
                  {topics.map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
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
          </div>
        </div>

        {/* Add Question Button */}
        <div className="mb-6 flex justify-end">
          <button
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            onClick={() => setActiveTab('add-question')}
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">Add New Question</span>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Main Content */}
        {activeTab === 'questions' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-4 text-gray-600">Loading questions...</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No questions found matching your criteria</p>
                <p className="text-gray-400 mt-2">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct Answer</th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredQuestions.map((question) => (
                      <tr key={question.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Target className="h-4 w-4 text-blue-500 mr-2" />
                            <span className="text-sm font-medium text-gray-900">{question.topic}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(question.difficulty)}`}>
                            {question.difficulty}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-md">
                          <p className="text-sm text-gray-900 line-clamp-3">{question.text}</p>
                        </td>
                        <td className="px-6 py-4 max-w-sm">
                          <div className="flex items-start">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-900 line-clamp-2">{question.correctAnswer}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-3">
                            <button
                              className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                              onClick={(e) => handleEditClick(e, question)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                              onClick={(e) => handleDeleteClick(e, question.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Add Question Form */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="mb-6 flex items-center">
              <button
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors mr-4"
                onClick={() => setActiveTab('questions')}
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Questions</span>
              </button>
              <h3 className="text-2xl font-bold text-gray-900">Add New Question</h3>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <Target className="h-4 w-4" />
                    <span>Topic</span>
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
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
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Difficulty Level</span>
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
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
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <FileText className="h-4 w-4" />
                  <span>Question</span>
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  rows={4}
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                  placeholder="Enter the question text here..."
                  required
                />
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Correct Answer</span>
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                  rows={3}
                  value={newQuestion.correct_answer}
                  onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                  placeholder="Enter the correct answer..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>Incorrect Answer 1</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
                    rows={3}
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
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>Incorrect Answer 2</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
                    rows={3}
                    value={newQuestion.incorrect_answers[1]}
                    onChange={(e) => setNewQuestion({
                      ...newQuestion,
                      incorrect_answers: [newQuestion.incorrect_answers[0], e.target.value]
                    })}
                    placeholder="Enter second incorrect answer..."
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Question</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Question Modal */}
        {editingQuestion && (
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
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-bold text-gray-900">Edit Question</h3>
                <button
                  onClick={() => setEditingQuestion(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Scrollable Content */}
              <div className="overflow-y-auto p-4" style={{ maxHeight: `${dialogPosition.height - 100}px` }}>
                <form onSubmit={handleUpdateQuestion} className="space-y-4">
                  {/* Topic and Difficulty */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                        <Target className="h-4 w-4" />
                        <span>Topic</span>
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white text-sm"
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
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                        <BarChart3 className="h-4 w-4" />
                        <span>Difficulty Level</span>
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white text-sm"
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

                  {/* Question Text */}
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <FileText className="h-4 w-4" />
                      <span>Question</span>
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-sm"
                      rows={3}
                      value={editingQuestion.question}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                      placeholder="Enter the question text here..."
                      required
                    />
                  </div>

                  {/* Correct Answer */}
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Correct Answer</span>
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none text-sm"
                      rows={2}
                      value={editingQuestion.correctAnswer}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, correctAnswer: e.target.value })}
                      placeholder="Enter the correct answer..."
                      required
                    />
                  </div>

                  {/* Incorrect Answers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span>Incorrect Answer 1</span>
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none text-sm"
                        value={editingQuestion.incorrectAnswer1}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, incorrectAnswer1: e.target.value })}
                        rows={2}
                        placeholder="Enter first incorrect answer..."
                        required
                      />
                    </div>
                    <div>
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span>Incorrect Answer 2</span>
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none text-sm"
                        value={editingQuestion.incorrectAnswer2}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, incorrectAnswer2: e.target.value })}
                        rows={2}
                        placeholder="Enter second incorrect answer..."
                      />
                    </div>
                  </div>
                </form>
              </div>
              
              {/* Footer */}
              <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                  onClick={() => setEditingQuestion(null)}
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
                  onClick={handleUpdateQuestion}
                >
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
            <div 
              className="absolute bg-white rounded-xl shadow-2xl"
              style={{
                top: `${dialogPosition.top}px`,
                left: `${dialogPosition.left}px`,
                width: '350px',
                maxWidth: '90vw'
              }}
            >
              <div className="p-6">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Deletion</h3>
                  <p className="text-gray-600 mb-6 text-sm">Are you sure you want to delete this question? This action cannot be undone.</p>
                  
                  <div className="flex justify-center space-x-3">
                    <button
                      type="button"
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                      onClick={handleDeleteCancel}
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
                      onClick={handleDeleteConfirm}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionsBankTab;