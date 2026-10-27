const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const databaseReady = require('./middleware/databaseReady');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

if (process.env.NODE_ENV === 'production') {
  require('./config/production').validateProductionEnv();
}

if (!process.env.SMS_BD_API_KEY?.trim()) {
  console.warn('SMS.BD is not configured: set SMS_BD_API_KEY in server/.env and restart the server.');
}

// Connect to database
connectDB();

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY.split(',').map(value => value.trim()));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', require('./middleware/apiSafety'));

// CORS
const configuredClientUrls = (process.env.CLIENT_URL || '')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean)
  .map(url => url.replace(/\/$/, ''));

const allowedOrigins = new Set([
  ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000']),
  ...configuredClientUrls
]);

app.use(cors({
  origin: (origin, callback) => {
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
}));

// Logging middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') console.log(`${req.method} ${req.path}`);
  next();
});

// Favicon handler - prevent 500 errors on missing favicon
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Static uploads for locally seeded assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  return databaseReady(req, res, next);
});
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/enrollments', require('./routes/enrollmentRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/reference-codes', require('./routes/referenceCodeRoutes'));
app.use('/api/batches', require('./routes/batchRoutes'));
app.use('/api/notices', require('./routes/noticeRoutes'));

// Health check route
app.get('/api/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    message: databaseConnected ? 'Server is running' : 'Database is unavailable',
    database: databaseConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Serve static assets in production
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'API route not found' }));
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  
  // Try multiple possible paths for the build directory
  const possibleBuildPaths = [
    path.join(__dirname, "public_html"),
    path.join(__dirname, "../public_html"),
  ];
  
  let buildPath = null;
  for (const testPath of possibleBuildPaths) {
    if (fs.existsSync(path.join(testPath, 'index.html'))) {
      buildPath = testPath;
      console.log(`Found build directory at: ${buildPath}`);
      break;
    }
  }
  
  if (!buildPath) {
    console.error('Build directory not found! Tried:', possibleBuildPaths);
    app.get('*', (req, res) => {
      res.status(500).json({ 
        success: false, 
        message: 'Build files not found. Please run: cd client && npm run build' 
      });
    });
  } else {
    // Set static folder
    app.use(express.static(buildPath));

    // Handle React routing, return all non-API requests to React app
    app.get('*', (req, res) => {
      // Don't send file for API routes
      if (req.url.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'API route not found' });
      }
      
      const indexPath = path.join(buildPath, 'index.html');
      
      // Check if file exists before sending
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Build files not found. Please run: cd client && npm run build' 
        });
      }
    });
  }
}

// Error handler middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

require('./utils/mailTransport').verifyEmailConnection().then(() => {
  console.log('SMTP connection and authentication verified.');
}).catch(error => {
  console.error('SMTP verification failed:', error.code, error.message);
});

const stopCompletionEmailWorker = require('./utils/completionNotifications').startCourseCompletionEmailWorker();
server.on('close', stopCompletionEmailWorker);

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the existing backend before starting another instance.`);
  } else {
    console.error(`Server failed to start: ${error.message}`);
  }
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
