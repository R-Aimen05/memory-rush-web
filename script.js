// ==========================================
// 1. STATE & LOCALSTORAGE
// ==========================================
const STORAGE_USERS = 'memoryRushUsers';
const STORAGE_HISTORY = 'memoryRushHistory';
const getBestScoreKey = (user, diff) => `memoryRushBest_${user}_${diff}`;

let currentUser = null;
let currentDifficulty = 'easy';
let currentTheme = 'animals';

let cards = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;

let moves = 0;
let score = 0;
let combo = 0;
let matchedPairs = 0;
let totalPairs = 0;
let timeLeft = 0;
let timerId = null;

const diffSettings = {
    easy: { r: 4, c: 4, time: 60, pairs: 8 },
    medium: { r: 4, c: 5, time: 90, pairs: 10 },
    hard: { r: 4, c: 6, time: 120, pairs: 12 }
};

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const screens = {
    title: document.getElementById('title-screen'),
    login: document.getElementById('login-screen'),
    menu: document.getElementById('menu-screen'),
    game: document.getElementById('game-screen'),
    admin: document.getElementById('admin-screen')
};

function switchScreen(screenKey) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenKey].classList.add('active');
    
    if (screenKey === 'menu') playMusic('menuMusic');
    else if (screenKey === 'game') playMusic('gameMusic');
    else stopMusic();
}

// Login
const usernameInput = document.getElementById('username-input');
const loginError = document.getElementById('login-error');

// Menu
const welcomeText = document.getElementById('welcome-text');
const bestScoreDisplay = document.getElementById('best-score-display');
const diffSelect = document.getElementById('difficulty-select');
const themeSelect = document.getElementById('theme-select');
const btnSound = document.getElementById('btn-sound');

// Game HUD
const hScore = document.getElementById('game-score');
const hMoves = document.getElementById('game-moves');
const hTime = document.getElementById('game-time');
const hCombo = document.getElementById('game-combo');
const gameBoard = document.getElementById('game-board');

// Modals
const resultModal = document.getElementById('result-modal');
const resTitle = document.getElementById('result-title');
const newRecordMsg = document.getElementById('new-record-msg');
const resUser = document.getElementById('res-user');
const resScore = document.getElementById('res-score');
const resMoves = document.getElementById('res-moves');
const resTime = document.getElementById('res-time');

// Admin
const adminPassModal = document.getElementById('admin-pass-modal');
const adminPassInput = document.getElementById('admin-pass-input');
const adminPassError = document.getElementById('admin-pass-error');
const adminTableHead = document.querySelector('#admin-table thead');
const adminTableBody = document.querySelector('#admin-table tbody');
const adminEmptyState = document.getElementById('admin-empty-state');
const adminTitleSuffix = document.getElementById('admin-title-suffix');
let currentAdminTab = 'history';

// ==========================================
// 3. AUDIO SYSTEM (HTML5 Audio)
// ==========================================
let soundEnabled = true;

const sounds = {
    flip: document.getElementById('snd-flip'),
    match: document.getElementById('snd-match'),
    wrong: document.getElementById('snd-wrong'),
    win: document.getElementById('snd-win'),
    click: document.getElementById('snd-click'),
    menuMusic: document.getElementById('snd-menu-music'),
    gameMusic: document.getElementById('snd-game-music')
};

function playSound(type) {
    if (!soundEnabled || !sounds[type]) return;
    try {
        sounds[type].currentTime = 0;
        sounds[type].play().catch(() => {});
    } catch(e) {}
}

function stopMusic() {
    if (sounds.menuMusic) sounds.menuMusic.pause();
    if (sounds.gameMusic) sounds.gameMusic.pause();
}

function playMusic(type) {
    if (!soundEnabled || !sounds[type]) return;
    stopMusic();

    if (type === 'gameMusic' && sounds.gameMusic) {
        sounds.gameMusic.src = `sounds/${currentTheme}-music.mp3`;
    }

    try {
        sounds[type].currentTime = 0;
        sounds[type].play().catch(() => {});
    } catch(e) {}
}

document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => playSound('click'));
});

// ==========================================
// 4. STORAGE FUNCTIONS
// ==========================================
function getUsers() { return JSON.parse(localStorage.getItem(STORAGE_USERS) || "[]"); }
function saveUsers(users) { localStorage.setItem(STORAGE_USERS, JSON.stringify(users)); }

function getBestScore(user, diff) { return parseInt(localStorage.getItem(getBestScoreKey(user, diff)) || "0"); }
function saveBestScore(user, diff, newScore) {
    const current = getBestScore(user, diff);
    if (newScore > current) {
        localStorage.setItem(getBestScoreKey(user, diff), newScore);
        return true;
    }
    return false;
}

function getHistory() { return JSON.parse(localStorage.getItem(STORAGE_HISTORY) || "[]"); }
function addHistory(record) {
    const history = getHistory();
    history.push(record);
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
}

// ==========================================
// 5. APP LOGIC / AUTH
// ==========================================
screens.title.addEventListener('click', () => {
    playSound('click');
    switchScreen('login');
});

function showError(msg) {
    loginError.textContent = msg;
    loginError.classList.remove('hidden');
}

document.getElementById('btn-signin').addEventListener('click', () => {
    const name = usernameInput.value.trim();
    if (!name) return showError("Please enter a username.");
    
    if (getUsers().includes(name)) {
        loginError.classList.add('hidden');
        currentUser = name;
        goToMenu();
    } else {
        showError("Username not found. Try Sign Up.");
    }
});

document.getElementById('btn-signup').addEventListener('click', () => {
    const name = usernameInput.value.trim();
    if (!name) return showError("Please enter a username.");
    
    const users = getUsers();
    if (users.includes(name)) {
        showError("Name already taken. Try signing in!");
    } else {
        users.push(name);
        saveUsers(users);
        loginError.classList.add('hidden');
        currentUser = name;
        goToMenu();
    }
});

// ==========================================
// 6. MAIN MENU
// ==========================================
function goToMenu() {
    welcomeText.textContent = `Welcome, ${currentUser}!`;
    updateMenuStats();
    applyTheme(themeSelect.value);
    switchScreen('menu');
}

function updateMenuStats() {
    bestScoreDisplay.textContent = getBestScore(currentUser, diffSelect.value);
}

diffSelect.addEventListener('change', updateMenuStats);
themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));

function applyTheme(theme) {
    currentTheme = theme;
    document.body.className = '';
    document.body.classList.add(`theme-${theme}`);
    if (screens.game.classList.contains('active')) {
        playMusic('gameMusic'); // Live update the generated theme track
    }
}

btnSound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    btnSound.textContent = soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
    btnSound.classList.toggle('btn-blue', soundEnabled);
    btnSound.classList.toggle('btn-grey', !soundEnabled);
    
    if (!soundEnabled) {
        stopMusic();
    } else {
        if (screens.menu.classList.contains('active')) playMusic('menuMusic');
        else if (screens.game.classList.contains('active')) playMusic('gameMusic');
    }
});

document.getElementById('btn-switch-user').addEventListener('click', () => {
    currentUser = null;
    usernameInput.value = '';
    switchScreen('login');
});

document.getElementById('btn-play').addEventListener('click', startGame);

// ==========================================
// 7. GAME LOGIC
// ==========================================
function startGame() {
    currentDifficulty = diffSelect.value;
    const config = diffSettings[currentDifficulty];
    
    totalPairs = config.pairs;
    timeLeft = config.time;
    moves = 0;
    score = 0;
    combo = 0;
    matchedPairs = 0;
    firstCard = null;
    secondCard = null;
    lockBoard = false;
    
    updateHUD();
    buildBoard(config);
    
    switchScreen('game');
    startTimer();
}

function updateHUD() {
    hScore.textContent = score;
    hMoves.textContent = moves;
    hTime.textContent = timeLeft;
    hCombo.textContent = combo;
}

function buildBoard(config) {
    gameBoard.innerHTML = '';
    let cardSize = config.c > 4 ? 80 : 90;
    if (window.innerWidth < 768) cardSize = config.c > 4 ? 50 : 70;
    
    gameBoard.style.gridTemplateColumns = `repeat(${config.c}, ${cardSize}px)`;
    gameBoard.style.gridTemplateRows = `repeat(${config.r}, ${cardSize}px)`;
    
    const images = [];
    for (let i = 0; i < totalPairs; i++) {
        images.push(`images/${currentTheme}/${currentTheme}_${i}.png`);
    }
    
    const deck = [...images, ...images].sort(() => Math.random() - 0.5);
    
    deck.forEach(img => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.image = img;
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-face card-back">?</div>
                <div class="card-face card-front">
                    <img src="${img}" alt="card" onerror="this.style.display='none'">
                </div>
            </div>
        `;
        card.addEventListener('click', () => flipCard(card));
        gameBoard.appendChild(card);
    });
}

function flipCard(card) {
    if (lockBoard || card === firstCard || card.classList.contains('flipped') || card.classList.contains('matched')) return;

    playSound('flip');
    card.classList.add('flipped');

    if (!firstCard) {
        firstCard = card;
        return;
    }

    secondCard = card;
    lockBoard = true;
    moves++;
    
    checkMatch();
}

function checkMatch() {
    const isMatch = firstCard.dataset.image === secondCard.dataset.image;

    if (isMatch) {
        combo++;
        matchedPairs++;
        score += 100 + (combo * 20); // base + combo bonus
        
        firstCard.classList.add('matched');
        secondCard.classList.add('matched');
        playSound('match');
        
        updateHUD();
        resetTurn();
        
        if (matchedPairs === totalPairs) {
            endGame(true);
        }
    } else {
        combo = 0;
        score = Math.max(0, score - 10);
        playSound('wrong');
        updateHUD();
        
        setTimeout(() => {
            firstCard.classList.remove('flipped');
            secondCard.classList.remove('flipped');
            resetTurn();
        }, 1000);
    }
}

function resetTurn() {
    firstCard = null;
    secondCard = null;
    lockBoard = false;
}

function startTimer() {
    clearInterval(timerId);
    timerId = setInterval(() => {
        timeLeft--;
        hTime.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerId);
            endGame(false);
        }
    }, 1000);
}

function endGame(won) {
    clearInterval(timerId);
    stopMusic();
    
    if (won) {
        playSound('win');
        score += timeLeft * 10; // time bonus
        resTitle.textContent = "Victory!";
        resTitle.style.color = "var(--color-cyan-accent)";
    } else {
        resTitle.textContent = "Time's Up!";
        resTitle.style.color = "var(--color-red-hover)";
    }

    const isRecord = won && saveBestScore(currentUser, currentDifficulty, score);
    newRecordMsg.classList.toggle('hidden', !isRecord);
    
    addHistory({
        date: new Date().toLocaleString(),
        user: currentUser,
        difficulty: currentDifficulty,
        theme: currentTheme,
        result: won ? 'Won' : 'Lost',
        score: score,
        moves: moves,
        timeLeft: timeLeft
    });

    resUser.textContent = currentUser;
    resScore.textContent = score;
    resMoves.textContent = moves;
    resTime.textContent = timeLeft;

    resultModal.classList.remove('hidden');
}

// Modals
document.getElementById('btn-play-again').addEventListener('click', () => {
    resultModal.classList.add('hidden');
    startGame();
});

document.getElementById('btn-back-menu').addEventListener('click', () => {
    resultModal.classList.add('hidden');
    goToMenu();
});

document.getElementById('btn-game-menu').addEventListener('click', () => {
    clearInterval(timerId);
    goToMenu();
});

// ==========================================
// 8. ADMIN DASHBOARD
// ==========================================
document.getElementById('btn-admin').addEventListener('click', () => {
    adminPassInput.value = '';
    adminPassError.classList.add('hidden');
    adminPassModal.classList.remove('hidden');
});

document.getElementById('btn-admin-cancel').addEventListener('click', () => {
    adminPassModal.classList.add('hidden');
});

document.getElementById('btn-admin-submit').addEventListener('click', () => {
    if (adminPassInput.value === 'admin123') {
        adminPassModal.classList.add('hidden');
        switchScreen('admin');
        renderAdmin();
    } else {
        adminPassError.classList.remove('hidden');
    }
});

document.getElementById('btn-admin-back').addEventListener('click', () => {
    switchScreen('login');
});

document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentAdminTab = tab.dataset.tab;
        renderAdmin();
    });
});

function renderAdmin() {
    adminTableHead.innerHTML = '';
    adminTableBody.innerHTML = '';
    
    if (currentAdminTab === 'history') {
        adminTitleSuffix.textContent = "Game History";
        renderHistoryTable();
    } else {
        adminTitleSuffix.textContent = "High Scores";
        renderHighScoresTable();
    }
}

function renderHistoryTable() {
    const history = getHistory().reverse();
    if (history.length === 0) {
        adminEmptyState.classList.remove('hidden');
        return;
    }
    
    adminEmptyState.classList.add('hidden');
    adminTableHead.innerHTML = `<tr><th>Date</th><th>Player</th><th>Difficulty</th><th>Theme</th><th>Result</th><th>Score</th><th>Moves</th><th>Time Left</th></tr>`;
    
    history.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.date}</td>
            <td><strong>${r.user}</strong></td>
            <td style="text-transform: capitalize;">${r.difficulty}</td>
            <td style="text-transform: capitalize;">${r.theme}</td>
            <td style="color: ${r.result === 'Won' ? 'var(--color-green-btn)' : 'var(--color-red-btn)'}">${r.result}</td>
            <td>${r.score}</td>
            <td>${r.moves}</td>
            <td>${r.timeLeft}s</td>
        `;
        adminTableBody.appendChild(tr);
    });
}

function renderHighScoresTable() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('memoryRushBest_'));
    if (keys.length === 0) {
        adminEmptyState.classList.remove('hidden');
        return;
    }
    
    adminEmptyState.classList.add('hidden');
    adminTableHead.innerHTML = `<tr><th>Username</th><th>Difficulty</th><th>Best Score</th></tr>`;
    
    const scores = keys.map(k => {
        const parts = k.split('_'); // memoryRushBest_username_difficulty
        return { user: parts[1], diff: parts[2], val: parseInt(localStorage.getItem(k)) };
    }).sort((a, b) => b.val - a.val);
    
    scores.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.user}</strong></td>
            <td style="text-transform: capitalize;">${s.diff}</td>
            <td style="color: var(--color-gold); font-weight: bold;">${s.val}</td>
        `;
        adminTableBody.appendChild(tr);
    });
}