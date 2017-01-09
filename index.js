import admin from 'firebase-admin';
import MongoClient from 'mongodb';
import Promise from 'promise';

const MONGO_URL = process.env.MONGO_URL || '<YOUR_MONGO_URL>';
const FIREBASE_DATABASE_NAME = process.env.FIREBASE_DATABASE_NAME || '<YOUR_FIREBASE_DATABASE_NAME>';
const FIREBASE_DATABASE_URL = `https://${FIREBASE_DATABASE_NAME}.firebaseio.com`;

const serviceAccount = require('path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: FIREBASE_DATABASE_URL
});

function getMongoConnection(url) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) {
        return reject(err);
      }
      resolve(db);
    });
  });
}

function getMongoCollections(db) {
  return new Promise((resolve, reject) => {
    db.collections((err, collections) => {
      if (err) {
        return reject(err);
      }
      resolve(collections);
    });
  });
}

function getDocsOfCollection(db, collectionName) {
  return new Promise((resolve, reject) => {
    db.collection(collectionName).find({}).toArray((err, docs) => {
      if (err) {
        return reject(err);
      }
      console.log(`size of ${collectionName}: ${docs.length}`);
      resolve(docs);
    });
  });
}

function mongoDocsToObject(docs) {
  return docs.reduce((o, v) => {
    o[v._id] = v;
    return o;
  }, {});
}

async function saveMongoCollectionToFirebase(db, ref, collectionName) {
  try {
    const docs = await getDocsOfCollection(db, collectionName);
    const docObj = mongoDocsToObject(docs);
    console.log(`start migration : collection ${collectionName}`);
    return ref.child(collectionName).set(docObj);
  } catch (e) {
    console.log(e);
  }
}

async function migrateFromMongoToFirebase() {
  try {
    const db = await getMongoConnection(MONGO_URL);
    const collections = await getMongoCollections(db);

    const ref = admin.database().ref('/');

    const promises = collections.map(c => c.s.name)
      .filter(collectionName => collectionName !== 'system.indexes')
      .map(async (collectionName) => await saveMongoCollectionToFirebase(db, ref, collectionName));

    return Promise.all(promises);
  } catch(e) {
    console.log(e);
  }
}

(async function() {
  try {
    await migrateFromMongoToFirebase();
    console.log('complete');
    process.exit(0);
  } catch(e) {
    console.log(e);
    process.exit(1);
  }
}());

