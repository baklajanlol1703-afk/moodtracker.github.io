/**
 * MoodTracker — Auth Module
 * Handles login, registration, and session management via localStorage.
 */

const USERS_KEY       = 'moodtracker_users';
const CURRENT_USER_KEY = 'moodtracker_current_user';

/* ── Data helpers ─────────────────────────────── */
function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  return localStorage.getItem(CURRENT_USER_KEY);
}

function setCurrentUser(email) {
  localStorage.setItem(CURRENT_USER_KEY, email);
}

/* ── Auth logic ───────────────────────────────── */
function login(email, password) {
  const users = getUsers();
  return users.find(u => u.email === email.toLowerCase().trim() && u.password === password) || null;
}

function register(email, password) {
  const users = getUsers();
  const emailNorm = email.toLowerCase().trim();
  if (users.find(u => u.email === emailNorm)) {
    return { success: false, error: 'Пользователь с таким email уже существует.' };
  }
  users.push({ email: emailNorm, password });
  saveUsers(users);
  return { success: true };
}

/* ── Validation ───────────────────────────────── */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validatePassword(pw) {
  return pw.length >= 6;
}

/* ── DOM helpers ──────────────────────────────── */
function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.classList.add('is-invalid');
  const fb = input.parentElement.querySelector('.invalid-feedback');
  if (fb) fb.textContent = message;
}

function clearErrors(formEl) {
  formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  formEl.querySelectorAll('.form-error-alert').forEach(el => el.remove());
}

function showFormAlert(formEl, message) {
  const existing = formEl.querySelector('.form-error-alert');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.className = 'alert form-error-alert mt-3 mb-0 rounded-3 py-2 px-3';
  div.innerHTML = `<i class="bi bi-exclamation-circle me-2"></i>${message}`;
  formEl.appendChild(div);
}

/* ── Toggle password visibility ───────────────── */
function initPasswordToggles() {
  document.querySelectorAll('[data-toggle-pw]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.togglePw);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = input.type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
      }
    });
  });
}

/* ── Tab switching via URL param ──────────────── */
function initTabFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('tab') === 'register') {
    const tab = document.getElementById('register-tab');
    if (tab) bootstrap.Tab.getOrCreateInstance(tab).show();
  }
}

/* ── Login form ───────────────────────────────── */
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    clearErrors(form);

    const email    = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    let valid = true;

    if (!validateEmail(email)) {
      setFieldError('login-email', 'Введите корректный email.');
      valid = false;
    }
    if (!password) {
      setFieldError('login-password', 'Пожалуйста, введите пароль.');
      valid = false;
    }
    if (!valid) return;

    const user = login(email, password);
    if (user) {
      setCurrentUser(user.email);
      window.location.href = 'dashboard.html';
    } else {
      showFormAlert(form, 'Неверный email или пароль. Попробуйте ещё раз.');
    }
  });
}

/* ── Register form ────────────────────────────── */
function initRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    clearErrors(form);

    const email    = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;
    let valid = true;

    if (!validateEmail(email)) {
      setFieldError('reg-email', 'Введите корректный email.');
      valid = false;
    }
    if (!validatePassword(password)) {
      setFieldError('reg-password', 'Пароль — минимум 6 символов.');
      valid = false;
    }
    if (password !== confirm) {
      setFieldError('reg-confirm', 'Пароли не совпадают.');
      valid = false;
    }
    if (!valid) return;

    const result = register(email, password);
    if (result.success) {
      setCurrentUser(email.toLowerCase().trim());
      window.location.href = 'dashboard.html';
    } else {
      showFormAlert(form, result.error);
    }
  });
}

/* ── Init ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  if (getCurrentUser()) {
    window.location.href = 'dashboard.html';
    return;
  }

  initTabFromUrl();
  initLoginForm();
  initRegisterForm();
  initPasswordToggles();
});
