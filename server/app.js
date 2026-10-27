// cPanel Passenger uses app.js as its default entry point.
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
require('./server');
