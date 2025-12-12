const admin = require('firebase-admin');
const path = require('path');

const keyPath = path.join(__dirname, '..', 'firebase-adminsdk.json');
try {
  const serviceAccount = require(keyPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
  console.error('Failed to initialize firebase-admin from', keyPath, e.message);
  process.exit(1);
}

const db = admin.firestore();

(async () => {
  const appsRef = db.collection('apps');
  const snapshot = await appsRef.get();
  console.log(`Found ${snapshot.size} apps`);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`${doc.id} -> id=${data.id}, name=${data.name}, gradient=${data.gradient}`);
  });
})();
