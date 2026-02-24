// --- Elements ---
const timeDisplay = document.getElementById('time-display');
const dateDisplay = document.getElementById('date-display');
const zenToggle = document.getElementById('zen-toggle');
const proModeToggle = document.getElementById('pro-mode-toggle');
const proSection = document.getElementById('pro-section');

// Setting Panel Elements
const settingsToggle = document.getElementById('settings-toggle');
const settingsPanel = document.getElementById('settings-panel');
const settingsOverlay = document.getElementById('settings-overlay');
const closeSettings = document.getElementById('close-settings');

// --- Settings & Customization ---
const root = document.documentElement;
const colorBtns = document.querySelectorAll('.color-btn');
const fontPicker = document.getElementById('font-picker');

const savedColor = localStorage.getItem('focusAccent') || '#ffffff';
const savedFont = localStorage.getItem('focusFont') || "'Inter', sans-serif";

root.style.setProperty('--accent', savedColor);
root.style.setProperty('--font-primary', savedFont);
fontPicker.value = savedFont;

// Open Settings Modal
settingsToggle.addEventListener('click', () => {
    settingsPanel.classList.add('active');
    settingsOverlay.classList.add('active');
});

// Close Settings Modal
function closeSettingsModal() {
    settingsPanel.classList.remove('active');
    settingsOverlay.classList.remove('active');
}

closeSettings.addEventListener('click', closeSettingsModal);
settingsOverlay.addEventListener('click', closeSettingsModal);

colorBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const color = e.target.getAttribute('data-color');
        root.style.setProperty('--accent', color);
        localStorage.setItem('focusAccent', color);
    });
});

fontPicker.addEventListener('change', (e) => {
    root.style.setProperty('--font-primary', e.target.value);
    localStorage.setItem('focusFont', e.target.value);
});

// --- Main Clock ---
function updateClock() {
    const now = new Date();
    timeDisplay.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    dateDisplay.textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}
setInterval(updateClock, 1000);
updateClock();

// --- Zen Mode ---
zenToggle.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
});

proModeToggle.addEventListener('click', () => {
    proSection.classList.toggle('active');
    proModeToggle.textContent = proSection.classList.contains('active') ? 'Disable Pro Mode' : 'Enable Pro Mode';
});

// --- CUSTOM TIMER DURATIONS ---
let customTimes = {
    focus: parseInt(localStorage.getItem('customFocus')) || 25,
    short: parseInt(localStorage.getItem('customShort')) || 5,
    long: parseInt(localStorage.getItem('customLong')) || 15
};

document.getElementById('focus-input').value = customTimes.focus;
document.getElementById('short-input').value = customTimes.short;
document.getElementById('long-input').value = customTimes.long;

['focus', 'short', 'long'].forEach(mode => {
    document.getElementById(`${mode}-input`).addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        if (val > 0) {
            customTimes[mode] = val;
            localStorage.setItem(`custom${mode.charAt(0).toUpperCase() + mode.slice(1)}`, val);
            
            // Update immediately if modifying the current mode and timer is paused
            if (currentMode === mode && !isPomoRunning) {
                pomoDuration = val * 60;
                pomoTimeLeft = pomoDuration;
                updatePomoDisplay();
            }
        }
    });
});

// --- Pomodoro State ---
let currentMode = 'focus';
let pomoDuration = customTimes.focus * 60;
let pomoTimeLeft = pomoDuration;
let pomoInterval;
let isPomoRunning = false;
let sessionCount = parseInt(localStorage.getItem('focusSessions')) || 0;

const pomoDisplay = document.getElementById('pomo-time');
const pomoStartBtn = document.getElementById('pomo-start');
const pomoResetBtn = document.getElementById('pomo-reset');
const modeBtns = document.querySelectorAll('.mode-btn');
const sessionCountDisplay = document.getElementById('session-count');

sessionCountDisplay.textContent = `Sessions: ${sessionCount}`;

function playChime() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1);
    
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 1);
}

function updatePomoDisplay() {
    pomoDisplay.textContent = `${String(Math.floor(pomoTimeLeft / 60)).padStart(2, '0')}:${String(pomoTimeLeft % 60).padStart(2, '0')}`;
}

modeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        modeBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        currentMode = e.target.getAttribute('data-mode');
        pomoDuration = customTimes[currentMode] * 60;
        
        clearInterval(pomoInterval);
        isPomoRunning = false;
        pomoStartBtn.textContent = 'Start';
        pomoTimeLeft = pomoDuration;
        updatePomoDisplay();
    });
});

pomoStartBtn.addEventListener('click', () => {
    if (isPomoRunning) {
        clearInterval(pomoInterval);
        pomoStartBtn.textContent = 'Resume';
    } else {
        pomoInterval = setInterval(() => {
            if (pomoTimeLeft > 0) {
                pomoTimeLeft--;
                updatePomoDisplay();
            } else {
                clearInterval(pomoInterval);
                playChime();
                
                if (currentMode === 'focus') {
                    sessionCount++;
                    localStorage.setItem('focusSessions', sessionCount);
                    sessionCountDisplay.textContent = `Sessions: ${sessionCount}`;
                }
                
                pomoStartBtn.textContent = 'Start';
                pomoTimeLeft = pomoDuration;
                updatePomoDisplay();
            }
        }, 1000);
        pomoStartBtn.textContent = 'Pause';
    }
    isPomoRunning = !isPomoRunning;
});

pomoResetBtn.addEventListener('click', () => {
    clearInterval(pomoInterval);
    isPomoRunning = false;
    pomoTimeLeft = pomoDuration;
    updatePomoDisplay();
    pomoStartBtn.textContent = 'Start';
});

updatePomoDisplay();

// --- Tasks Logic ---
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
let tasks = JSON.parse(localStorage.getItem('simpleClockTasks')) || [];

function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${task}</span><button onclick="deleteTask(${index})" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.1rem;">✕</button>`;
        taskList.appendChild(li);
    });
    localStorage.setItem('simpleClockTasks', JSON.stringify(tasks));
}

taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (taskInput.value.trim()) {
        tasks.push(taskInput.value.trim());
        taskInput.value = '';
        renderTasks();
    }
});

window.deleteTask = function(index) {
    tasks.splice(index, 1);
    renderTasks();
}
renderTasks();