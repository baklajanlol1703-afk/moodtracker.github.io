/**
 * MoodTracker — Dashboard Module
 * Manages mood entries, calendar, history, and navigation.
 */

const CURRENT_USER_KEY = 'moodtracker_current_user';
const ENTRIES_KEY      = 'moodtracker_entries';

/* ── Mood config ──────────────────────────────── */
const MOODS = {
  great:    { emoji: '😁', label: 'Отлично',   cssClass: 'great' },
  good:     { emoji: '😊', label: 'Хорошо',    cssClass: 'good' },
  okay:     { emoji: '😐', label: 'Нормально', cssClass: 'okay' },
  bad:      { emoji: '😞', label: 'Плохо',     cssClass: 'bad' },
  terrible: { emoji: '😢', label: 'Ужасно',    cssClass: 'terrible' },
};

const MONTHS_RU   = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const WEEKDAYS_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const MONTHS_GEN  = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const WEEKDAYS_FULL = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];

/* ── State ────────────────────────────────────── */
let selectedMood      = null;
let calendarDate      = new Date();

/* ── Auth ─────────────────────────────────────── */
function getCurrentUser() { return localStorage.getItem(CURRENT_USER_KEY); }
function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  window.location.href = 'index.html';
}

/* ── Entry CRUD ───────────────────────────────── */
function getAllEntries() {
  return JSON.parse(localStorage.getItem(ENTRIES_KEY) || '{}');
}

function getUserEntries(email) {
  return getAllEntries()[email] || {};
}

function saveEntry(email, dateStr, mood, note) {
  const all = getAllEntries();
  if (!all[email]) all[email] = {};
  all[email][dateStr] = { mood, note: note.trim(), timestamp: new Date().toISOString() };
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(all));
}

function deleteEntry(email, dateStr) {
  const all = getAllEntries();
  if (all[email]) {
    delete all[email][dateStr];
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(all));
  }
}

/* ── Date utils ───────────────────────────────── */
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateDisplay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WEEKDAYS_FULL[dt.getDay()]}, ${d} ${MONTHS_GEN[m-1]} ${y}`;
}

function formatDateShort(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTHS_GEN[m-1]} ${y}`;
}

/* ── Navigation ───────────────────────────────── */
const SECTION_TITLES = {
  'section-today':    'Сегодня',
  'section-calendar': 'Календарь',
  'section-history':  'История',
};

function showSection(id) {
  document.querySelectorAll('.dashboard-section').forEach(s => s.classList.add('d-none'));
  const target = document.getElementById(id);
  if (target) target.classList.remove('d-none');

  document.querySelectorAll('.sidebar-nav-item[data-section]').forEach(item => {
    item.classList.toggle('active', item.dataset.section === id);
  });

  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = SECTION_TITLES[id] || '';

  // Close offcanvas on mobile
  const oc = document.getElementById('sidebarOffcanvas');
  if (oc) { const inst = bootstrap.Offcanvas.getInstance(oc); if (inst) inst.hide(); }

  if (id === 'section-today')    renderToday();
  if (id === 'section-calendar') renderCalendar();
  if (id === 'section-history')  renderHistory();
}

/* ── TODAY ────────────────────────────────────── */
function renderToday() {
  const user    = getCurrentUser();
  const entries = getUserEntries(user);
  const today   = getTodayStr();
  const entry   = entries[today];

  // Date display
  const dateEl = document.getElementById('today-date-display');
  if (dateEl) dateEl.textContent = formatDateDisplay(today);

  // Pre-fill if entry exists
  selectedMood = entry ? entry.mood : null;
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.toggle('selected', entry ? btn.dataset.mood === entry.mood : false);
  });

  const noteEl = document.getElementById('today-note');
  if (noteEl) noteEl.value = entry ? (entry.note || '') : '';

  // Saved banner
  const banner = document.getElementById('today-saved-banner');
  if (banner) {
    if (entry) {
      const m = MOODS[entry.mood] || MOODS.okay;
      banner.innerHTML = `<span>${m.emoji}</span> Запись за сегодня сохранена — <strong>${m.label}</strong>`;
      banner.classList.remove('d-none');
    } else {
      banner.classList.add('d-none');
    }
  }

  const saveBtn = document.getElementById('save-today-btn');
  if (saveBtn) saveBtn.textContent = entry ? 'Обновить запись' : 'Сохранить запись';
}

function initTodayHandlers() {
  // Mood buttons
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedMood = btn.dataset.mood;
    });
  });

  // Save button
  const saveBtn = document.getElementById('save-today-btn');
  if (!saveBtn) return;
  saveBtn.addEventListener('click', () => {
    if (!selectedMood) {
      showToast('Выберите настроение', 'Нажмите на один из вариантов настроения выше.', 'warning');
      return;
    }
    const user = getCurrentUser();
    const note = document.getElementById('today-note').value;
    saveEntry(user, getTodayStr(), selectedMood, note);
    renderToday();
    showToast('Сохранено! 🌟', 'Запись за сегодня успешно сохранена.', 'success');
  });
}

/* ── CALENDAR ─────────────────────────────────── */
function renderCalendar() {
  const user    = getCurrentUser();
  const entries = getUserEntries(user);
  const year    = calendarDate.getFullYear();
  const month   = calendarDate.getMonth();
  const today   = getTodayStr();

  const monthTitleEl = document.getElementById('calendar-month-title');
  if (monthTitleEl) monthTitleEl.textContent = `${MONTHS_RU[month]} ${year}`;

  // First weekday of month (Mon=0)
  let startDow = new Date(year, month, 1).getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const grid = document.getElementById('calendar-grid');
  if (!grid) return;

  let html = '';

  // Weekday headers
  WEEKDAYS_RU.forEach(wd => { html += `<div class="calendar-weekday">${wd}</div>`; });

  // Empty leading cells
  for (let i = 0; i < startDow; i++) html += `<div class="calendar-day empty"></div>`;

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const entry   = entries[dateStr];
    const isToday  = dateStr === today;
    const isFuture = dateStr > today;

    let cls = 'calendar-day';
    let inner = `<span class="day-num">${d}</span>`;

    if (isToday)  cls += ' today';
    if (isFuture) cls += ' future';

    if (entry) {
      const m = MOODS[entry.mood] || MOODS.okay;
      cls += ` has-entry ${m.cssClass}`;
      inner = `<span class="day-emoji">${m.emoji}</span><span class="day-num">${d}</span>`;
    }

    const attrs = (entry || isToday) ? `role="button" tabindex="0" data-date="${dateStr}"` : `data-date="${dateStr}"`;
    html += `<div class="${cls}" ${attrs}>${inner}</div>`;
  }

  grid.innerHTML = html;

  // Click handlers
  grid.querySelectorAll('.calendar-day.has-entry').forEach(cell => {
    cell.addEventListener('click', () => openEntryModal(cell.dataset.date));
    cell.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openEntryModal(cell.dataset.date); });
  });

  const todayCell = grid.querySelector('.calendar-day.today');
  if (todayCell) {
    todayCell.addEventListener('click', () => {
      const entry = entries[getTodayStr()];
      if (entry) openEntryModal(getTodayStr());
      else showSection('section-today');
    });
  }
}

function initCalendarHandlers() {
  document.getElementById('calendar-prev')?.addEventListener('click', () => {
    calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById('calendar-next')?.addEventListener('click', () => {
    calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
    renderCalendar();
  });
}

/* ── HISTORY ──────────────────────────────────── */
function renderHistory() {
  const user    = getCurrentUser();
  const entries = getUserEntries(user);
  const container = document.getElementById('history-list');
  if (!container) return;

  const dates = Object.keys(entries).sort((a, b) => b.localeCompare(a));

  if (dates.length === 0) {
    container.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon">📔</div>
        <p class="fw-bold mb-1" style="color:var(--color-text-muted)">Записей пока нет</p>
        <p style="color:var(--color-text-light);font-size:.9rem" class="mb-3">Начните с добавления сегодняшней записи!</p>
        <button class="btn btn-primary" onclick="showSection('section-today')">Добавить запись</button>
      </div>`;
    return;
  }

  container.innerHTML = dates.map(dateStr => {
    const entry = entries[dateStr];
    const m = MOODS[entry.mood] || MOODS.okay;
    return `
      <div class="history-entry" data-date="${dateStr}" role="button" tabindex="0" aria-label="${formatDateDisplay(dateStr)}">
        <div class="history-mood-icon ${m.cssClass}">${m.emoji}</div>
        <div class="history-entry-body">
          <div class="history-entry-date">${formatDateDisplay(dateStr)}</div>
          <div class="history-entry-note" style="${!entry.note ? 'font-style:italic;opacity:.6' : ''}">
            ${entry.note || 'Заметка не добавлена'}
          </div>
        </div>
        <div class="history-mood-label">${m.label}</div>
      </div>`;
  }).join('');

  container.querySelectorAll('.history-entry').forEach(el => {
    el.addEventListener('click', () => openEntryModal(el.dataset.date));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openEntryModal(el.dataset.date); });
  });
}

/* ── ENTRY MODAL ──────────────────────────────── */
function openEntryModal(dateStr) {
  const user    = getCurrentUser();
  const entries = getUserEntries(user);
  const entry   = entries[dateStr];
  if (!entry) return;

  const m = MOODS[entry.mood] || MOODS.okay;

  document.getElementById('modal-date-title').textContent = formatDateDisplay(dateStr);

  // Mood display
  const moodDisplay = document.getElementById('modal-mood-display');
  moodDisplay.style.background = `var(--mood-${m.cssClass}-bg)`;
  document.getElementById('modal-mood-emoji').textContent = m.emoji;
  document.getElementById('modal-mood-label').textContent = m.label;
  document.getElementById('modal-mood-label').style.color = `var(--mood-${m.cssClass})`;
  document.getElementById('modal-mood-date').textContent  = formatDateShort(dateStr);

  // Note
  const noteBox = document.getElementById('modal-note-box');
  noteBox.textContent = entry.note || 'Заметка не добавлена';
  noteBox.style.fontStyle = entry.note ? 'normal' : 'italic';
  noteBox.style.opacity   = entry.note ? '1' : '0.55';

  // Edit button (only for today)
  const editBtn = document.getElementById('modal-edit-btn');
  if (editBtn) {
    if (dateStr === getTodayStr()) {
      editBtn.classList.remove('d-none');
      editBtn.onclick = () => {
        bootstrap.Modal.getInstance(document.getElementById('entryModal'))?.hide();
        showSection('section-today');
      };
    } else {
      editBtn.classList.add('d-none');
    }
  }

  // Delete button
  document.getElementById('modal-delete-btn').onclick = () => {
    if (!confirm(`Удалить запись за ${formatDateDisplay(dateStr)}?`)) return;
    deleteEntry(user, dateStr);
    bootstrap.Modal.getInstance(document.getElementById('entryModal'))?.hide();
    showToast('Запись удалена', `Запись за ${formatDateShort(dateStr)} удалена.`, 'info');
    // Refresh visible section
    const visible = document.querySelector('.dashboard-section:not(.d-none)');
    if (visible?.id === 'section-calendar') renderCalendar();
    if (visible?.id === 'section-history')  renderHistory();
  };

  bootstrap.Modal.getOrCreateInstance(document.getElementById('entryModal')).show();
}

/* ── TOAST ────────────────────────────────────── */
function showToast(title, message, type = 'success') {
  const toastEl = document.getElementById('main-toast');
  if (!toastEl) return;
  const icons = { success: '✅', warning: '⚠️', info: 'ℹ️', error: '❌' };
  document.getElementById('toast-icon').textContent  = icons[type] || '✅';
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-msg').textContent   = message;
  bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3500 }).show();
}

/* ── SIDEBAR USER INFO ────────────────────────── */
function renderSidebarUser() {
  const user = getCurrentUser();
  if (!user) return;
  const initial = user.charAt(0).toUpperCase();

  document.querySelectorAll('.js-user-email').forEach(el => { el.textContent = user; });
  document.querySelectorAll('.js-user-avatar').forEach(el => { el.textContent = initial; });
}

/* ── INIT ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Auth guard
  if (!getCurrentUser()) { window.location.href = 'auth.html'; return; }

  renderSidebarUser();

  // Sidebar nav
  document.querySelectorAll('.sidebar-nav-item[data-section]').forEach(item => {
    item.addEventListener('click', () => showSection(item.dataset.section));
  });

  // Logout buttons
  document.querySelectorAll('.btn-logout').forEach(btn => btn.addEventListener('click', logout));

  // Handlers
  initTodayHandlers();
  initCalendarHandlers();

  // Default view
  showSection('section-today');

  // Update topbar date
  const topbarDateEl = document.getElementById('topbar-date-display');
  if (topbarDateEl) {
    const now = new Date();
    topbarDateEl.textContent = `${now.getDate()} ${MONTHS_GEN[now.getMonth()]} ${now.getFullYear()}`;
  }
});

// Expose showSection globally (used in history empty state button)
window.showSection = showSection;
