// CONFIG
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
// Dev setting: set to true to test "death" quickly
const DEV_MODE = false; 

// STATE
let history = localStorage.getItem('lce_history') || '';
let streak = parseInt(localStorage.getItem('lce_streak') || '0');
let lastWriteTime = localStorage.getItem('lce_last_write') ? parseInt(localStorage.getItem('lce_last_write')) : null;
let isDark = localStorage.getItem('lce_theme') === 'dark';
let timerInterval = null;
let cooldownInterval = null; 

// DOM
const views = {
    newUser: document.getElementById('view-new-user'),
    returning: document.getElementById('view-returning'),
    writing: document.getElementById('view-writing'),
    success: document.getElementById('view-success'),
    failed: document.getElementById('view-failed')
};
const modal = document.getElementById('rules-modal');
const themeMeta = document.getElementById('meta-theme-color');

// INIT
document.addEventListener('DOMContentLoaded', () => {
    // Check system preference if no local storage override
    if (localStorage.getItem('lce_theme') === null && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        isDark = true;
    }
    applyTheme();
    checkVitality();
    
    // Check vitality every minute
    setInterval(checkVitality, 60000);
    
    // Initial routing
    routeView();
});

// FUNCTIONS
function toggleTheme() {
    isDark = !isDark;
    localStorage.setItem('lce_theme', isDark ? 'dark' : 'light');
    applyTheme();
}

function applyTheme() {
    document.body.classList.toggle('dark-mode', isDark);
    document.getElementById('theme-toggle').textContent = isDark ? '☀' : '☾';
    // Update browser UI color for mobile
    themeMeta.content = isDark ? '#111827' : '#ffffff';
}

function toggleModal() {
    modal.classList.toggle('active');
}

function checkVitality() {
    if (!lastWriteTime) return;
    const now = new Date().getTime();
    const diff = now - lastWriteTime;
    
    // 48 hours death rule
    const deathThreshold = DEV_MODE ? 60000 : (ONE_DAY_MS * 2);

    if (diff > deathThreshold) {
        failSession("The text died of loneliness.");
    }
    // Reload if day passed while page open to show button
    else if (diff >= ONE_DAY_MS && !views.success.classList.contains('hidden')) {
        location.reload(); 
    }
}

function routeView() {
    Object.values(views).forEach(el => el.classList.add('hidden'));
    document.getElementById('main-header').classList.remove('hidden');

    if (document.body.classList.contains('fail-mode')) {
        views.failed.classList.remove('hidden');
        document.getElementById('main-header').classList.add('hidden');
        return;
    }

    // Check Cooldown
    const now = new Date().getTime();
    if (lastWriteTime && (now - lastWriteTime < ONE_DAY_MS)) {
        showSuccess();
        return;
    }

    if (history.length > 0) {
        views.returning.classList.remove('hidden');
        document.getElementById('history-display').textContent = history;
        document.getElementById('streak-display').textContent = streak + 1;
    } else {
        views.newUser.classList.remove('hidden');
    }
}

function startWriting() {
    Object.values(views).forEach(el => el.classList.add('hidden'));
    views.writing.classList.remove('hidden');
    
    const editor = document.getElementById('editor');
    editor.value = '';
    editor.focus();
    
    // Show preview context
    const preview = document.getElementById('history-preview');
    if (history) {
        const words = history.split(' ');
        const snippet = words.slice(-10).join(' ');
        preview.textContent = '... ' + snippet;
        preview.classList.remove('hidden');
    } else {
        preview.classList.add('hidden');
    }

    let timeLeft = 60;
    const timerEl = document.getElementById('timer');
    timerEl.textContent = '00:60';
    timerEl.classList.remove('danger');

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = `00:${timeLeft < 10 ? '0' + timeLeft : timeLeft}`;
        if (timeLeft <= 10) timerEl.classList.add('danger');
        if (timeLeft === 0) {
            clearInterval(timerInterval);
            failSession("Time's up.");
        }
    }, 1000);
}

// ZEN MODE
document.getElementById('editor').addEventListener('focus', () => {
    document.body.classList.add('zen-active');
});

// Detect blur to maybe remove zen mode, but usually keep it until saved
document.getElementById('editor').addEventListener('blur', () => {
    // Optional: remove zen on blur? 
    // document.body.classList.remove('zen-active');
});

function saveSession(sentence) {
    clearInterval(timerInterval);
    document.body.classList.remove('zen-active');

    // Simple formatting fix: ensure space before appending
    history = history ? `${history} ${sentence}` : sentence;
    streak++;
    lastWriteTime = new Date().getTime();

    localStorage.setItem('lce_history', history);
    localStorage.setItem('lce_streak', streak);
    localStorage.setItem('lce_last_write', lastWriteTime);

    showSuccess();
}

function showSuccess() {
    Object.values(views).forEach(el => el.classList.add('hidden'));
    views.success.classList.remove('hidden');
    
    document.getElementById('success-streak').textContent = streak;
    document.getElementById('full-text-display').textContent = history;
    
    // Scroll history to bottom
    const historyCard = document.querySelector('.card-history');
    if(historyCard) historyCard.scrollTop = historyCard.scrollHeight;

    startCooldownTimer();
}

function startCooldownTimer() {
    const timerEl = document.getElementById('next-session-timer');
    clearInterval(cooldownInterval);
    
    const updateTimer = () => {
        const now = new Date().getTime();
        const nextTime = lastWriteTime + ONE_DAY_MS;
        const diff = nextTime - now;

        if (diff <= 0) {
            timerEl.textContent = "Ready now";
            clearInterval(cooldownInterval);
            // Optionally reload or show button
        } else {
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            timerEl.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    };
    
    updateTimer();
    cooldownInterval = setInterval(updateTimer, 1000);
}

function failSession(reason) {
    clearInterval(timerInterval);
    clearInterval(cooldownInterval);
    document.body.classList.remove('zen-active');
    
    localStorage.removeItem('lce_history');
    localStorage.removeItem('lce_streak');
    localStorage.removeItem('lce_last_write');
    // keep theme preference
    
    history = '';
    streak = 0;
    lastWriteTime = null;

    document.body.classList.add('fail-mode');
    document.getElementById('main-header').classList.add('hidden');
    Object.values(views).forEach(el => el.classList.add('hidden'));
    views.failed.classList.remove('hidden');
    document.getElementById('fail-reason').textContent = reason || "You need a new chance.";
}

// EVENTS
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
document.getElementById('info-toggle').addEventListener('click', toggleModal);
document.getElementById('close-modal').addEventListener('click', toggleModal);

document.getElementById('btn-compose-new').addEventListener('click', startWriting);
document.getElementById('btn-continue').addEventListener('click', startWriting);

document.getElementById('editor').addEventListener('input', (e) => {
    const val = e.target.value;
    // Check for sentence enders
    if (/[.!?]$/.test(val.trim())) {
        saveSession(val.trim());
    }
});

document.getElementById('editor').addEventListener('paste', (e) => {
    e.preventDefault();
    alert("No pasting. Write it yourself.");
});

document.getElementById('btn-reset-fail').addEventListener('click', () => {
    document.body.classList.remove('fail-mode');
    location.reload();
});

// Prevent accidentally leaving?
window.onbeforeunload = function() {
    if (!views.writing.classList.contains('hidden')) {
        return "Timer is running. Are you sure?";
    }
};