// ═══════════════════════════════════════════
// MEDICARE HOSPITAL — routes/appointments.js
// Appointment CRUD Routes
// ═══════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { dbRun, dbGet, dbAll } = require('../database');
const { authenticate, adminOnly, optionalAuth } = require('../middleware/auth');

// ── POST /api/appointments ───────────────────
// Book a new appointment
router.post('/', optionalAuth, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('date').isDate().withMessage('Valid date is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, phone, email, department, doctorId, date, time, note } = req.body;

    // Validate date is not in the past
    const apptDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (apptDate < today) {
      return res.status(400).json({ message: 'Appointment date cannot be in the past' });
    }

    // Validate time slot availability (simplified check)
    if (doctorId && time) {
      const conflict = await dbGet(
        'SELECT id FROM appointments WHERE doctorId=? AND date=? AND time=? AND status != "cancelled"',
        [doctorId, date, time]
      );
      if (conflict) {
        return res.status(409).json({ message: 'This time slot is already booked. Please choose another.' });
      }
    }

    const result = await dbRun(
      `INSERT INTO appointments (name, phone, email, department, doctorId, date, time, note, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, email || null, department, doctorId || null, date, time || null, note || null, req.user?.id || null]
    );

    const appointment = await dbGet('SELECT * FROM appointments WHERE id = ?', [result.id]);

    res.status(201).json({
      message: 'Appointment booked successfully',
      id: result.id,
      appointment
    });
  } catch (err) {
    console.error('Appointment error:', err);
    res.status(500).json({ message: 'Failed to book appointment' });
  }
});

// ── GET /api/appointments ────────────────────
// Admin: all appointments | User: their own
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, department, date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = req.user.role === 'admin' ? 'WHERE 1=1' : 'WHERE a.userId = ?';
    let params = req.user.role === 'admin' ? [] : [req.user.id];

    if (status) { whereClause += ' AND a.status = ?'; params.push(status); }
    if (department) { whereClause += ' AND a.department = ?'; params.push(department); }
    if (date) { whereClause += ' AND a.date = ?'; params.push(date); }

    const appointments = await dbAll(
      `SELECT a.*, d.name as doctorName FROM appointments a
       LEFT JOIN doctors d ON a.doctorId = d.id
       ${whereClause}
       ORDER BY a.date DESC, a.createdAt DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const countRow = await dbGet(
      `SELECT COUNT(*) as total FROM appointments a ${whereClause}`,
      params
    );

    res.json({ appointments, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Fetch appointments error:', err);
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
});

// ── GET /api/appointments/:id ────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const appt = await dbGet(
      `SELECT a.*, d.name as doctorName, d.specialty FROM appointments a
       LEFT JOIN doctors d ON a.doctorId = d.id
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    if (req.user.role !== 'admin' && appt.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(appt);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch appointment' });
  }
});

// ── PUT /api/appointments/:id/status ─────────
// Admin: update status (confirm, cancel, complete)
router.put('/:id/status', authenticate, adminOnly, [
  body('status').isIn(['pending', 'confirmed', 'completed', 'cancelled']).withMessage('Invalid status'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const result = await dbRun(
      'UPDATE appointments SET status=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?',
      [req.body.status, req.params.id]
    );
    if (result.changes === 0) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ message: `Appointment ${req.body.status} successfully` });
  } catch (err) {
    res.status(500).json({ message: 'Update failed' });
  }
});

// ── DELETE /api/appointments/:id ─────────────
// Cancel appointment
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const appt = await dbGet('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    if (req.user.role !== 'admin' && appt.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await dbRun('UPDATE appointments SET status="cancelled" WHERE id=?', [req.params.id]);
    res.json({ message: 'Appointment cancelled successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Cancellation failed' });
  }
});

// ── GET /api/appointments/stats/summary ──────
router.get('/stats/summary', authenticate, adminOnly, async (req, res) => {
  try {
    const total = await dbGet('SELECT COUNT(*) as count FROM appointments');
    const pending = await dbGet('SELECT COUNT(*) as count FROM appointments WHERE status="pending"');
    const confirmed = await dbGet('SELECT COUNT(*) as count FROM appointments WHERE status="confirmed"');
    const completed = await dbGet('SELECT COUNT(*) as count FROM appointments WHERE status="completed"');
    const today = new Date().toISOString().split('T')[0];
    const todayCount = await dbGet('SELECT COUNT(*) as count FROM appointments WHERE date=?', [today]);

    res.json({ total: total.count, pending: pending.count, confirmed: confirmed.count, completed: completed.count, today: todayCount.count });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get stats' });
  }
});

module.exports = router;
