const jwt = require('jsonwebtoken');
const { randomInt } = require('node:crypto');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Generate OTP
const generateOTP = () => {
  return randomInt(100000, 1000000).toString();
};

// Calculate OTP expiry (10 minutes from now)
const getOTPExpiry = () => {
  return new Date(Date.now() + 10 * 60 * 1000);
};

// Generate simple captcha
const generateCaptcha = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let captcha = '';
  for (let i = 0; i < 6; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return captcha;
};

module.exports = {
  generateToken,
  generateOTP,
  getOTPExpiry,
  generateCaptcha
};
