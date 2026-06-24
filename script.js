/* ═══════════════════════════════════════════
   MEDICARE HOSPITAL — MAIN.JS
   All frontend interactivity & API calls
═══════════════════════════════════════════ */

const API_BASE = 'http://localhost:5000/api';

// ── CURRENT USER STATE ──────────────────────
let currentUser = JSON.parse(localStorage.getItem('hospital_user') || 'null');
let allDoctors = [];
let displayedDoctors = 8;
let currentFilter = 'all';

// ── INIT ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initCounters();
  initAOS();
  loadDoctors();
  setMinDate();
  updateAuthUI();
});

// ── NAVBAR ──────────────────────────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });
}

function toggleNav() {
  const links = document.getElementById('navLinks');
  links.classList.toggle('open');
}

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ── COUNTER ANIMATION ───────────────────────
function initCounters() {
  const counters = document.querySelectorAll('.stat-num');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));
}

function animateCounter(el) {
  const target = parseInt(el.getAttribute('data-target'));
  const duration = 2000;
  const start = performance.now();
  const update = (time) => {
    const progress = Math.min((time - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// ── AOS (Animate On Scroll) ──────────────────
function initAOS() {
  const els = document.querySelectorAll('[data-aos]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const delay = e.target.getAttribute('data-aos-delay') || 0;
        setTimeout(() => e.target.classList.add('aos-animate'), parseInt(delay));
      }
    });
  }, { threshold: 0.15 });
  els.forEach(el => observer.observe(el));
}

// ── DATE MIN ────────────────────────────────
function setMinDate() {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('apptDate');
  if (dateInput) dateInput.min = today;
}

// ── DOCTORS ─────────────────────────────────
const doctorSampleData = [
  { id: 1, name: 'Dr. Arjun Mehta', specialty: 'Cardiology', dept: 'cardiology', exp: '18 years experience', rating: '★★★★★ 4.9', emoji: '👨‍⚕️', available: true },
  { id: 2, name: 'Dr. Anjali Tiwari', specialty: 'Neurology', dept: 'neurology', exp: '15 years experience', rating: '★★★★★ 4.8', emoji: '👩‍⚕️', available: true },
  { id: 3, name: 'Dr. Rahul Singh', specialty: 'Orthopedics', dept: 'orthopedics', exp: '12 years experience', rating: '★★★★☆ 4.7', emoji: '👨‍⚕️', available: false },
  { id: 4, name: 'Dr. Jiya', specialty: 'Pediatrics', dept: 'pediatrics', exp: '20 years experience', rating: '★★★★★ 4.9', emoji: '👩‍⚕️', available: true },
  { id: 5, name: 'Dr. Vikram Joshi', specialty: 'Cardiology', dept: 'cardiology', exp: '22 years experience', rating: '★★★★★ 5.0', emoji: '👨‍⚕️', available: true },
  { id: 6, name: 'Dr. Shweta', specialty: 'Neurology', dept: 'neurology', exp: '10 years experience', rating: '★★★★☆ 4.6', emoji: '👩‍⚕️', available: true },
  { id: 7, name: 'Dr. Sanjay Rao', specialty: 'Orthopedics', dept: 'orthopedics', exp: '14 years experience', rating: '★★★★★ 4.8', emoji: '👨‍⚕️', available: true },
  { id: 8, name: 'Dr. Nisha Sinha', specialty: 'Pediatrics', dept: 'pediatrics', exp: '8 years experience', rating: '★★★★☆ 4.5', emoji: '👩‍⚕️', available: false },
  { id: 9, name: 'Dr. Deepak Kumar', specialty: 'Oncology', dept: 'oncology', exp: '16 years experience', rating: '★★★★★ 4.9', emoji: '👨‍⚕️', available: true },
  { id: 10, name: 'Dr. Amrita Singh', specialty: 'Ophthalmology', dept: 'ophthalmology', exp: '11 years experience', rating: '★★★★☆ 4.7', emoji: '👩‍⚕️', available: true },
  { id: 11, name: 'Dr. Arun Verma', specialty: 'Cardiology', dept: 'cardiology', exp: '19 years experience', rating: '★★★★★ 4.8', emoji: '👨‍⚕️', available: true },
  { id: 12, name: 'Dr. Dipti Mishra', specialty: 'Neurology', dept: 'neurology', exp: '13 years experience', rating: '★★★★☆ 4.6', emoji: '👩‍⚕️', available: true },
];

async function loadDoctors() {
  try {
    const res = await fetch(`${API_BASE}/doctors`);
    if (res.ok) {
      allDoctors = await res.json();
    } else {
      allDoctors = doctorSampleData;
    }
  } catch {
    allDoctors = doctorSampleData; // Fallback to sample data
  }
  renderDoctors();
}

function renderDoctors() {
  const grid = document.getElementById('doctorsGrid');
  if (!grid) return;

  const filtered = currentFilter === 'all'
    ? allDoctors
    : allDoctors.filter(d => d.dept === currentFilter);

  const toShow = filtered.slice(0, displayedDoctors);

  grid.innerHTML = toShow.map(doc => `
    <div class="doctor-card" data-dept="${doc.dept}">
      <div class="doctor-img">${doc.emoji || '👨‍⚕️'}</div>
      <div class="doctor-info">
        <h4>${doc.name}</h4>
        <div class="doctor-specialty">${doc.specialty}</div>
        <div class="doctor-exp">${doc.exp}</div>
        <div class="doctor-rating">${doc.rating}</div>
        <div style="margin-bottom:12px">
          <span style="font-size:0.78rem;padding:3px 10px;border-radius:40px;
            background:${doc.available ? '#dcfce7' : '#fee2e2'};
            color:${doc.available ? '#16a34a' : '#dc2626'}">
            ${doc.available ? '● Available' : '● Unavailable'}
          </span>
        </div>
        <button class="doctor-book-btn" onclick="bookWithDoctor('${doc.name}', '${doc.specialty}')">
          Book Appointment
        </button>
      </div>
    </div>
  `).join('');
}

function filterDoctors(dept, btn) {
  currentFilter = dept;
  displayedDoctors = 8;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDoctors();
}

function loadMoreDoctors() {
  displayedDoctors += 4;
  renderDoctors();
}

function bookWithDoctor(name, specialty) {
  document.getElementById('apptDept').value = specialty;
  scrollTo('appointment');
  showToast(`Booking with ${name}`, 'success');
}

// ── APPOINTMENT ─────────────────────────────
async function bookAppointment() {
  const name = document.getElementById('apptName').value.trim();
  const phone = document.getElementById('apptPhone').value.trim();
  const email = document.getElementById('apptEmail').value.trim();
  const dept = document.getElementById('apptDept').value;
  const date = document.getElementById('apptDate').value;
  const time = document.getElementById('apptTime').value;
  const note = document.getElementById('apptNote').value.trim();

  if (!name || !phone || !dept || !date) {
    showToast('Please fill all required fields (*)', 'error');
    return;
  }

  if (!/^[\+]?[0-9]{10,14}$/.test(phone.replace(/\s/g, ''))) {
    showToast('Please enter a valid phone number', 'error');
    return;
  }

  const btn = event.target;
  btn.textContent = 'Booking...';
  btn.disabled = true;

  const payload = { name, phone, email, department: dept, date, time, note, userId: currentUser?.id };

  try {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      showSuccess('Appointment Booked!', `Your appointment on ${date} for ${dept} has been confirmed. Ref #${data.id || 'MCH' + Date.now()}`);
      clearApptForm();
    } else {
      const err = await res.json();
      showToast(err.message || 'Booking failed. Please try again.', 'error');
    }
  } catch {
    // API unavailable — simulate success for demo
    showSuccess('Appointment Booked!', `Your appointment on ${date} for ${dept} has been confirmed. Reference #MCH${Date.now().toString().slice(-6)}`);
    clearApptForm();
  } finally {
    btn.textContent = 'Confirm Appointment';
    btn.disabled = false;
  }
}

function clearApptForm() {
  ['apptName','apptPhone','apptEmail','apptNote'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['apptDept','apptTime','apptDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ── CONTACT FORM ────────────────────────────
async function sendContact() {
  const name = document.getElementById('ctName').value.trim();
  const email = document.getElementById('ctEmail').value.trim();
  const subject = document.getElementById('ctSubject').value.trim();
  const message = document.getElementById('ctMessage').value.trim();

  if (!name || !email || !message) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address', 'error');
    return;
  }

  try {
    await fetch(`${API_BASE}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, subject, message })
    });
  } catch {}

  showSuccess('Message Sent!', "Thank you for reaching out. Our team will respond within 24 hours.");
  ['ctName','ctEmail','ctSubject','ctMessage'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ── AUTH ─────────────────────────────────────
async function loginUser() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPass').value;

  if (!email || !password) { showToast('Enter email and password', 'error'); return; }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      localStorage.setItem('hospital_user', JSON.stringify(currentUser));
      localStorage.setItem('hospital_token', data.token);
      closeModal('loginModal');
      updateAuthUI();
      showToast(`Welcome back, ${currentUser.firstName}!`, 'success');
    } else {
      const err = await res.json();
      showToast(err.message || 'Invalid credentials', 'error');
    }
  } catch {
    // Demo mode
    currentUser = { id: 1, firstName: 'Demo', lastName: 'User', email };
    localStorage.setItem('hospital_user', JSON.stringify(currentUser));
    closeModal('loginModal');
    updateAuthUI();
    showToast('Logged in (Demo Mode)', 'success');
  }
}

async function registerUser() {
  const first = document.getElementById('regFirst').value.trim();
  const last = document.getElementById('regLast').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const pass = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;

  if (!first || !last || !email || !pass) { showToast('Please fill all fields', 'error'); return; }
  if (pass !== pass2) { showToast('Passwords do not match', 'error'); return; }
  if (pass.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: first, lastName: last, email, phone, password: pass })
    });

    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      localStorage.setItem('hospital_user', JSON.stringify(currentUser));
      localStorage.setItem('hospital_token', data.token);
      closeModal('loginModal');
      updateAuthUI();
      showToast(`Account created! Welcome, ${first}!`, 'success');
    } else {
      const err = await res.json();
      showToast(err.message || 'Registration failed', 'error');
    }
  } catch {
    // Demo mode
    currentUser = { id: Date.now(), firstName: first, lastName: last, email };
    localStorage.setItem('hospital_user', JSON.stringify(currentUser));
    closeModal('loginModal');
    updateAuthUI();
    showToast(`Account created! Welcome, ${first}!`, 'success');
  }
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem('hospital_user');
  localStorage.removeItem('hospital_token');
  updateAuthUI();
  showToast('Logged out successfully', 'success');
}

function updateAuthUI() {
  const loginBtn = document.querySelector('.btn-login');
  if (!loginBtn) return;
  if (currentUser) {
    loginBtn.textContent = `👤 ${currentUser.firstName}`;
    loginBtn.onclick = () => {
      if (confirm(`Logged in as ${currentUser.firstName} ${currentUser.lastName || ''}. Logout?`)) logoutUser();
    };
  } else {
    loginBtn.textContent = 'Login / Register';
    loginBtn.onclick = () => openModal('loginModal');
  }
}

// ── MODAL HELPERS ────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

function closeModalOuter(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

// ── SUCCESS MODAL ────────────────────────────
function showSuccess(title, msg) {
  document.getElementById('successTitle').textContent = title;
  document.getElementById('successMsg').textContent = msg;
  openModal('successModal');
}

// ── TOAST ────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── EMERGENCY ────────────────────────────────
function callEmergency() {
  if (confirm('🚨 Call Emergency Services?\n\nThis will dial: +91-7500-000-999')) {
    window.location.href = 'tel:+917500000999';
  }
}

// ── KEYBOARD SHORTCUTS ───────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
});

// ── SMOOTH SCROLL for nav links ──────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
      document.getElementById('navLinks').classList.remove('open');
    }
  });
});
