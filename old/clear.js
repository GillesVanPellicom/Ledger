import {initializeApp, cert} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import serviceAccount from '../../keys/serviceAccountKey.json' with {type: 'json'};
import chalk from 'chalk';
import {task, info, success} from '../cli/styling.js';

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'webapps-3bef1.firebasestorage.app'
});
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

async function deleteCollection(db, collectionPath, batchSize) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid
  // exploding the stack.
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function clear() {
  info('Starting database clear process...');

  // 1. Clear Firestore Collections
  const collections = ['users', 'items'];
  for (const colName of collections) {
    await task(`Clearing Firestore collection: ${colName} `, async () => {
      // Use recursive delete to handle large collections and subcollections
      // Note: firebase-admin doesn't have a direct recursiveDelete method like the client SDK or CLI tools sometimes expose easily for all cases,
      // but we can iterate. For 'items', we might have subcollections like 'likes'.
      // A simple batch delete of the top-level docs DOES NOT delete subcollections in Firestore.
      // We need to find and delete them or use a recursive strategy.

      // However, for this specific project structure, we know 'items' has 'likes' subcollection.
      // We should delete subcollections first or use a recursive delete function if available.
      // Since we are using firebase-admin, we can use `db.recursiveDelete(ref)`.

      const colRef = db.collection(colName);
      const snapshot = await colRef.limit(1).get();
      if (snapshot.empty) return 'SKIPPED';

      // recursiveDelete is available in newer firebase-admin versions
      await db.recursiveDelete(colRef);
      return 'CLEARED';
    });
  }

  // 2. Clear Auth Users
  await task('Deleting all Auth users ', async () => {
    const listUsersResult = await auth.listUsers();
    if (listUsersResult.users.length === 0) return 'SKIPPED';

    const uids = listUsersResult.users.map(u => u.uid);
    await auth.deleteUsers(uids);
  });

  // 3. Clear Storage
  await task('Clearing Firebase Storage ', async () => {
    const bucket = storage.bucket();
    await bucket.deleteFiles();
    return 'CLEARED';
  });

  success('Database cleared successfully.');
}

clear().catch(err => {
  console.error(chalk.red.bold('ERROR  Database clear failed:'), err.message);
  process.exit(1);
});