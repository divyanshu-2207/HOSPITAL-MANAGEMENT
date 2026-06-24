// ═══════════════════════════════════════════
// MEDICARE HOSPITAL — routes/auth.js
// Authentication Routes (Register / Login)
// ═══════════════════════════════════════════

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { dbRun, dbGet } = require('../database');
const { authenticate } = require('../middleware/auth');

// ── HELPER: Generate Token ───────────────────
const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ── POST /api/auth/register ──────────────────
router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone').optional().matches(/^[\+]?[0-9\s\-]{10,15}$/).withMessage('Invalid phone number'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { firstName, lastName, email, phone, password } = req.body;

    // Check if user already exists
    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ message: 'Email already registered. Please login.' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await dbRun(
      'INSERT INTO users (firstName, lastName, email, phone, password) VALUES (?, ?, ?, ?, ?)',
      [firstName, lastName, email, phone || null, hashedPassword]
    );

    const newUser = { id: result.id, firstName, lastName, email, phone, role: 'patient' };
    const token = generateToken(newUser);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ── POST /api/auth/login ─────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ message: 'No account found with this email.' });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ message: 'Incorrect password.' });

    const safeUser = {
      id: user.id, firstName: user.firstName, lastName: user.lastName,
      email: user.email, phone: user.phone, role: user.role
    };
    const token = generateToken(safeUser);

    res.json({ message: 'Login successful', token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ── GET /api/auth/me ─────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT id, firstName, lastName, email, phone, role, createdAt FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── PUT /api/auth/update ─────────────────────
router.put('/update', authenticate, [
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('phone').optional().matches(/^[\+]?[0-9\s\-]{10,15}$/),
], async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    await dbRun(
      'UPDATE users SET firstName=?, lastName=?, phone=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?',
      [firstName || req.user.firstName, lastName || req.user.lastName, phone, req.user.id]
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Update failed' });
  }
});

// ── POST /api/auth/change-password ──────────
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], async (req, res) => {
  try {
    const user = await dbGet('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(req.body.currentPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(req.body.newPassword, 12);
    await dbRun('UPDATE users SET password=? WHERE id=?', [hashed, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Password change failed' });
  }
});

module.exports = router;
