import admin from 'firebase-admin';
import mongo from 'mongo-async';

const MONGO_URL = process.env.MONGO_URL || '<YOUR_MONGO_URL>';
const FIREBASE_DATABASE_NAME = process.env.FIREBASE_DATABASE_NAME || '<YOUR_FIREBASE_DATABASE_NAME>';
const FIREBASE_DATABASE_URL = `https://${FIREBASE_DATABASE_NAME}.firebaseio.com`;

const serviceAccount = require('path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: FIREBASE_DATABASE_URL
});

const ref = admin.database().ref('/');

async function getCollectionsFromMongo (callback) {
  try {
    const db = await mongo.connect(MONGO_URL);
    const collections = await db.collections();

    const collectionNames = collections.map(c => c.s.name);
    console.log(collectionNames);
    collectionNames.forEach((name, count) => {
      db.collection(name).find({}).toArray((err, docs) => {
        if (err) {
          return callback(err);
        }

        if (docs.length === 0) {
          return callback(`${name} is empty.`);
        }

        const docObjects = docs.reduce((o, v) => {
          o[v._id] = v;
          return o;
        }, {});

        if (name !== 'system.indexes') {
          callback(null, {name: name, docObjects});
        }
      });
    });
  } catch (error) {
    callback (error);
  }
}


getCollectionsFromMongo((err, result) => {
  if (err) {
    return console.log(err);
  }

  ref.child(result.name).set(result.docObjects, (err) => {
    if (err) {
      return console.log(err);
    }

    console.log(`${result.name} Collection has been inserted to Firebase.`);
  });
});

