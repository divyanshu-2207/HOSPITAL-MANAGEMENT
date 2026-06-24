// ═══════════════════════════════════════════
// MEDICARE HOSPITAL — server.js
// Main Express Application Entry Point
// ═══════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// ── MIDDLEWARE ───────────────────────────────

// CORS — allow frontend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8080',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiter (100 requests per 15 minutes per IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { message: 'Too many login attempts. Please wait 15 minutes.' },
});
app.use('/api/auth/', authLimiter);

// Serve frontend static files in production
app.use(express.static('../frontend'));

// ── API ROUTES ───────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/departments', require('./routes/departments'));

// ── HEALTH CHECK ─────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'MediCare Hospital API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ── API DOCUMENTATION ────────────────────────
app.get('/api', (req, res) => {
  res.json({
    name: 'MediCare Hospital API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'Login user',
        'GET /api/auth/me': 'Get current user (auth required)',
        'PUT /api/auth/update': 'Update profile (auth required)',
        'POST /api/auth/change-password': 'Change password (auth required)',
      },
      appointments: {
        'POST /api/appointments': 'Book appointment',
        'GET /api/appointments': 'Get appointments (auth required)',
        'GET /api/appointments/:id': 'Get appointment by ID (auth required)',
        'PUT /api/appointments/:id/status': 'Update status (admin only)',
        'DELETE /api/appointments/:id': 'Cancel appointment (auth required)',
        'GET /api/appointments/stats/summary': 'Dashboard stats (admin only)',
      },
      doctors: {
        'GET /api/doctors': 'Get all doctors (public)',
        'GET /api/doctors/:id': 'Get doctor by ID (public)',
        'GET /api/doctors/:id/slots': 'Get available time slots (public)',
        'POST /api/doctors': 'Add doctor (admin only)',
        'PUT /api/doctors/:id': 'Update doctor (admin only)',
        'DELETE /api/doctors/:id': 'Delete doctor (admin only)',
      },
      departments: {
        'GET /api/departments': 'Get all departments (public)',
        'GET /api/departments/:id/doctors': 'Get doctors by dept (public)',
        'GET /api/departments/packages': 'Get health packages (public)',
        'POST /api/departments': 'Add department (admin only)',
      },
      contact: {
        'POST /api/contact': 'Send contact message (public)',
        'GET /api/contact': 'View messages (admin only)',
        'PUT /api/contact/:id/read': 'Mark as read (admin only)',
      },
    },
  });
});

// ── 404 HANDLER ──────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

// ── GLOBAL ERROR HANDLER ─────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── START SERVER ─────────────────────────────
async function startServer() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log('\n════════════════════════════════════════');
      console.log('  🏥  MediCare Hospital API  🏥');
      console.log('════════════════════════════════════════');
      console.log(`  🚀  Server:   http://localhost:${PORT}`);
      console.log(`  📖  API Docs: http://localhost:${PORT}/api`);
      console.log(`  ❤️   Health:   http://localhost:${PORT}/api/health`);
      console.log(`  🌍  Mode:     ${process.env.NODE_ENV || 'development'}`);
      console.log('════════════════════════════════════════\n');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

startServer();
