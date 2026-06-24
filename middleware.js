// ═══════════════════════════════════════════
// MEDICARE HOSPITAL — middleware/auth.js
// JWT Authentication Middleware
// ═══════════════════════════════════════════
 
const jwt = require('jsonwebtoken');
const { dbGet } = require('../database');
 
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
 
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
 
    const user = await dbGet('SELECT id, firstName, lastName, email, role FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(401).json({ message: 'Invalid token. User not found.' });
 
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expired. Please login again.' });
    return res.status(401).json({ message: 'Invalid token.' });
  }
};
 
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};
 
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await dbGet('SELECT id, firstName, lastName, email, role FROM users WHERE id = ?', [decoded.id]);
    }
  } catch {}
  next();
};
 
module.exports = { authenticate, adminOnly, optionalAuth };