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

// --- Volume Control Logic ---
const volumeSlider = document.getElementById('volume-slider');
const volumeLabel = document.getElementById('volume-label');
const testAlarmBtn = document.getElementById('test-alarm-btn');

let alarmVolume = parseFloat(localStorage.getItem('focusVolume'));
if (isNaN(alarmVolume)) alarmVolume = 3.0; 

volumeSlider.value = alarmVolume * 100;
volumeLabel.textContent = `${Math.round(alarmVolume * 100)}%`;

volumeSlider.addEventListener('input', (e) => {
    alarmVolume = e.target.value / 100;
    volumeLabel.textContent = `${e.target.value}%`;
    localStorage.setItem('focusVolume', alarmVolume);
});

// Test button toggles the alarm indefinitely
testAlarmBtn.addEventListener('click', () => {
    if (isAlarmPlaying) {
        stopAlarm();
    } else {
        playAlarm();
    }
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
            
            if (currentMode === mode && !isPomoRunning) {
                pomoDuration = val * 60;
                pomoTimeLeft = pomoDuration;
                updatePomoDisplay();
            }
        }
    });
});

// --- Pomodoro State & Alarm State ---
let currentMode = 'focus';
let pomoDuration = customTimes.focus * 60;
let pomoTimeLeft = pomoDuration;
let pomoInterval;
let isPomoRunning = false;
let sessionCount = parseInt(localStorage.getItem('focusSessions')) || 0;

let alarmInterval;
let isAlarmPlaying = false;

const pomoDisplay = document.getElementById('pomo-time');
const pomoStartBtn = document.getElementById('pomo-start');
const pomoResetBtn = document.getElementById('pomo-reset');
const stopAlarmBtn = document.getElementById('stop-alarm-btn');
const modeBtns = document.querySelectorAll('.mode-btn');
const sessionCountDisplay = document.getElementById('session-count');

sessionCountDisplay.textContent = `Sessions: ${sessionCount}`;

// --- INFINITE ALARM LOGIC ---
function playSingleBeep() {
    if (alarmVolume > 0) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'square'; 
        osc.frequency.setValueAtTime(850, ctx.currentTime); 
        
        gainNode.gain.setValueAtTime(alarmVolume, ctx.currentTime);
        gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.15); 
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    }
}

function playAlarm() {
    if (isAlarmPlaying) return;
    isAlarmPlaying = true;
    
    document.body.classList.add('alarm-active');
    testAlarmBtn.textContent = 'Stop';
    
    // Play immediately, then loop every 400ms
    playSingleBeep();
    alarmInterval = setInterval(playSingleBeep, 400);
}

function stopAlarm() {
    isAlarmPlaying = false;
    clearInterval(alarmInterval);
    document.body.classList.remove('alarm-active');
    testAlarmBtn.textContent = 'Test';
}

function updatePomoDisplay() {
    pomoDisplay.textContent = `${String(Math.floor(pomoTimeLeft / 60)).padStart(2, '0')}:${String(pomoTimeLeft % 60).padStart(2, '0')}`;
}

// Switching modes resets everything
modeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        modeBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        currentMode = e.target.getAttribute('data-mode');
        pomoDuration = customTimes[currentMode] * 60;
        
        // Reset timers and alarms completely
        clearInterval(pomoInterval);
        stopAlarm();
        isPomoRunning = false;
        
        // Restore standard buttons
        pomoStartBtn.style.display = 'inline-block';
        pomoResetBtn.style.display = 'inline-block';
        stopAlarmBtn.style.display = 'none';
        
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
                // TIMER HIT ZERO
                clearInterval(pomoInterval);
                isPomoRunning = false;
                
                // Track focus sessions
                if (currentMode === 'focus') {
                    sessionCount++;
                    localStorage.setItem('focusSessions', sessionCount);
                    sessionCountDisplay.textContent = `Sessions: ${sessionCount}`;
                }
                
                // Swap buttons and play endless alarm
                pomoStartBtn.style.display = 'none';
                pomoResetBtn.style.display = 'none';
                stopAlarmBtn.style.display = 'inline-block';
                
                playAlarm();
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

// The user clicked the bright red Stop Alarm button
stopAlarmBtn.addEventListener('click', () => {
    stopAlarm();
    
    // Bring back standard buttons
    stopAlarmBtn.style.display = 'none';
    pomoStartBtn.style.display = 'inline-block';
    pomoResetBtn.style.display = 'inline-block';
    
    // Reset timer state automatically for the next session
    pomoStartBtn.textContent = 'Start';
    pomoTimeLeft = pomoDuration;
    updatePomoDisplay();
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
