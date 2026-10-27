const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '../.env');
const providedByHost = Boolean(process.env.MONGODB_URI?.trim());
require('dotenv').config({ path: envPath });
const mongoose = require('mongoose');
const { databaseUri, databaseError, connectionOptions } = require('../config/database');

async function main() {
  console.log(`Environment file beside app.js: ${fs.existsSync(envPath) ? 'found' : 'missing'}`);
  console.log(`MONGODB_URI source: ${providedByHost ? 'hosting environment (overrides .env)' : process.env.MONGODB_URI?.trim() ? '.env' : 'not configured'}`);
  let connection;
  try {
    connection = mongoose.createConnection(databaseUri(), connectionOptions);
    await connection.asPromise();
    await connection.db.command({ ping: 1 });
    console.log('Database connection and read-only ping succeeded. Restart the cPanel app and verify /api/health.');
  } catch (error) {
    const diagnostic = databaseError(error);
    console.error(`${diagnostic.code}: ${diagnostic.hint}`);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.close().catch(() => {});
  }
}
main().catch(() => { console.error('Database diagnostic could not complete.'); process.exitCode = 1; });
