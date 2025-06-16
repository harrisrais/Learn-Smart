import { db } from './firebase';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';

// Helper function to convert Excel data to Firestore format
const transformExcelData = (excelData) => {
  return excelData.map(row => ({
    topic: row.Topic,
    difficulty: row['Difficulty Level'],
    anchor: row.Anchor,
    positive: row.Positive,
    negative: row.Negative,
    explanation: row.Explanation || '',
    createdAt: new Date()
  }));
};

const initializeDatabase = async () => {
  // In a real scenario, you would import your Excel data here
  // For now, we'll use a placeholder with a few questions
  const sampleQuestions = [
    {
      Topic: "Mathematics",
      "Difficulty Level": "Easy",
      Anchor: "What is 2+2?",
      Positive: "4",
      Negative: "5",
      Explanation: "Basic addition"
    },
    // Add more sample questions...
  ];

  const questions = transformExcelData(sampleQuestions);

  try {
    const batch = writeBatch(db);
    const questionsRef = collection(db, 'questions');
    
    // Add each question to the batch
    questions.forEach(question => {
      const newDocRef = doc(questionsRef);
      batch.set(newDocRef, question);
    });

    await batch.commit();
    console.log(`Successfully added ${questions.length} questions to Firestore`);
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Alternative approach for large datasets (850+ questions)
const importFromExcel = async (excelData) => {
  const BATCH_SIZE = 500; // Firestore batch limit
  const questions = transformExcelData(excelData);
  
  try {
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchQuestions = questions.slice(i, i + BATCH_SIZE);
      
      batchQuestions.forEach(question => {
        const newDocRef = doc(collection(db, 'questions'));
        batch.set(newDocRef, question);
      });

      await batch.commit();
      console.log(`Processed batch ${i / BATCH_SIZE + 1}`);
    }
    console.log('All questions imported successfully');
  } catch (error) {
    console.error('Error during batch import:', error);
    throw error;
  }
};

// To use:
// 1. For small datasets: initializeDatabase()
// 2. For large datasets: importFromExcel(yourExcelData)
// Remember to comment out after first run

export { initializeDatabase, importFromExcel };