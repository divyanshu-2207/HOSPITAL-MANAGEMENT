// ═══════════════════════════════════════════
// MEDICARE HOSPITAL — database.js
// SQLite Database Setup & Seed Data
// ═══════════════════════════════════════════

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './hospital.db';

let db;

function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) console.error('DB connection error:', err.message);
      else console.log(`✅ Connected to SQLite database: ${DB_PATH}`);
    });
    db.run('PRAGMA foreign_keys = ON');
    db.run('PRAGMA journal_mode = WAL');
  }
  return db;
}

// Promisify DB methods
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  getDb().run(sql, params, function(err) {
    if (err) reject(err);
    else resolve({ id: this.lastID, changes: this.changes });
  });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  getDb().get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  getDb().all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

// ── CREATE ALL TABLES ────────────────────────
async function initDB() {
  console.log('🔧 Initializing database...');

  // USERS TABLE
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'patient',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // DEPARTMENTS TABLE
  await dbRun(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      headDoctorId INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // DOCTORS TABLE
  await dbRun(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      dept TEXT NOT NULL,
      departmentId INTEGER,
      experience TEXT,
      rating TEXT DEFAULT '★★★★☆ 4.5',
      emoji TEXT DEFAULT '👨‍⚕️',
      available INTEGER DEFAULT 1,
      qualifications TEXT,
      bio TEXT,
      consultationFee REAL DEFAULT 500,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (departmentId) REFERENCES departments(id)
    )
  `);

  // APPOINTMENTS TABLE
  await dbRun(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      department TEXT NOT NULL,
      doctorId INTEGER,
      date TEXT NOT NULL,
      time TEXT,
      note TEXT,
      status TEXT DEFAULT 'pending',
      userId INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (doctorId) REFERENCES doctors(id)
    )
  `);

  // CONTACT MESSAGES TABLE
  await dbRun(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'unread',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // HEALTH PACKAGES TABLE
  await dbRun(`
    CREATE TABLE IF NOT EXISTS health_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      tests TEXT,
      isActive INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // PATIENT RECORDS TABLE
  await dbRun(`
    CREATE TABLE IF NOT EXISTS patient_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      doctorId INTEGER,
      diagnosis TEXT,
      prescription TEXT,
      notes TEXT,
      visitDate DATE DEFAULT CURRENT_DATE,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (doctorId) REFERENCES doctors(id)
    )
  `);

  console.log('✅ All tables created');
  await seedDatabase();
}

// ── SEED DATA ────────────────────────────────
async function seedDatabase() {
  // Check if already seeded
  const existingDepts = await dbGet('SELECT COUNT(*) as count FROM departments');
  if (existingDepts.count > 0) {
    console.log('ℹ️  Database already seeded, skipping...');
    return;
  }

  console.log('🌱 Seeding database...');

  // Seed Departments
  const departments = [
    { name: 'Cardiology', description: 'Heart and cardiovascular care', icon: '❤️' },
    { name: 'Neurology', description: 'Brain and nervous system treatment', icon: '🧠' },
    { name: 'Orthopedics', description: 'Bone, joint and muscle care', icon: '🦴' },
    { name: 'Pediatrics', description: 'Child healthcare from birth to 18', icon: '👶' },
    { name: 'Oncology', description: 'Cancer diagnosis and treatment', icon: '🔬' },
    { name: 'Ophthalmology', description: 'Eye care and vision treatment', icon: '👁️' },
    { name: 'General Medicine', description: 'Primary healthcare and diagnosis', icon: '🏥' },
    { name: 'Pulmonology', description: 'Respiratory and lung disease care', icon: '🫁' },
  ];

  for (const dept of departments) {
    await dbRun('INSERT OR IGNORE INTO departments (name, description, icon) VALUES (?, ?, ?)',
      [dept.name, dept.description, dept.icon]);
  }

  // Seed Doctors
  const doctors = [
    { name: 'Dr. Arjun Mehta', specialty: 'Cardiology', dept: 'cardiology', experience: '18 years experience', rating: '★★★★★ 4.9', emoji: '👨‍⚕️', available: 1, qualifications: 'MBBS, MD (Cardiology), DM', consultationFee: 800 },
    { name: 'Dr. Priya Sharma', specialty: 'Neurology', dept: 'neurology', experience: '15 years experience', rating: '★★★★★ 4.8', emoji: '👩‍⚕️', available: 1, qualifications: 'MBBS, MD (Neurology), DM', consultationFee: 750 },
    { name: 'Dr. Rahul Singh', specialty: 'Orthopedics', dept: 'orthopedics', experience: '12 years experience', rating: '★★★★☆ 4.7', emoji: '👨‍⚕️', available: 0, qualifications: 'MBBS, MS (Ortho)', consultationFee: 600 },
    { name: 'Dr. Sunita Patel', specialty: 'Pediatrics', dept: 'pediatrics', experience: '20 years experience', rating: '★★★★★ 4.9', emoji: '👩‍⚕️', available: 1, qualifications: 'MBBS, MD (Pediatrics)', consultationFee: 500 },
    { name: 'Dr. Vikram Joshi', specialty: 'Cardiology', dept: 'cardiology', experience: '22 years experience', rating: '★★★★★ 5.0', emoji: '👨‍⚕️', available: 1, qualifications: 'MBBS, DM (Cardiology)', consultationFee: 1000 },
    { name: 'Dr. Meena Kapoor', specialty: 'Neurology', dept: 'neurology', experience: '10 years experience', rating: '★★★★☆ 4.6', emoji: '👩‍⚕️', available: 1, qualifications: 'MBBS, MD (Neurology)', consultationFee: 700 },
    { name: 'Dr. Sanjay Rao', specialty: 'Orthopedics', dept: 'orthopedics', experience: '14 years experience', rating: '★★★★★ 4.8', emoji: '👨‍⚕️', available: 1, qualifications: 'MBBS, MS (Ortho), MCh', consultationFee: 650 },
    { name: 'Dr. Anjali Gupta', specialty: 'Pediatrics', dept: 'pediatrics', experience: '8 years experience', rating: '★★★★☆ 4.5', emoji: '👩‍⚕️', available: 0, qualifications: 'MBBS, DCH', consultationFee: 450 },
    { name: 'Dr. Deepak Kumar', specialty: 'Oncology', dept: 'oncology', experience: '16 years experience', rating: '★★★★★ 4.9', emoji: '👨‍⚕️', available: 1, qualifications: 'MBBS, MD (Oncology), DM', consultationFee: 900 },
    { name: 'Dr. Rekha Nair', specialty: 'Ophthalmology', dept: 'ophthalmology', experience: '11 years experience', rating: '★★★★☆ 4.7', emoji: '👩‍⚕️', available: 1, qualifications: 'MBBS, MS (Ophthalmology)', consultationFee: 550 },
    { name: 'Dr. Arun Verma', specialty: 'Cardiology', dept: 'cardiology', experience: '19 years experience', rating: '★★★★★ 4.8', emoji: '👨‍⚕️', available: 1, qualifications: 'MBBS, DM (Cardiology)', consultationFee: 850 },
    { name: 'Dr. Kavita Iyer', specialty: 'Neurology', dept: 'neurology', experience: '13 years experience', rating: '★★★★☆ 4.6', emoji: '👩‍⚕️', available: 1, qualifications: 'MBBS, MD (Neurology)', consultationFee: 720 },
  ];

  for (const doc of doctors) {
    await dbRun(
      `INSERT OR IGNORE INTO doctors (name, specialty, dept, experience, rating, emoji, available, qualifications, consultationFee)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [doc.name, doc.specialty, doc.dept, doc.experience, doc.rating, doc.emoji, doc.available, doc.qualifications, doc.consultationFee]
    );
  }

  // Seed Health Packages
  const packages = [
    { name: 'Basic Health Checkup', description: 'Annual preventive health screening', price: 999, tests: 'CBC, Blood Sugar, Lipid Profile, Urine Routine, ECG' },
    { name: 'Cardiac Care Package', description: 'Complete heart health assessment', price: 2499, tests: '2D Echo, TMT, ECG, Troponin, Lipid Profile, Chest X-Ray' },
    { name: 'Diabetes Care Package', description: 'Comprehensive diabetes management screening', price: 1499, tests: 'HbA1c, FBS, PPBS, Urine Microalbumin, Kidney Function, Eye Exam' },
    { name: 'Women Health Package', description: 'Complete wellness for women', price: 1999, tests: 'CBC, Thyroid, Pap Smear, Mammogram, Bone Density, Hormonal Panel' },
    { name: 'Senior Citizen Package', description: 'Comprehensive screening for 60+', price: 3499, tests: 'Full Body Checkup, ECG, Echo, Pulmonary Function, Neuro Assessment' },
  ];

  for (const pkg of packages) {
    await dbRun(
      'INSERT OR IGNORE INTO health_packages (name, description, price, tests) VALUES (?, ?, ?, ?)',
      [pkg.name, pkg.description, pkg.price, pkg.tests]
    );
  }

  // Create admin user
  const adminPass = await bcrypt.hash('admin123', 10);
  await dbRun(
    `INSERT OR IGNORE INTO users (firstName, lastName, email, phone, password, role)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['Admin', 'Hospital', 'admin@medicare-hospital.in', '+917500000001', adminPass, 'admin']
  );

  console.log('✅ Database seeded successfully!');
  console.log('👤 Admin: admin@medicare-hospital.in / admin123');
}

module.exports = { getDb, dbRun, dbGet, dbAll, initDB };
