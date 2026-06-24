act · JS
// ═══════════════════════════════════════════
// MEDICARE HOSPITAL — routes/contact.js
// Contact Messages & Health Packages Routes
// ═══════════════════════════════════════════
 
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { dbRun, dbGet, dbAll } = require('../database');
const { authenticate, adminOnly } = require('../middleware/auth');
 
// ── POST /api/contact ────────────────────────
router.post('/', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
 
    const { name, email, subject, message } = req.body;
 
    await dbRun(
      'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
      [name, email, subject || null, message]
    );
 
    res.status(201).json({ message: 'Message received. We will respond within 24 hours.' });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ message: 'Failed to send message' });
  }
});
 
// ── GET /api/contact ─────────────────────────
// Admin only: View all messages
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    let params = [];
    if (status) { where += ' AND status = ?'; params.push(status); }
 
    const messages = await dbAll(
      `SELECT * FROM contact_messages ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const count = await dbGet(`SELECT COUNT(*) as total FROM contact_messages ${where}`, params);
    res.json({ messages, total: count.total });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});
 
// ── PUT /api/contact/:id/read ────────────────
router.put('/:id/read', authenticate, adminOnly, async (req, res) => {
  try {
    await dbRun('UPDATE contact_messages SET status="read" WHERE id=?', [req.params.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Update failed' });
  }
});
 
module.exports = router;