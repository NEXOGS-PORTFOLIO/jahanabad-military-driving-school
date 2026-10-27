const nodemailer = require('nodemailer');
const { createHash } = require('crypto');

let transport, configurationKey;
const configuration = () => {
  const host = process.env.EMAIL_HOST?.trim();
  const port = Number(process.env.EMAIL_PORT);
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS;
  const sender = (process.env.EMAIL_FROM || user || '').trim();
  if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(sender)) {
    const error = new Error('Email configuration is incomplete. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, and a valid sender address (EMAIL_FROM or EMAIL_USER).');
    error.code = 'EMAIL_CONFIG_INVALID';
    throw error;
  }
  return { host, port, user, pass, sender };
};

const getMailTransport = () => {
  // Resolve configuration at send time, after dotenv/application initialization.
  const settings = configuration();
  const key = createHash('sha256').update(JSON.stringify(settings)).digest('hex');
  if (!transport || configurationKey !== key) {
    transport?.close?.();
    transport = nodemailer.createTransport({
      host: settings.host, port: settings.port, secure: settings.port === 465,
      requireTLS: settings.port === 587,
      auth: { user: settings.user, pass: settings.pass },
      pool: true, maxConnections: 3, maxMessages: 100,
      connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 60000
    });
    configurationKey = key;
  }
  return { transport, sender: settings.sender };
};

const deliveryError = source => {
  if (source.code === 'EMAIL_CONFIG_INVALID') return source;
  let code = 'EMAIL_DELIVERY_FAILED', message = 'The SMTP server could not send the email.';
  if (source.code === 'EAUTH' || source.responseCode === 535) {
    code = 'EMAIL_AUTH_FAILED'; message = 'SMTP authentication failed. Check EMAIL_USER and EMAIL_PASS.';
  } else if (['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'EDNS', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND'].includes(source.code)) {
    code = 'EMAIL_CONNECTION_FAILED'; message = 'SMTP connection failed. Check EMAIL_HOST, EMAIL_PORT, TLS settings, and outbound network access.';
  } else if (source.code === 'EENVELOPE' || source.code === 'EMAIL_RECIPIENT_REJECTED') {
    code = 'EMAIL_RECIPIENT_REJECTED'; message = 'The SMTP server rejected the sender or recipient. Check EMAIL_FROM and the recipient address.';
  } else if (['ECERT', 'ERR_TLS_CERT_ALTNAME_INVALID', 'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT'].includes(source.code)) {
    code = 'EMAIL_TLS_FAILED'; message = 'SMTP certificate verification failed. Use the mail provider’s correct SMTP hostname and valid certificate.';
  }
  const error = new Error(message);
  error.code = code;
  error.smtpCode = source.code;
  error.responseCode = source.responseCode;
  error.command = source.command;
  return error;
};

const verifyEmailConnection = async () => {
  try {
    await getMailTransport().transport.verify();
    return { success: true };
  } catch (error) { throw deliveryError(error); }
};
const closeEmailConnection = () => { transport?.close?.(); transport = undefined; configurationKey = undefined; };

module.exports = { getMailTransport, deliveryError, verifyEmailConnection, closeEmailConnection };
