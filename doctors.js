/ ═══════════════════════════════════════════
// MEDICARE HOSPITAL — routes/doctors.js
// Doctor CRUD Routes
// ═══════════════════════════════════════════
 
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { dbRun, dbGet, dbAll } = require('../database');
const { authenticate, adminOnly } = require('../middleware/auth');
 
// ── GET /api/doctors ─────────────────────────
// Public: Get all doctors (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { dept, available, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
 
    let where = 'WHERE 1=1';
    let params = [];
 
    if (dept) { where += ' AND LOWER(dept) = LOWER(?)'; params.push(dept); }
    if (available !== undefined) { where += ' AND available = ?'; params.push(parseInt(available)); }
    if (search) {
      where += ' AND (LOWER(name) LIKE ? OR LOWER(specialty) LIKE ?)';
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }
 
    const doctors = await dbAll(
      `SELECT * FROM doctors ${where} ORDER BY rating DESC, name ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
 
    const countRow = await dbGet(`SELECT COUNT(*) as total FROM doctors ${where}`, params);
 
    res.json(doctors);
  } catch (err) {
    console.error('Fetch doctors error:', err);
    res.status(500).json({ message: 'Failed to fetch doctors' });
  }
});
 
// ── GET /api/doctors/:id ─────────────────────
router.get('/:id', async (req, res) => {
  try {
    const doctor = await dbGet('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch doctor' });
  }
});
 
// ── GET /api/doctors/:id/slots ───────────────
// Get available time slots for a doctor on a given date
router.get('/:id/slots', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });
 
    const allSlots = [
      '09:00 AM - 10:00 AM',
      '10:00 AM - 11:00 AM',
      '11:00 AM - 12:00 PM',
      '02:00 PM - 03:00 PM',
      '03:00 PM - 04:00 PM',
      '04:00 PM - 05:00 PM',
    ];
 
    const bookedSlots = await dbAll(
      'SELECT time FROM appointments WHERE doctorId=? AND date=? AND status != "cancelled"',
      [req.params.id, date]
    );
 
    const bookedTimes = bookedSlots.map(b => b.time);
    const available = allSlots.map(slot => ({
      slot,
      available: !bookedTimes.includes(slot)
    }));
 
    res.json({ date, doctorId: req.params.id, slots: available });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get slots' });
  }
});
 
// ── POST /api/doctors ────────────────────────
// Admin only: Add a new doctor
router.post('/', authenticate, adminOnly, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('specialty').trim().notEmpty().withMessage('Specialty is required'),
  body('dept').trim().notEmpty().withMessage('Department is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
 
    const { name, specialty, dept, experience, rating, emoji, available, qualifications, bio, consultationFee } = req.body;
 
    const result = await dbRun(
      `INSERT INTO doctors (name, specialty, dept, experience, rating, emoji, available, qualifications, bio, consultationFee)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, specialty, dept, experience || null, rating || '★★★★☆ 4.5', emoji || '👨‍⚕️',
       available !== undefined ? available : 1, qualifications || null, bio || null, consultationFee || 500]
    );
 
    const doctor = await dbGet('SELECT * FROM doctors WHERE id = ?', [result.id]);
    res.status(201).json({ message: 'Doctor added successfully', doctor });
  } catch (err) {
    console.error('Add doctor error:', err);
    res.status(500).json({ message: 'Failed to add doctor' });
  }
});
 
// ── PUT /api/doctors/:id ─────────────────────
// Admin only: Update doctor
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const doc = await dbGet('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    if (!doc) return res.status(404).json({ message: 'Doctor not found' });
 
    const { name, specialty, dept, experience, rating, emoji, available, qualifications, bio, consultationFee } = req.body;
 
    await dbRun(
      `UPDATE doctors SET name=?, specialty=?, dept=?, experience=?, rating=?, emoji=?,
       available=?, qualifications=?, bio=?, consultationFee=? WHERE id=?`,
      [name || doc.name, specialty || doc.specialty, dept || doc.dept,
       experience || doc.experience, rating || doc.rating, emoji || doc.emoji,
       available !== undefined ? available : doc.available,
       qualifications || doc.qualifications, bio || doc.bio,
       consultationFee || doc.consultationFee, req.params.id]
    );
 
    res.json({ message: 'Doctor updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Update failed' });
  }
});
 
// ── DELETE /api/doctors/:id ──────────────────
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const result = await dbRun('DELETE FROM doctors WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ message: 'Doctor removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Delete failed' });
  }
});
 
module.exports = router;