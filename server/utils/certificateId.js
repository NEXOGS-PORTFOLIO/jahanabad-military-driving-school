const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: String,
  serial: { type: Number, required: true }
}, { versionKey: false });
const Counter = mongoose.model('CertificateCounter', counterSchema);
const indexPromises = new WeakMap();

function ensureCertificateIndex(Certificate) {
  if (!indexPromises.has(Certificate)) {
    const promise = Certificate.collection.createIndex({ certificateId: 1 }, { unique: true })
      .catch(error => { indexPromises.delete(Certificate); throw error; });
    indexPromises.set(Certificate, promise);
  }
  return indexPromises.get(Certificate);
}

async function allocateCertificateId(Certificate, now = new Date()) {
  const start = Number(process.env.CERTIFICATE_SERIAL_START || 404);
  if (!Number.isInteger(start) || start < 1 || start > 99999999) {
    throw new Error('CERTIFICATE_SERIAL_START must be an integer between 1 and 99999999');
  }
  const year = new Intl.DateTimeFormat('en', {
    year: 'numeric', timeZone: process.env.CERTIFICATE_TIME_ZONE || 'Asia/Dhaka'
  }).format(now);
  await ensureCertificateIndex(Certificate);
  // Compare the serial itself across every year, including records from the old yearly allocator.
  // Legacy IDs and all existing certificate records remain untouched.
  const [latest] = await Certificate.aggregate([
    { $match: { certificateId: /^JMDS-[0-9]{4}-[0-9]{6,8}$/ } },
    { $group: { _id: null, serial: { $max: { $toInt: { $substrBytes: ['$certificateId', 10, 8] } } } } }
  ]);
  const floor = Math.max(start - 1, latest?.serial || 0);
  const key = 'JMDS-global';
  // _id's unique index serializes initialization across processes. A losing upsert retries.
  try {
    await Counter.updateOne({ _id: key }, { $max: { serial: floor } }, { upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    await Counter.updateOne({ _id: key }, { $max: { serial: floor } });
  }
  const counter = await Counter.findOneAndUpdate(
    { _id: key, serial: { $lt: 99999999 } },
    { $inc: { serial: 1 } }, { new: true }
  );
  if (!counter) throw new Error('Certificate serial sequence exhausted');
  return `JMDS-${year}-${String(counter.serial).padStart(6, '0')}`;
}

module.exports = { allocateCertificateId, ensureCertificateIndex, Counter };
