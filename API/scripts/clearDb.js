// Run in Node.js (backend/scripts/clearDb.js)
const admin = require('firebase_admin.py');
const serviceAccount = require('learn-smart-5bc4b-firebase-adminsdk-fbsvc-adcaaae4ef.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function deleteCollection(collectionPath) {
  const ref = db.collection(collectionPath);
  const docs = await ref.listDocuments();
  await Promise.all(docs.map(doc => doc.delete()));
  console.log(`Deleted ${docs.length} docs in ${collectionPath}`);
}

(async () => {
  await deleteCollection('users');
  // Add other collections if needed
  console.log('DB cleared!');
})();