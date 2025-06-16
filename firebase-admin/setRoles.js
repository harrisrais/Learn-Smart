const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://learn-smart-5bc4b.firebaseio.com"
});

async function setTeacherRole(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: 'teacher' });
    console.log(`Success! ${email} is now a teacher`);
    
    // Also add to teachers collection in Firestore
    await admin.firestore().collection('teachers').doc(user.uid).set({
      email: email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    });
    
  } catch (error) {
    console.error('Error setting teacher role:', error);
  }
}

// Usage: node setRoles.js teacher@example.com
const email = process.argv[2];
if (email) {
  setTeacherRole(email);
} else {
  console.log('Please provide an email: node setRoles.js teacher@example.com');
}