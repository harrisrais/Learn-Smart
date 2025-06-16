from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import random
import pandas as pd
from sentence_transformers import SentenceTransformer, util
import os
import datetime
import google.generativeai as genai
import uuid
import numpy as np
from collections import defaultdict

# app.py (add these imports at the top)
from functools import wraps
from flask import g, jsonify, request
import firebase_admin
from firebase_admin import auth, firestore, credentials

# Initialize Firebase before creating the Flask app
cred = credentials.Certificate('learn-smart-5bc4b-firebase-adminsdk-fbsvc-adcaaae4ef.json')
firebase_admin.initialize_app(cred)

# Initialize Firestore
db = firestore.client()

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 3600
    }
})

class StudentAnswerEvaluator:
    def __init__(self, model_path, dataset_path):
        try:
            if os.path.exists(model_path):
                self.model = SentenceTransformer(model_path)
                print("Trained model loaded successfully")
            else:
                self.model = SentenceTransformer('all-MiniLM-L6-v2')
                print("Using default SentenceTransformer model")
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            
        try:
            self.df = pd.read_excel(dataset_path)
        except Exception as e:
            raise ValueError(f"Could not load dataset: {str(e)}")

        # Track all questions that have been attempted at each difficulty level
        self.attempted_questions = {
            'Easy': set(),
            'Medium': set(),
            'Hard': set()
        }

        # Track questions that were failed at each difficulty level
        self.failed_questions = {
            'Easy': set(),
            'Medium': set(),
            'Hard': set()
        }

        # Track failed questions that have been reasked
        self.reasked_questions = {
            'Easy': set(),
            'Medium': set(),
            'Hard': set()
        }

        # Track when a level has been reset (student went up and came back down)
        self.level_reset = {
            'Easy': False,
            'Medium': False,
            'Hard': False
        }

        self.points_map = {'Easy': 1, 'Medium': 2, 'Hard': 3}
        self.topic_performance = {}
        self.exam_performance = {
            'total_questions': 0,
            'correct_answers': 0,
            'questions_asked': [],
            'by_difficulty': {
                'Easy': {'correct': 0, 'total': 0, 'weight': 20},
                'Medium': {'correct': 0, 'total': 0, 'weight': 30},
                'Hard': {'correct': 0, 'total': 0, 'weight': 50}
            }
        }

        # Track the current and previous level for each topic
        self.current_topic_levels = {}
        self.previous_topic_levels = {}
        
        # Store quiz state
        self.current_question = None
        self.current_topic = None
        self.exam_mode = False
        self.quiz_questions = []
        self.current_quiz_index = 0
        self.level_question_count = {'Easy': 3, 'Medium': 3, 'Hard': 3}
        self.level_questions_asked = 0
        self.level_questions_correct = 0
        # Initialize RL-based level manager
        self.level_manager = RLLevelManager()

    def update_difficulty_level(self, topic, new_difficulty):
        """
        Track when a student changes difficulty levels to determine if they're dropping back
        to a previous level after going up.
        """
        difficulty_ranks = {'Easy': 0, 'Medium': 1, 'Hard': 2}

        # Store the previous level before updating
        self.previous_topic_levels[topic] = self.current_topic_levels[topic]

        # Check if student is dropping back to a lower level
        if (self.previous_topic_levels[topic] is not None and
            difficulty_ranks[new_difficulty] < difficulty_ranks[self.current_topic_levels[topic]]):
            # Mark this level as reset so failed questions can be asked again
            self.level_reset[new_difficulty] = True

        # Update the current level
        self.current_topic_levels[topic] = new_difficulty
        
        # Reset the level question counters
        self.level_questions_asked = 0
        self.level_questions_correct = 0

    def select_random_question(self, topic=None, difficulty=None):
        """
        Select a question with the following priority:
        1. If the student moved back down to this level after being at a higher level,
          prioritize previously failed questions that haven't been reasked yet
        2. Otherwise, select a question that hasn't been attempted yet
        """
        # Create base filter conditions
        filtered_df = self.df.copy()
        if topic is not None:
            filtered_df = filtered_df[filtered_df['Topic'] == topic]
        if difficulty is not None:
            filtered_df = filtered_df[filtered_df['Difficulty Level'] == difficulty]

        # Get all possible questions for this filter
        all_possible_questions = set(filtered_df.index)
        if not all_possible_questions:
            return None, None, False

        # If this level has been reset (student went up and came back down)
        # AND there are failed questions available that haven't been reasked yet
        if self.level_reset[difficulty]:
            # Questions that have been failed but not yet reasked
            not_yet_reasked = self.failed_questions[difficulty] - self.reasked_questions[difficulty]
            available_failed_questions = list(not_yet_reasked.intersection(all_possible_questions))

            if available_failed_questions:
                question_idx = random.choice(available_failed_questions)
                # Mark as reasked, but keep in failed_questions in case student fails again
                self.reasked_questions[difficulty].add(question_idx)
                return question_idx, filtered_df.loc[question_idx]['Anchor'], True  # True indicates this is a retry

        # Find questions that haven't been attempted yet at this difficulty level
        available_questions = list(all_possible_questions - self.attempted_questions[difficulty])

        # If no new questions available, allow repeats by selecting from all possible questions
        if not available_questions:
            available_questions = list(all_possible_questions)

        # Choose a question randomly from the available ones
        question_idx = random.choice(available_questions)

        # Mark this question as attempted for this difficulty level
        self.attempted_questions[difficulty].add(question_idx)

        return question_idx, filtered_df.loc[question_idx]['Anchor'], False

    def feedback_with_gemini(self, question, student_answer, correct_answer, incorrect_answer):
        """Feedback using Gemini"""
        try:
            prompt = f"""Act as a tutoring assistant. Analyze this response:
            Question: {question}
            Correct Answer: {correct_answer}
            Common Mistake: {incorrect_answer}
            Student Answer: {student_answer}

            Provide:
            1. Correctness (True/False)
            2. Confidence Score (0-100)
            3. Brief Feedback
            4. Key Improvement Areas

            Use this format:
            Correct: [True/False]
            Score: [number]
            Feedback: [2-3 sentence explanation]
            Improvements: [comma-separated key areas]"""

            response = gemini_model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Parse the response
            result = {
                'correct': False,
                'score': 0,
                'feedback': 'No feedback generated',
                'improvements': [],
                'correct_answer': correct_answer
            }

            # Parse each line
            for line in response_text.split('\n'):
                if 'Correct:' in line:
                    result['correct'] = 'true' in line.lower()
                elif 'Score:' in line:
                    result['score'] = float(line.split(':')[1].strip())
                elif 'Feedback:' in line:
                    result['feedback'] = line.split(':', 1)[1].strip()
                elif 'Improvements:' in line:
                    result['improvements'] = [i.strip() for i in line.split(':', 1)[1].split(',')]

            return result
            
        except Exception as e:
            print(f"Gemini evaluation failed: {str(e)}")
            # Fallback to similarity score
            student_embed = self.model.encode(student_answer)
            correct_embed = self.model.encode(correct_answer)
            correct_sim = util.pytorch_cos_sim(student_embed, correct_embed)[0][0].item()
            return {
                'correct': correct_sim >= 0.6,
                'score': correct_sim * 100,
                'feedback': 'Automatic evaluation: ' + ('Correct' if correct_sim >= 0.6 else 'In c'),
                'improvements': ['Ensure answer matches key concepts'],
                'correct_answer': correct_answer
            }
    
    def evaluate_answer(self, question_idx, student_answer, is_retry=False, threshold=60, is_exam=False):
        """Updated evaluation method returning full feedback"""
        if question_idx not in self.df.index:
            return {'error': 'Invalid question'}

        row = self.df.loc[question_idx]
        correct_answer = str(row['Positive'])
        incorrect_answer = str(row['Negative']).lower().strip()
        question_text = row['Anchor']
        difficulty = row['Difficulty Level']
        topic = row['Topic']
        student_answer_processed = student_answer.lower().strip()

        # Always use Gemini evaluation
        evaluation = self.feedback_with_gemini(
            question_text,
            student_answer_processed,
            correct_answer,
            str(row['Negative'])
        )

        # Log feedback for both correct and incorrect answers
        print(f"\n--- Question: {question_text} ---")
        print(f"Student Answer: {student_answer}")
        print(f"Evaluation: {'CORRECT' if evaluation['correct'] else 'INCORRECT'}")
        print(f"Score: {evaluation['score']:.1f}%")
        print(f"Feedback: {evaluation['feedback']}")
        if not evaluation['correct']:
            print(f"Correct Answer: {correct_answer}")
            if 'improvements' in evaluation:
                print(f"Improvement Areas: {', '.join(evaluation['improvements'])}")
        print("---\n")

        passed = evaluation['correct']
        confidence = evaluation['score']
        feedback = evaluation['feedback']
        improvements = evaluation.get('improvements', [])

        # Update performance stats based on the quiz type
        points = self.points_map.get(difficulty, 1)

        if is_exam:
            # Update exam performance
            self.exam_performance['total_questions'] += 1
            self.exam_performance['by_difficulty'][difficulty]['total'] += 1

            if passed:
                self.exam_performance['correct_answers'] += 1
                self.exam_performance['by_difficulty'][difficulty]['correct'] += 1
        else:
            # Initialize topic performance if needed
            if topic not in self.topic_performance:
                self.topic_performance[topic] = {
                    'correct': 0,
                    'incorrect': 0,
                    'points_earned': 0,
                    'points_possible': 0,
                    'topic_quiz': {'correct': 0, 'incorrect': 0},
                    'exam_quiz': {'correct': 0, 'incorrect': 0}
                }

            # Update level tracking counts for topic quizzes
            self.level_questions_asked += 1
            if passed:
                self.level_questions_correct += 1

            # Only increment points_possible for first-time questions or retries that are answered correctly
            if not is_retry or passed:
                self.topic_performance[topic]['points_possible'] += points

            if passed:
                self.topic_performance[topic]['points_earned'] += points
                self.topic_performance[topic]['correct'] += 1
                self.topic_performance[topic]['topic_quiz']['correct'] += 1

                # If this was a retry and they got it right, remove from failed questions
                if is_retry and question_idx in self.failed_questions[difficulty]:
                    self.failed_questions[difficulty].remove(question_idx)
            else:
                # Only increment incorrect count for new questions
                if not is_retry:
                    self.topic_performance[topic]['incorrect'] += 1
                    self.topic_performance[topic]['topic_quiz']['incorrect'] += 1

                # Add to failed questions if not passed
                if not is_retry:
                    self.failed_questions[difficulty].add(question_idx)

        return {
            'is_correct': passed,
            'confidence': confidence,
            'feedback': feedback,
            'correct_answer': correct_answer,
            'improvements': improvements
        }

    def calculate_exam_score(self):
        """Calculate the exam score on a 100-point scale with weighted difficulty levels"""
        score = 0

        # Calculate score for each difficulty level based on its weight
        for difficulty, data in self.exam_performance['by_difficulty'].items():
            if data['total'] > 0:
                # Calculate percentage correct for this difficulty level
                difficulty_score = (data['correct'] / data['total']) * data['weight']
                score += difficulty_score

        return score

    def init_comprehensive_exam(self, selected_topics=None):
        """Initialize exam state with proper question selection"""
        self.exam_mode = True
        self.quiz_questions = []
        self.current_quiz_index = 0
        
        # Clear previous exam data
        self.exam_performance = {
            'total_questions': 0,
            'correct_answers': 0,
            'questions_asked': [],
            'by_difficulty': {
                'Easy': {'correct': 0, 'total': 0, 'weight': 20},
                'Medium': {'correct': 0, 'total': 0, 'weight': 30},
                'Hard': {'correct': 0, 'total': 0, 'weight': 50}
            }
        }

        # Prepare exam questions
        target_counts = {'Easy': 3, 'Medium': 3, 'Hard': 4}
        
        for diff, count in target_counts.items():
            filtered = self.df[self.df['Difficulty Level'] == diff]
            if selected_topics:
                filtered = filtered[filtered['Topic'].isin(selected_topics)]
            
            if not filtered.empty:
                # Get available questions (allow repeats if needed)
                available_questions = filtered.index.tolist()
                selected = random.choices(available_questions, k=count)
                
                for idx in selected:
                    question = filtered.loc[idx]
                    self.quiz_questions.append({
                        'id': idx,
                        'text': question['Anchor'],
                        'topic': question['Topic'],
                        'difficulty': diff
                    })

        random.shuffle(self.quiz_questions)  # Shuffle all questions
        return len(self.quiz_questions)

    # Updated init_topic_quiz method in StudentAnswerEvaluator class
    def init_topic_quiz(self, topic, user_id):
        """Initialize quiz with user's saved progress"""
        try:
            # First load RL model state if available
            self.load_rl_model_state(user_id)
            
            # Fetch user's current level from Firestore
            if user_id and user_id != "default_user":
                user_ref = db.collection('users').document(user_id)
                user_doc = user_ref.get()
                
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    topic_data = user_data.get('topicsMastery', {}).get(topic, {})
                    current_level = topic_data.get('currentLevel', 'Easy')
                    print(f"Loaded user level for {topic}: {current_level}")
                else:
                    current_level = 'Easy'
                    print(f"User document not found. Using default level: {current_level}")
            else:
                current_level = 'Easy'
                print(f"No valid user ID. Using default level: {current_level}")

            # Set the current level
            self.current_topic_levels[topic] = current_level
            self.previous_topic_levels[topic] = None
        
            # Reset tracking variables for the new quiz
            self.level_questions_asked = 0
            self.level_questions_correct = 0
        
            # Generate questions for the current difficulty level
            num_questions = self.prepare_level_questions(topic, self.current_topic_levels[topic])
            
            # If no questions available for the topic at the current level, try other levels
            if num_questions == 0:
                print(f"No questions found for topic '{topic}' at level '{current_level}'. Trying other levels.")
                fallback_levels = ['Easy', 'Medium', 'Hard']
                for level in fallback_levels:
                    if level != current_level:
                        num_questions = self.prepare_level_questions(topic, level)
                        if num_questions > 0:
                            self.current_topic_levels[topic] = level
                            print(f"Using fallback level '{level}' for topic '{topic}'")
                            break
                
                # If still no questions, return 0
                if num_questions == 0:
                    print(f"No questions available for topic '{topic}' at any difficulty level")
                    return 0
                    
            return num_questions
        except Exception as e:
            print(f"Error initializing quiz: {str(e)}")
            # Fallback to Easy level if there's an error
            self.current_topic_levels[topic] = 'Easy'
            self.previous_topic_levels[topic] = None
            return self.prepare_level_questions(topic, 'Easy')
    
    def prepare_level_questions(self, topic, difficulty):
        """Prepare a set of questions for the current topic and difficulty level"""
        self.quiz_questions = []
        self.current_quiz_index = 0
        
        # Reset level question counters since we're starting a new set
        self.level_questions_asked = 0
        self.level_questions_correct = 0
        
        # Track if we've tried to reask any previously failed questions
        retry_added = False
        
        # If this level has been reset, try to find failed questions to retry first
        if self.level_reset[difficulty]:
            not_yet_reasked = self.failed_questions[difficulty] - self.reasked_questions[difficulty]
            
            # Get failed questions for this topic and difficulty
            filtered_df = self.df[
                (self.df.index.isin(not_yet_reasked)) & 
                (self.df['Topic'] == topic) & 
                (self.df['Difficulty Level'] == difficulty)
            ]
            
            # Add retry questions to the quiz
            for idx, row in filtered_df.iterrows():
                self.quiz_questions.append({
                    'id': idx,
                    'text': row['Anchor'],
                    'topic': topic,
                    'difficulty': difficulty,
                    'is_retry': True
                })
                self.reasked_questions[difficulty].add(idx)
                retry_added = True
                
                # We only need one retry question to start
                if len(self.quiz_questions) >= 1:
                    break
        
        # Get more questions up to the target count for this difficulty
        target_count = self.level_question_count[difficulty]
        num_needed = target_count - len(self.quiz_questions)
        
        if num_needed > 0:
            # Get questions for this topic and difficulty
            filtered_df = self.df[
                (self.df['Topic'] == topic) & 
                (self.df['Difficulty Level'] == difficulty)
            ]
            
            if filtered_df.empty:
                print(f"Warning: No questions found for topic '{topic}' with difficulty '{difficulty}'")
                return 0
                
            # Prioritize questions that haven't been attempted yet
            unasked = [idx for idx in filtered_df.index if idx not in self.attempted_questions[difficulty]]
            
            # If not enough unasked questions, allow repeats
            if len(unasked) < num_needed:
                all_available = filtered_df.index.tolist()
                # Shuffle to get random order
                random.shuffle(all_available)
                question_indices = all_available[:num_needed]
            else:
                # Shuffle unasked questions and select needed number
                random.shuffle(unasked)
                question_indices = unasked[:num_needed]
                
            # Add selected questions to quiz
            for idx in question_indices:
                if idx in filtered_df.index:
                    row = filtered_df.loc[idx]
                    self.quiz_questions.append({
                        'id': idx,
                        'text': row['Anchor'],
                        'topic': topic,
                        'difficulty': difficulty,
                        'is_retry': False
                    })
                    self.attempted_questions[difficulty].add(idx)
        
        print(f"Prepared {len(self.quiz_questions)} questions for topic '{topic}' with difficulty '{difficulty}'")
        return len(self.quiz_questions)
    
    def get_next_quiz_question(self):
        """Get the next quiz question"""
        if self.current_quiz_index < len(self.quiz_questions):
            question = self.quiz_questions[self.current_quiz_index]
            self.current_question = question
            return question
        return None
    
    def process_answer_and_advance(self, question_id, answer):
        """Process an answer and determine if we should advance to next question or level"""
        # Find the question in our quiz questions
        question_info = next((q for q in self.quiz_questions if q['id'] == question_id), None)
        if not question_info:
            return {'error': 'Question not found'}, None, False
        
        is_retry = question_info.get('is_retry', False)
        topic = question_info['topic']
        difficulty = question_info['difficulty']
        
        # Evaluate the answer
        evaluation_result = self.evaluate_answer(
            question_id, 
            answer, 
            is_retry=is_retry, 
            is_exam=self.exam_mode
        )
        
        # Extract is_correct from evaluation result
        is_correct = evaluation_result.get('is_correct', False)
        
        # Advance to next question
        self.current_quiz_index += 1
        next_question = self.get_next_quiz_question()
        
        # Check if we need to evaluate level completion
        level_complete = False
        quiz_complete = False
        new_level = None
        
        if not self.exam_mode and (next_question is None or self.level_questions_asked >= self.level_question_count[difficulty]):
            # Use RL-based level manager for decision making
            level_complete = True
            
            if difficulty == 'Hard' and self.level_questions_correct >= 3:  # 3/4 correct to complete
                quiz_complete = True
            else:
                # Get recommended level from RL model
                new_level = self.level_manager.get_recommended_level(
                    topic, 
                    difficulty, 
                    self.level_questions_correct, 
                    self.level_questions_asked
                )
                
                # Update RL model with the session results
                self.level_manager.update_from_quiz_session(
                    topic,
                    difficulty,
                    self.level_questions_correct,
                    self.level_questions_asked,
                    new_level
                )
                
                # If not quiz complete, prepare next level questions
                if not quiz_complete:
                    self.update_difficulty_level(topic, new_level)
                    self.prepare_level_questions(topic, new_level)
                    next_question = self.get_next_quiz_question()
        
        # Return the complete evaluation result along with other information
        return {
            'is_correct': is_correct,
            'evaluation': evaluation_result,  # This includes all feedback, confidence, improvements
            'level_complete': level_complete,
            'quiz_complete': quiz_complete,
            'current_level': difficulty,
            'new_level': new_level
        }, next_question, quiz_complete
        
    def save_rl_model_state(self, user_id):
        """Save RL model state to Firestore for persistence"""
        if not user_id or user_id == "default_user":
            return
        
        try:
            # Convert Q-values to a serializable format
            serialized_q_values = {}
            for (state_key, action), value in self.level_manager.q_values.items():
                # Convert tuple keys to strings
                key_str = f"{state_key[0]}:{state_key[1]}:{action}"
                serialized_q_values[key_str] = value
            
            # Convert performance history to serializable format
            serialized_history = {}
            for (topic, level), values in self.level_manager.performance_history.items():
                key_str = f"{topic}:{level}"
                serialized_history[key_str] = values
            
            # Save to Firestore
            rl_model_ref = db.collection('rl_models').document(user_id)
            rl_model_ref.set({
                'q_values': serialized_q_values,
                'performance_history': serialized_history,
                'updated_at': firestore.SERVER_TIMESTAMP
            }, merge=True)
        
        except Exception as e:
            print(f"Error saving RL model state: {str(e)}")
            
    def load_rl_model_state(self, user_id):
        """Load RL model state from Firestore"""
        if not user_id or user_id == "default_user":
            return
        
        try:
            # Get RL model data from Firestore
            rl_model_ref = db.collection('rl_models').document(user_id)
            rl_model_doc = rl_model_ref.get()
            
            if rl_model_doc.exists:
                data = rl_model_doc.to_dict()
                
                # Deserialize Q-values
                q_values = data.get('q_values', {})
                for key_str, value in q_values.items():
                    # Parse key string back to tuple components
                    topic, level, action = key_str.split(':')
                    action = int(action)  # Convert action back to int
                    
                    # Restore the Q-value
                    self.level_manager.q_values[(topic, level), action] = value
                
                # Deserialize performance history
                performance_history = data.get('performance_history', {})
                for key_str, values in performance_history.items():
                    # Parse key string back to tuple components
                    topic, level = key_str.split(':')
                    
                    # Restore the performance history
                    self.level_manager.performance_history[(topic, level)] = values
                    
                print(f"Loaded RL model state for user {user_id}")
        
        except Exception as e:
            print(f"Error loading RL model state: {str(e)}")

class RLLevelManager:
    """Reinforcement Learning-based Level Manager for adaptive difficulty adjustment"""
    def __init__(self, learning_rate=0.1, discount_factor=0.9, exploration_rate=0.2):
        # Q-values dictionary: (topic, current_level, action) -> value
        self.q_values = defaultdict(float)
        self.learning_rate = learning_rate        # Alpha: how much to update Q-values
        self.discount_factor = discount_factor    # Gamma: importance of future rewards
        self.exploration_rate = exploration_rate  # Epsilon: exploration vs exploitation
        
        # Mapping of level indices
        self.level_indices = {'Easy': 0, 'Medium': 1, 'Hard': 2}
        self.index_to_level = {0: 'Easy', 1: 'Medium', 2: 'Hard'}
        
        # Track performance history for each topic-level combination
        self.performance_history = defaultdict(list)
        
        # Define possible actions: stay, move up, move down
        self.actions = [-1, 0, 1]  # -1: move down, 0: stay, 1: move up
    
    def get_state_features(self, topic, current_level, correct_ratio, questions_asked):
        """Extract state features from the current context"""
        level_idx = self.level_indices[current_level]
        
        # Features for RL state
        features = {
            'level_idx': level_idx,
            'correct_ratio': correct_ratio,
            'questions_asked': min(questions_asked, 10) / 10.0,  
        }
        return features
    
    def select_action(self, topic, current_level, correct_ratio, questions_asked):
        """Select whether to move up, stay, or move down a level"""
        # Use epsilon-greedy policy for exploration
        if np.random.random() < self.exploration_rate:
            # Explore: choose random action
            action = np.random.choice(self.actions)
        else:
            # Exploit: choose best action based on Q-values
            state_key = (topic, current_level)
            
            # Get Q-values for all possible actions from this state
            action_values = {
                action: self.q_values[(state_key, action)] 
                for action in self.actions
            }
            
            # Filter valid actions (can't go below Easy or above Hard)
            if current_level == 'Easy':
                action_values.pop(-1, None)  # Can't go down from Easy
            elif current_level == 'Hard':
                action_values.pop(1, None)   # Can't go up from Hard
            
            # Choose action with highest Q-value
            action = max(action_values.items(), key=lambda x: x[1])[0]
        
        # Apply action to get new level
        current_idx = self.level_indices[current_level]
        new_idx = max(0, min(2, current_idx + action))  # Ensure index stays in valid range
        new_level = self.index_to_level[new_idx]
        
        return action, new_level
    
    def update_q_value(self, topic, current_level, action, reward, new_level):
        """Update Q-value using Q-learning update rule"""
        state_key = (topic, current_level)
        new_state_key = (topic, new_level)
        
        # Get max Q-value for next state
        next_q_values = [self.q_values[(new_state_key, a)] for a in self.actions]
        max_next_q = max(next_q_values) if next_q_values else 0
        
        # Q-learning update formula
        current_q = self.q_values[(state_key, action)]
        new_q = current_q + self.learning_rate * (
            reward + self.discount_factor * max_next_q - current_q
        )
        
        self.q_values[(state_key, action)] = new_q
    
    def calculate_reward(self, correct_ratio, current_level, new_level):
        """Calculate reward based on performance and level transition"""
        # Base reward from performance
        if correct_ratio >= 0.8:
            performance_reward = 1.0  # Excellent performance
        elif correct_ratio >= 0.6:
            performance_reward = 0.5  # Good performance
        elif correct_ratio >= 0.4:
            performance_reward = 0.0  # Average performance
        else:
            performance_reward = -0.5  # Poor performance
        
        # Add transition reward based on level change
        level_diff = self.level_indices[new_level] - self.level_indices[current_level]
        
        # Reward for appropriate level transitions
        if level_diff > 0 and correct_ratio >= 0.7:
            # Reward for moving up when performance is good
            transition_reward = 0.5
        elif level_diff < 0 and correct_ratio < 0.4:
            # Reward for moving down when performance is poor
            transition_reward = 0.3
        elif level_diff == 0 and 0.4 <= correct_ratio <= 0.7:
            # Reward for staying at the same level when performance is moderate
            transition_reward = 0.2
        else:
            # Penalty for inappropriate transitions
            transition_reward = -0.2
            
        return performance_reward + transition_reward
    
    def update_from_quiz_session(self, topic, current_level, correct_count, total_questions, new_level):
        """Update the RL model based on a completed quiz session"""
        correct_ratio = correct_count / total_questions if total_questions > 0 else 0
        
        # Store performance in history
        self.performance_history[(topic, current_level)].append(correct_ratio)
        
        # Determine what action was taken
        current_idx = self.level_indices[current_level]
        new_idx = self.level_indices[new_level]
        action = new_idx - current_idx
        
        # Calculate reward
        reward = self.calculate_reward(correct_ratio, current_level, new_level)
        
        # Update Q-value
        self.update_q_value(topic, current_level, action, reward, new_level)
        
        return new_level
    
    def get_recommended_level(self, topic, current_level, correct_count, total_questions):
        """Get a recommended level based on current performance using reinforcement learning with minimal guardrails"""
        correct_ratio = correct_count / total_questions if total_questions > 0 else 0
        
        original_exploration_rate = None
        if len(self.performance_history[(topic, current_level)]) < 3:
            original_exploration_rate = self.exploration_rate
            self.exploration_rate = 0.5 
        
        # Get the RL model's recommendation
        _, suggested_level = self.select_action(topic, current_level, correct_ratio, total_questions)
        
        # Restore original exploration rate if we changed it
        if original_exploration_rate is not None:
            self.exploration_rate = original_exploration_rate
        
        if current_level == 'Hard' and correct_ratio < 0.5 and suggested_level == 'Hard':
            return 'Medium'
        
        if current_level == 'Hard' and suggested_level == 'Easy':
            return 'Medium'
        
        if current_level == 'Easy' and suggested_level == 'Hard':
            return 'Medium'

        return suggested_level

# Initialize evaluator with safe fallback
try:
    evaluator = StudentAnswerEvaluator('./enhance_triplet', 'Final_Sorted_Topic_Wise.xlsx')
except Exception as e:
    print(f"Failed to initialize evaluator: {str(e)}")
    evaluator = None
    
genai.configure(api_key='AIzaSyANM6lJio6lK0cHprH_y_eov-ceyzBWKhk')
gemini_model = genai.GenerativeModel('gemini-2.0-flash')    
    
def role_required(required_role):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            id_token = request.headers.get('Authorization', '').split('Bearer ')[-1]
            try:
                decoded_token = auth.verify_id_token(id_token)
                user_role = decoded_token.get('role', 'student')
                if user_role != required_role:
                    return jsonify({'error': 'Insufficient permissions'}), 403
                g.user_id = decoded_token['uid']
                g.user_role = user_role
                return f(*args, **kwargs)
            except Exception as e:
                return jsonify({'error': str(e)}), 401
        return wrapped
    return decorator

def init_firestore_collections(user_id):
    collections = ['user_progress', 'quiz_attempts', 'exam_results', 'topic_mastery']
    for collection in collections:
        doc_ref = db.collection(collection).document(user_id)
        if not doc_ref.get().exists:
            doc_ref.set({})

@app.route('/')
def home():
    return jsonify({
        'message': 'Student Quiz API',
        'endpoints': {
            'GET /api/topics': 'List all available topics',
            'POST /api/quiz/start': 'Start a new quiz',
            'POST /api/quiz/answer': 'Submit an answer',
            'GET /api/quiz/status': 'Get quiz status',
            'GET /api/quiz/results': 'Get quiz results'
        }
    })

@app.route('/api/topics', methods=['GET'])
def get_topics():
    if not evaluator:
        return jsonify({'error': 'Evaluator not initialized'}), 500
    
    try:
        unique_topics = evaluator.df['Topic'].dropna().unique().tolist()
        return jsonify({'topics': unique_topics})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Update in app.py - modify the start_quiz route
@app.route('/api/quiz/start', methods=['POST'])
def start_quiz():
    data = request.json
    topic_type = data.get('type')  # 'topic' or 'exam'
    topics = data.get('topics', [])
    
    # Get user_id from request
    user_id = data.get('user_id')
    
    global evaluator
    if not evaluator:
        try:
            evaluator = StudentAnswerEvaluator('./enhance_triplet', 'Final_Sorted_Topic_Wise.xlsx')
        except Exception as e:
            return jsonify({'error': f'Failed to initialize evaluator: {str(e)}'}), 500
    
    if topic_type == 'exam':
        question_count = evaluator.init_comprehensive_exam(topics if topics else None)
        if question_count == 0:
            return jsonify({'error': 'No questions available for selected topics'}), 400
            
        question = evaluator.get_next_quiz_question()
        return jsonify({
            'message': 'Exam started',
            'question': question,
            'total_questions': question_count,
            'current_question': 1,
            'quiz_type': 'exam'
        })
    else:
        # Topic-based quiz
        if not topics or len(topics) == 0:
            return jsonify({'error': 'Please select at least one topic for topic quiz'}), 400
        
        topic = topics[0]  # Use the first topic if multiple are provided
        
        # Pass the user_id to init_topic_quiz - this is crucial for getting the correct level
        question_count = evaluator.init_topic_quiz(topic, user_id)
        if question_count == 0:
            return jsonify({'error': f'No questions available for topic: {topic}'}), 400
            
        question = evaluator.get_next_quiz_question()
        
        # Include the actual current level in the response
        current_level = evaluator.current_topic_levels.get(topic, 'Easy')
        return jsonify({
            'message': 'Topic quiz started',
            'question': question,
            'total_questions': question_count,
            'current_question': 1,
            'quiz_type': 'topic',
            'current_level': current_level
        })
        
# app.py - Updated /api/quiz/answer route
@app.route('/api/quiz/answer', methods=['POST'])
def submit_answer():
    data = request.json
    question_id = data.get('question_id')
    answer = data.get('answer')
    quiz_type = data.get('quiz_type', 'topic')  # Get quiz type from request, default to topic
    
    if not evaluator or question_id is None or not answer:
        return jsonify({'error': 'Invalid request'}), 400
    
    # Extract user ID from auth token if available
    user_id = None
    id_token = request.headers.get('Authorization', '').split('Bearer ')[-1]
    if id_token:
        try:
            decoded_token = auth.verify_id_token(id_token)
            user_id = decoded_token.get('uid')
        except Exception as e:
            print(f"Auth error: {str(e)}")
    
    # Check if we're in exam mode
    if quiz_type == 'exam' or evaluator.exam_mode:
        # Process exam answer
        evaluation = evaluator.evaluate_answer(question_id, answer, is_exam=True)
        
        # Move to next question
        evaluator.current_quiz_index += 1
        next_question = evaluator.get_next_quiz_question()
        
        # Calculate score if exam is complete
        exam_score = None
        if next_question is None:
            exam_score = evaluator.calculate_exam_score()
        
        return jsonify({
            'is_correct': evaluation['is_correct'],
            'feedback': evaluation.get('feedback', ''),
            'confidence': evaluation.get('confidence', 0),
            'correct_answer': evaluation.get('correct_answer', ''),
            'improvements': evaluation.get('improvements', []),
            'next_question': next_question,
            'current_question': evaluator.current_quiz_index + 1,
            'total_questions': len(evaluator.quiz_questions),
            'quiz_complete': next_question is None,
            'quiz_type': 'exam',
            'score': exam_score
        })
    else:
        # Process topic quiz answer
        result, next_question, quiz_complete = evaluator.process_answer_and_advance(question_id, answer)
        
        # Get the full evaluation details from the result
        evaluation = result.get('evaluation', {})
        
        response = {
            'is_correct': result['is_correct'],
            'feedback': evaluation.get('feedback', ''),
            'confidence': evaluation.get('confidence', 0),
            'correct_answer': evaluation.get('correct_answer', ''),
            'improvements': evaluation.get('improvements', []),
            'level_complete': result.get('level_complete', False),
            'quiz_complete': quiz_complete,
            'next_question': next_question,
            'quiz_type': 'topic',
            'current_level': result.get('current_level', 'Easy')
        }
        
        if result.get('level_complete') and not quiz_complete:
            response['new_level'] = result.get('new_level')
            response['level_performance'] = {
                'questions_asked': evaluator.level_questions_asked,
                'questions_correct': evaluator.level_questions_correct
            }
        
        if next_question:
            response['current_question'] = evaluator.current_quiz_index + 1
            response['total_questions'] = len(evaluator.quiz_questions)
            
        # Add this before the return statement
        if quiz_type == 'topic' and user_id:
            evaluator.save_rl_model_state(user_id)
        
        return jsonify(response)
    
@app.route('/api/user/progress', methods=['GET'])
def get_user_progress():
    # Extract user ID from auth token
    id_token = request.headers.get('Authorization', '').split('Bearer ')[-1]
    
    try:
        if not id_token:
            return jsonify({'error': 'Authentication required'}), 401
            
        decoded_token = auth.verify_id_token(id_token)
        user_id = decoded_token.get('uid')
        
        # Get user document from Firestore
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
            
        user_data = user_doc.to_dict()
        topic_mastery = user_data.get('topicsMastery', {})
        
        # Prepare response data
        progress_data = {
            'topics': {},
            'overall': {
                'topic_quiz': {'correct': 0, 'incorrect': 0, 'total': 0, 'success_rate': 0},
                'exam_quiz': {'correct': 0, 'incorrect': 0, 'total': 0, 'success_rate': 0},
                'combined': {'correct': 0, 'incorrect': 0, 'total': 0, 'success_rate': 0}
            }
        }
        
        # Process each topic's data
        for topic, data in topic_mastery.items():
            # Extract stats for this topic
            topic_quiz = data.get('topicQuiz', {'correct': 0, 'incorrect': 0})
            exam_quiz = data.get('examQuiz', {'correct': 0, 'incorrect': 0})
            combined = {
                'correct': data.get('correct', 0),
                'incorrect': data.get('incorrect', 0)
            }
            
            # Calculate totals and success rates
            topic_quiz_total = topic_quiz.get('correct', 0) + topic_quiz.get('incorrect', 0)
            exam_quiz_total = exam_quiz.get('correct', 0) + exam_quiz.get('incorrect', 0)
            combined_total = combined['correct'] + combined['incorrect']
            
            topic_quiz_rate = round((topic_quiz.get('correct', 0) / topic_quiz_total * 100)) if topic_quiz_total > 0 else 0
            exam_quiz_rate = round((exam_quiz.get('correct', 0) / exam_quiz_total * 100)) if exam_quiz_total > 0 else 0
            combined_rate = round((combined['correct'] / combined_total * 100)) if combined_total > 0 else 0
            
            # Add to topic data
            progress_data['topics'][topic] = {
                'current_level': data.get('currentLevel', 'Easy'),
                'topic_quiz': {
                    'correct': topic_quiz.get('correct', 0),
                    'incorrect': topic_quiz.get('incorrect', 0),
                    'total': topic_quiz_total,
                    'success_rate': topic_quiz_rate
                },
                'exam_quiz': {
                    'correct': exam_quiz.get('correct', 0),
                    'incorrect': exam_quiz.get('incorrect', 0),
                    'total': exam_quiz_total,
                    'success_rate': exam_quiz_rate
                },
                'combined': {
                    'correct': combined['correct'],
                    'incorrect': combined['incorrect'],
                    'total': combined_total,
                    'success_rate': combined_rate
                }
            }
            
            # Add to overall stats
            progress_data['overall']['topic_quiz']['correct'] += topic_quiz.get('correct', 0)
            progress_data['overall']['topic_quiz']['incorrect'] += topic_quiz.get('incorrect', 0)
            progress_data['overall']['exam_quiz']['correct'] += exam_quiz.get('correct', 0)
            progress_data['overall']['exam_quiz']['incorrect'] += exam_quiz.get('incorrect', 0)
            progress_data['overall']['combined']['correct'] += combined['correct']
            progress_data['overall']['combined']['incorrect'] += combined['incorrect']
        
        # Calculate overall totals and rates
        progress_data['overall']['topic_quiz']['total'] = (
            progress_data['overall']['topic_quiz']['correct'] + 
            progress_data['overall']['topic_quiz']['incorrect']
        )
        progress_data['overall']['exam_quiz']['total'] = (
            progress_data['overall']['exam_quiz']['correct'] + 
            progress_data['overall']['exam_quiz']['incorrect']
        )
        progress_data['overall']['combined']['total'] = (
            progress_data['overall']['combined']['correct'] + 
            progress_data['overall']['combined']['incorrect']
        )
        
        # Calculate success rates for overall stats
        if progress_data['overall']['topic_quiz']['total'] > 0:
            progress_data['overall']['topic_quiz']['success_rate'] = round(
                (progress_data['overall']['topic_quiz']['correct'] / 
                 progress_data['overall']['topic_quiz']['total']) * 100
            )
        
        if progress_data['overall']['exam_quiz']['total'] > 0:
            progress_data['overall']['exam_quiz']['success_rate'] = round(
                (progress_data['overall']['exam_quiz']['correct'] / 
                 progress_data['overall']['exam_quiz']['total']) * 100
            )
        
        if progress_data['overall']['combined']['total'] > 0:
            progress_data['overall']['combined']['success_rate'] = round(
                (progress_data['overall']['combined']['correct'] / 
                 progress_data['overall']['combined']['total']) * 100
            )
        
        return jsonify(progress_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/test', methods=['GET'])
def test_endpoint():
    return jsonify({
        'status': 'success',
        'message': 'Test endpoint is working!',
        'data': {
            'version': '1.0',
            'timestamp': datetime.datetime.now(datetime.UTC)
        }
    })
    
@app.route('/api/questions', methods=['GET'])
def get_questions():
    try:
        # Get filter parameters
        topic = request.args.get('topic', '')
        difficulty = request.args.get('difficulty', '')
        
        if not evaluator:
            return jsonify({'error': 'Evaluator not initialized'}), 500

        # Filter questions
        filtered_df = evaluator.df
        if topic and topic != 'all':
            filtered_df = filtered_df[filtered_df['Topic'] == topic]
        if difficulty:
            filtered_df = filtered_df[filtered_df['Difficulty Level'] == difficulty]

        # Convert to list of questions
        questions = []
        for _, row in filtered_df.iterrows():
            questions.append({
                # Generate ID from index since no Unique ID column exists
                'id': str(row.name),  
                'topic': row['Topic'],
                'difficulty': row['Difficulty Level'],
                'text': row['Anchor'],
                'correctAnswer': row['Positive'],
                # Include both incorrect answers from your dataset
                'incorrectAnswers': [
                    row['Negative'],
                    row['Incorrect Answer 2']
                ]
            })

        return jsonify({
            'questions': questions,
            'total': len(questions)
        })

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/questions/<string:question_id>', methods=['DELETE'])
def delete_question(question_id):
    try:
        idx = int(question_id)
        if idx >= len(evaluator.df) or idx < 0:
            return jsonify({'error': 'Question not found'}), 404
            
        # Drop the row and reset index
        evaluator.df = evaluator.df.drop(index=idx).reset_index(drop=True)
        # Save to Excel
        evaluator.df.to_excel('Final_Sorted_Topic_Wise.xlsx', index=False)  # NEW LINE
        return jsonify({'message': 'Question deleted successfully'})
        
    except ValueError:
        return jsonify({'error': 'Invalid question ID format'}), 400
    except Exception as e:
        print(f"Error deleting question: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/questions/<string:question_id>', methods=['PUT'])
def update_question(question_id):
    try:
        data = request.json
        idx = int(question_id)
        
        if idx >= len(evaluator.df) or idx < 0:
            return jsonify({'error': 'Question not found'}), 404
            
        evaluator.df.at[idx, 'Topic'] = data.get('topic')
        evaluator.df.at[idx, 'Difficulty Level'] = data.get('difficulty')
        evaluator.df.at[idx, 'Anchor'] = data.get('text')
        evaluator.df.at[idx, 'Positive'] = data.get('correctAnswer')
        evaluator.df.at[idx, 'Negative'] = data.get('incorrectAnswers')[0]
        evaluator.df.at[idx, 'Incorrect Answer 2'] = data.get('incorrectAnswers')[1]
        
        # Save to Excel  # NEW SECTION
        evaluator.df.to_excel('Final_Sorted_Topic_Wise.xlsx', index=False)
        
        updated_question = evaluator.df.iloc[idx].to_dict()
        updated_question['id'] = str(idx)
        return jsonify(updated_question)
        
    except ValueError:
        return jsonify({'error': 'Invalid question ID format'}), 400
    except Exception as e:
        print(f"Error updating question: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/questions', methods=['POST'])
def create_question():
    try:
        data = request.json
        new_question = {
            'Anchor': data.get('text'),
            'Positive': data.get('correctAnswer'),
            'Negative': data.get('incorrectAnswers')[0],
            'Incorrect Answer 2': data.get('incorrectAnswers')[1] if len(data.get('incorrectAnswers', [])) > 1 else "",
            'Difficulty Level': data.get('difficulty'),
            'Topic': data.get('topic')
        }
        
        new_df = pd.DataFrame([new_question])
        evaluator.df = pd.concat([evaluator.df, new_df], ignore_index=True)
        # Save to Excel  # NEW LINE
        evaluator.df.to_excel('Final_Sorted_Topic_Wise.xlsx', index=False)
        
        return jsonify({
            'id': str(len(evaluator.df)-1),
            **new_question
        }), 201
        
    except Exception as e:
        print(f"Error creating question: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/questions/count', methods=['GET'])
def get_question_count():
    if not evaluator:
        return jsonify({'error': 'Evaluator not initialized'}), 500
    try:
        # Assuming evaluator.df contains all questions
        total_count = len(evaluator.df)
        return jsonify({'total': total_count})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.after_request
def after_request(response):
    # Ensure all API responses have proper CORS headers
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

if __name__ == '__main__':
    app.run(debug=True)