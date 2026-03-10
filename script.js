/* ============================================================
   script.js — School Hub ✧
   All interactivity: tasks, countdown, sidebar, filters
   ============================================================ */

/* ─── Storage Keys ───────────────────────────────────────── */
const STORAGE_KEY = 'schoolhub-tasks-v1';
const CD_KEY      = 'schoolhub-countdown-v1';

/* ─── App State ──────────────────────────────────────────── */
let tasks  = loadTasks();
let filter = 'all';

/* ─── DOM References ─────────────────────────────────────── */
const taskNameEl      = document.getElementById('task-name');
const taskDateEl      = document.getElementById('task-date');
const urgentCheck     = document.getElementById('urgent-check');
const btnAdd          = document.getElementById('btn-add');
const taskListEl      = document.getElementById('task-list');
const filterBtns      = document.querySelectorAll('.filter-btn');
const statTotal       = document.getElementById('stat-total');
const statPending     = document.getElementById('stat-pending');
const statDone        = document.getElementById('stat-done');
const statUrgent      = document.getElementById('stat-urgent');
const visibleCount    = document.getElementById('visible-count');
const hamburger       = document.getElementById('hamburger');
const sidebar         = document.getElementById('sidebar');
const overlay         = document.getElementById('overlay');

// Countdown elements
const countdownBadge   = document.getElementById('countdown-badge');
const countdownPopover = document.getElementById('countdown-popover');
const cdLabelInput     = document.getElementById('cd-label');
const cdDateInput      = document.getElementById('cd-date');
const cdSaveBtn        = document.getElementById('cd-save');
const cdCancelBtn      = document.getElementById('cd-cancel');


/* ============================================================
   TASK STORAGE
   ============================================================ */

/** Load tasks array from localStorage */
function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

/** Persist tasks array to localStorage */
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}


/* ============================================================
   ADD / TOGGLE / DELETE TASKS
   ============================================================ */

/** Validate input, create a task object, save and re-render */
function addTask() {
  const name = taskNameEl.value.trim();

  // Highlight empty input
  if (!name) {
    taskNameEl.focus();
    taskNameEl.style.borderColor = '#e8849f';
    setTimeout(() => (taskNameEl.style.borderColor = ''), 800);
    return;
  }

  const task = {
    id:      Date.now(),          // unique numeric ID
    name,
    date:    taskDateEl.value || null,
    urgent:  urgentCheck.checked,
    done:    false,
    created: new Date().toISOString()
  };

  tasks.unshift(task);   // add to top of list
  saveTasks();
  render();

  // Reset form inputs
  taskNameEl.value    = '';
  taskDateEl.value    = '';
  urgentCheck.checked = false;
  taskNameEl.focus();
}

/** Flip the done flag for a task by id */
function toggleDone(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    saveTasks();
    render();
  }
}

/** Animate card out then remove task from array */
function deleteTask(id) {
  const card = taskListEl.querySelector(`[data-id="${id}"]`);
  if (card) {
    card.classList.add('removing');
    card.addEventListener('animationend', () => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      render();
    }, { once: true });
  }
}

// Expose functions globally so inline onclick handlers in the
// dynamically-rendered task cards can call them
window.toggleDone  = toggleDone;
window.deleteTask  = deleteTask;

/* ============================================================
   DUE DATE HELPER
   ============================================================ */

/**
 * Returns a display label and a CSS class based on how far away
 * the due date is from today.
 * @param {string|null} dateStr  — YYYY-MM-DD or null
 * @returns {{ label: string, cls: string }}
 */
function dueDateInfo(dateStr) {
  if (!dateStr) return { label: '', cls: '' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due      = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays < 0)
    return { label: `Overdue by ${Math.abs(diffDays)}d`, cls: 'overdue' };
  if (diffDays === 0)
    return { label: 'Due today!', cls: 'today' };
  if (diffDays <= 3)
    return { label: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`, cls: 'soon' };

  return {
    label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    cls: ''
  };
}


/* ============================================================
   RENDER
   ============================================================ */

/** Re-draw the entire task list and update all stat counters */
function render() {
  // Apply current filter
  const visible = tasks.filter(t => {
    if (filter === 'pending') return !t.done;
    if (filter === 'done')    return t.done;
    return true;
  });

  // Update stat chips
  const total  = tasks.length;
  const done   = tasks.filter(t => t.done).length;
  const urgent = tasks.filter(t => t.urgent && !t.done).length;

  statTotal.textContent    = total;
  statPending.textContent  = total - done;
  statDone.textContent     = done;
  statUrgent.textContent   = urgent;
  visibleCount.textContent = `${visible.length} task${visible.length !== 1 ? 's' : ''}`;

  // Empty state messages per filter
  if (visible.length === 0) {
    const msgs = {
      all:     ['🌸', 'No tasks yet — add one above!'],
      pending: ['✅', 'All caught up! Nothing left to submit.'],
      done:    ['📭', 'No completed tasks yet. Keep going!']
    };
    const [icon, msg] = msgs[filter];
    taskListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <p>${msg}</p>
      </div>`;
    return;
  }

  // Build task card HTML
  taskListEl.innerHTML = visible.map(task => {
    const due = dueDateInfo(task.date);

    const dueHTML = task.date
      ? `<span class="task-due ${due.cls}">📅 ${due.label}</span>`
      : `<span class="task-due" style="opacity:0.4;">No due date</span>`;

    const urgentBadge = task.urgent
      ? `<span class="badge-urgent">Urgent</span>`
      : '';

    return `
      <div class="task-card ${task.done ? 'done' : ''}" data-id="${task.id}">
        <input
          type="checkbox"
          class="task-check"
          ${task.done ? 'checked' : ''}
          onchange="toggleDone(${task.id})"
          aria-label="Mark complete"
        />
        <div class="task-body">
          <div class="task-name-row">
            <span class="task-name">${escapeHTML(task.name)}</span>
            ${urgentBadge}
          </div>
          ${dueHTML}
        </div>
        <button
          class="btn-delete"
          onclick="deleteTask(${task.id})"
          aria-label="Delete task"
          title="Delete"
        >✕</button>
      </div>`;
  }).join('');
}


/* ============================================================
   FILTER BUTTONS
   ============================================================ */
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filter = btn.dataset.filter;
    render();
  });
});


/* ============================================================
   ADD TASK EVENT LISTENERS
   ============================================================ */
btnAdd.addEventListener('click', addTask);
taskNameEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});


/* ============================================================
   COUNTDOWN — user-editable, stored in localStorage
   ============================================================ */

/** Load saved countdown config from localStorage */
function loadCountdown() {
  try {
    return JSON.parse(localStorage.getItem(CD_KEY)) || null;
  } catch {
    return null;
  }
}

/** Persist countdown config to localStorage */
function saveCountdown(label, date) {
  localStorage.setItem(CD_KEY, JSON.stringify({ label, date }));
}

/** Pick an emoji icon based on keywords in the break label */
function getCountdownIcon(label) {
  const lbl = (label || '').toLowerCase();
  if (lbl.includes('winter') || lbl.includes('snow') || lbl.includes('christmas')) return '❄️';
  if (lbl.includes('summer') || lbl.includes('beach') || lbl.includes('vacation'))  return '☀️';
  if (lbl.includes('spring'))                                                        return '🌸';
  if (lbl.includes('fall')   || lbl.includes('autumn'))                              return '🍂';
  if (lbl.includes('graduation') || lbl.includes('grad'))                            return '🎉';
  return '📅';
}

/** Recalculate and display the countdown badge text */
function updateCountdown() {
  const cd     = loadCountdown();
  const textEl = document.getElementById('countdown-text');
  const iconEl = document.getElementById('countdown-icon');

  if (!cd || !cd.date) {
    textEl.textContent = 'Set a break date →';
    iconEl.textContent = '📅';
    return;
  }

  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(cd.date + 'T00:00:00');
  const diff   = Math.round((target - today) / 86400000);

  iconEl.textContent = getCountdownIcon(cd.label);

  if (diff < 0) {
    textEl.textContent = `${cd.label || 'Break'} was ${Math.abs(diff)}d ago`;
  } else if (diff === 0) {
    textEl.textContent = `${cd.label || 'Break'} is today! 🎉`;
  } else {
    textEl.textContent = `${cd.label || 'Break'} — ${diff} day${diff !== 1 ? 's' : ''} left`;
  }
}

// Open / close popover on badge click
countdownBadge.addEventListener('click', e => {
  e.stopPropagation();
  const isOpen = countdownPopover.classList.toggle('open');
  if (isOpen) {
    const cd       = loadCountdown();
    cdLabelInput.value = cd ? cd.label : '';
    cdDateInput.value  = cd ? cd.date  : '';
    cdLabelInput.focus();
  }
});

// Close popover when clicking outside
document.addEventListener('click', e => {
  if (!countdownPopover.contains(e.target) && e.target !== countdownBadge) {
    countdownPopover.classList.remove('open');
  }
});

// Save button
cdSaveBtn.addEventListener('click', () => {
  const label = cdLabelInput.value.trim() || 'Break';
  const date  = cdDateInput.value;

  if (!date) {
    cdDateInput.style.borderColor = '#e8849f';
    setTimeout(() => (cdDateInput.style.borderColor = ''), 800);
    cdDateInput.focus();
    return;
  }

  saveCountdown(label, date);
  updateCountdown();
  countdownPopover.classList.remove('open');
});

// Cancel button
cdCancelBtn.addEventListener('click', () => {
  countdownPopover.classList.remove('open');
});

// Keyboard shortcuts inside popover
cdLabelInput.addEventListener('keydown', e => { if (e.key === 'Enter') cdDateInput.focus(); });
cdDateInput.addEventListener('keydown',  e => { if (e.key === 'Enter') cdSaveBtn.click(); });

// Init countdown display
updateCountdown();


/* ============================================================
   SIDEBAR TOGGLE (mobile)
   ============================================================ */
hamburger.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
});

overlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
});

// Highlight active nav link + close sidebar on mobile tap
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', function () {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    this.classList.add('active');
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
});


/* ============================================================
   SECURITY HELPER
   ============================================================ */

/**
 * Escape user-supplied strings before injecting into innerHTML
 * to prevent XSS attacks.
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}


/* ============================================================
   INIT
   ============================================================ */
render();