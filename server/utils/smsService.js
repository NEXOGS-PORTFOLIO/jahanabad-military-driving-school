const { createHmac } = require('node:crypto');
const { normalizePhone } = require('./phone');

const providerErrors = {
  400: 'SMS.BD rejected the SMS parameters. Please contact support.',
  403: 'SMS.BD has not enabled SMS sending for this account. Please contact support.',
  405: 'SMS.BD authentication failed. Please contact support.',
  410: 'The SMS.BD account has expired. Please contact support.',
  411: 'The SMS.BD reseller account is unavailable. Please contact support.',
  413: 'SMS.BD rejected the sender ID. Please contact support.',
  416: 'SMS.BD rejected the phone number. Please check your mobile number.',
  417: 'The SMS service has insufficient balance. Please contact support.',
  420: 'SMS.BD blocked the verification message. Please contact support.'
};
const smsError = (message, code = 'SMS_DELIVERY_FAILED') =>
  Object.assign(new Error(message), { code, statusCode: 503 });

exports.hashSMSOTP = (phone, otp) => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
  return createHmac('sha256', process.env.JWT_SECRET).update(`${phone}:${otp}`).digest('hex');
};

exports.sendSMSOTP = async (phone, otp) => {
  const apiKey = process.env.SMS_BD_API_KEY?.trim();
  const senderId = process.env.SMS_BD_SENDER_ID?.trim();
  if (!apiKey) throw smsError('SMS.BD service is not configured. Please contact support.', 'SMS_NOT_CONFIGURED');
  const to = normalizePhone(phone);
  if (!to) throw new Error('Invalid Bangladesh mobile number');
  const body = {
    api_key: apiKey,
    to: to.slice(1), // SMS.BD expects 880..., without the leading plus.
    msg: `Jahanabad Military Driving School: Your registration code is ${otp}. It expires in 10 minutes. Do not share this code.`
  };
  if (senderId) body.sender_id = senderId;
  try {
    const response = await fetch('https://api.sms.net.bd/sendsms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
      redirect: 'error'
    });
    const result = await response.json();
    // An HTTP 200 alone does not indicate provider acceptance.
    if (!response.ok || !result || ![0, '0'].includes(result.error)) {
      const providerCode = /^\d+$/.test(String(result?.error)) ? Number(result.error) : undefined;
      const error = smsError(providerErrors[providerCode] || 'Unable to send verification SMS. Please try again.');
      // Keep only safe diagnostics, never the provider message or request body.
      error.providerCode = providerCode;
      error.httpStatus = response.status;
      throw error;
    }
  } catch (error) {
    if (error.code === 'SMS_DELIVERY_FAILED') throw error;
    // Provider responses may contain credentials or personal information.
    throw smsError('Unable to send verification SMS. Please try again.');
  }
};
