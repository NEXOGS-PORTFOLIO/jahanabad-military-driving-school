const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { databaseUri, connectionOptions } = require('../config/database');

const PRESERVED = new Set(['users', 'courses', 'batches']);

async function snapshot(db, name) {
  const collection = db.collection(name);
  const hash = crypto.createHash('sha256');
  let count = 0;
  for await (const record of collection.find({}, { raw: true }).sort({ _id: 1 })) {
    hash.update(record);
    count++;
  }
  return {
    count,
    sha256: hash.digest('hex'),
    indexes: await collection.listIndexes().toArray(),
    metadata: await db.listCollections({ name }).next()
  };
}

async function clearDataKeepCore(db) {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const names = collections.map(item => item.name);
  for (const name of PRESERVED) {
    if (!names.includes(name)) throw new Error(`Required preserved collection is missing: ${name}`);
  }
  const before = {};
  for (const name of PRESERVED) before[name] = await snapshot(db, name);
  console.log(`Target database: ${db.databaseName}`);
  console.table(Object.entries(before).map(([collection, data]) => ({ collection, records: data.count, sha256: data.sha256 })));
  const targets = names.filter(name => !PRESERVED.has(name) && !name.startsWith('system.'));
  console.log('Collections to drop:', targets.join(', ') || '(none)');
  for (const name of targets) {
    await db.collection(name).drop();
    console.log(`Dropped ${name}`);
  }
  for (const name of PRESERVED) {
    const after = await snapshot(db, name);
    if (JSON.stringify(before[name]) !== JSON.stringify(after)) {
      throw new Error(`Preservation verification failed for ${name}; investigate concurrent database writes`);
    }
  }
  const remaining = await db.listCollections({}, { nameOnly: true }).toArray();
  if (remaining.some(item => !PRESERVED.has(item.name) && !item.name.startsWith('system.'))) {
    throw new Error('Unexpected collections remain; check for concurrent application writes');
  }
  await db.command({ ping: 1 });
  console.log('Cleanup verified: users, courses, and batches records, indexes, and collection metadata are unchanged. Database ping succeeded.');
}

async function main() {
  // A separate connection with no registered models avoids automatic index/collection creation.
  const connection = mongoose.createConnection(databaseUri(), { ...connectionOptions, autoIndex: false, autoCreate: false });
  try {
    await connection.asPromise();
    await clearDataKeepCore(connection.db);
  } finally {
    await connection.close();
  }
}

if (require.main === module) main().catch(error => {
  console.error(`Cleanup failed: ${error.message}`);
  process.exitCode = 1;
});

module.exports = { clearDataKeepCore };
