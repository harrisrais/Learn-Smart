import os
import json
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

def migrate_user_data(user_id):
    # Initialize Firebase
    cred = credentials.Certificate(os.path.expanduser('~/service-account.json'))
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    # Load local data
    try:
        with open(f'user_data/{user_id}/examResults.json') as f:
            exams = json.load(f)
    except FileNotFoundError:
        exams = []

    try:
        with open(f'user_data/{user_id}/topicResults.json') as f:
            topics = json.load(f)
    except FileNotFoundError:
        topics = {}

    # Migrate exams
    exam_ref = db.collection('users').document(user_id).collection('exams')
    for exam in exams:
        # Convert string date to Firestore timestamp
        if 'timestamp' in exam:
            exam['timestamp'] = datetime.fromisoformat(exam['timestamp'])
        
        exam_ref.add(exam)

    # Migrate topics
    topic_ref = db.collection('users').document(user_id).collection('topics')
    for topic_name, data in topics.items():
        # Convert string date
        if 'lastUpdated' in data:
            data['lastUpdated'] = datetime.fromisoformat(data['lastUpdated'])
        
        topic_ref.document(topic_name).set(data)

    print(f"Migrated data for user {user_id}")

if __name__ == '__main__':
    # Example usage: python -m migrations.exam-topic-results USER123
    import sys
    if len(sys.argv) < 2:
        print("Usage: python migrate.py <user_id>")
        sys.exit(1)
    
    migrate_user_data(sys.argv[1])