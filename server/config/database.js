const connectionOptions = {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000
};

function databaseUri() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error('DB_CONFIG_MISSING');
  if (!/^mongodb(?:\+srv)?:\/\//.test(uri) || /[<>\s]/.test(uri)) {
    throw new Error('DB_CONFIG_INVALID');
  }
  return uri;
}

function databaseError(error) {
  // Inspect driver errors internally, but never print URIs or credentials.
  const messages = [error?.message, error?.cause?.message];
  for (const server of error?.reason?.servers?.values?.() || []) messages.push(server.error?.message);
  const detail = messages.filter(Boolean).join(' ');
  if (/DB_CONFIG_MISSING/.test(detail)) return {
    code: 'DB_CONFIG_MISSING',
    hint: 'Set MONGODB_URI in cPanel or in .env beside app.js. .env.example is a template and is not loaded. Restart the app after changing settings.'
  };
  if (/DB_CONFIG_INVALID|MongoParseError|Invalid scheme|Invalid connection string/i.test(detail + ' ' + error?.name)) return {
    code: 'DB_CONFIG_INVALID',
    hint: 'Use the complete mongodb:// or mongodb+srv:// URI. Replace placeholders and percent-encode special characters in the database username/password.'
  };
  if (error?.code === 18 || /authentication failed|bad auth|AuthenticationFailed/i.test(detail)) return {
    code: 'DB_AUTH_FAILED',
    hint: 'Check the MongoDB database user, password, authSource, and percent-encoding. Atlas login credentials are different from database credentials.'
  };
  if (/querySrv|queryTxt|ENOTFOUND|EAI_AGAIN|DNS|ESERVFAIL/i.test(detail)) return {
    code: 'DB_DNS_FAILED',
    hint: 'Check the cluster hostname and cPanel DNS resolution. If SRV lookups are blocked, obtain the standard mongodb:// connection string from your database provider; do not just remove +srv.'
  };
  if (/certificate|TLS|SSL/i.test(detail)) return {
    code: 'DB_TLS_FAILED',
    hint: 'Check server certificates, system time, and Node.js runtime with your host. Keep TLS certificate verification enabled.'
  };
  return {
    code: 'DB_CONNECTION_FAILED',
    hint: 'Check that the cluster is running, allow the hosting server outbound IP in Atlas Network Access, and ask the host to allow outbound MongoDB connections. localhost works only if MongoDB runs on the hosting server.'
  };
}

module.exports = { databaseUri, databaseError, connectionOptions };
