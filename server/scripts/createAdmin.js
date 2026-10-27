const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD, MONGODB_URI } = process.env;
  if (![ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD, MONGODB_URI].every(Boolean)) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD and MONGODB_URI before creating an administrator');
  }
  if (ADMIN_PASSWORD.length < 12) throw new Error('Administrator password must be at least 12 characters');
  await mongoose.connect(MONGODB_URI);
  if (await User.exists({ role: 'admin' })) throw new Error('An administrator already exists; bootstrap refused');
  await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, phone: ADMIN_PHONE, password: ADMIN_PASSWORD, role: 'admin', isVerified: true, status: 'active' });
  console.log('Administrator created. Remove ADMIN_PASSWORD from the hosting environment.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
