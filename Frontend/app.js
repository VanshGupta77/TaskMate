// ============================================
// CONFIGURATION - Change this to your API URL
// ============================================
const API_URL = 'http://localhost:3001/api';

// Game Data
const PETS = {
    dragon: { name: 'Dragon',  stages: ['🥚','🐣','🦎','🐉','🐲'],  stageNames: ['Egg','Hatchling','Drake','Dragon','Elder Dragon'] },
    cat:    { name: 'Cat',     stages: ['🥚','🐱','🐈','🦁','👑'],  stageNames: ['Egg','Kitten','Cat','Lion','King'] },
    robot:  { name: 'Robot',   stages: ['🥚','🔩','🤖','👾','🚀'],  stageNames: ['Core','Parts','Robot','AI','Spaceship'] },
    plant:  { name: 'Plant',   stages: ['🥚','🌱','🌿','🌳','🌍'],  stageNames: ['Seed','Sprout','Bush','Tree','World Tree'] },
    fox:    { name: 'Fox',     stages: ['🥚','🦊','🐺','🦁','🐉'],  stageNames: ['Egg','Fox Kit','Wild Fox','Alpha','Mythic'] },
    phoenix:{ name: 'Phoenix', stages: ['🥚','🐣','🦅','🔥','☀️'], stageNames: ['Ember','Fledgling','Falcon','Phoenix','Sun God'] },
    bunny:  { name: 'Bunny',   stages: ['🥚','🐰','🐇','🦄','✨'],  stageNames: ['Egg','Bunny','Hare','Unicorn','Legend'] },
    ghost:  { name: 'Ghost',   stages: ['🥚','👻','💀','🌑','⚡'],  stageNames: ['Orb','Specter','Skull','Eclipse','Thunder'] }
};

const XP_PER_TASK = 50;
const XP_FOR_LEVEL_UP = 200;
const STAGES = [0, 25, 50, 75, 100];

// State
let state = { user: null, token: null, pet: null, petName: '', level: 1, xp: 0, streak: 0, lastCompletedDate: null, tasks: [], history: [], pendingSync: [] };
let isOnline = navigator.onLine;
let selectedPetType = null;

// ============================================
// OFFLINE SUPPORT & SYNC
// ============================================

function loadLocalState() {
    const saved = localStorage.getItem('taskpet_cloud_state');
    if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed, user: null, token: null };
    }
}

function saveLocalState() {
    const localState = { ...state };
    delete localState.user;
    delete localState.token;
    localStorage.setItem('taskpet_cloud_state', JSON.stringify(localState));
}

function addPendingSync(action, data) {
    state.pendingSync.push({ action, data, timestamp: Date.now() });
    saveLocalState();
    showNotification('Queued for sync when online', 'info');
}

async function syncPending() {
    if (!isOnline || !state.token || state.pendingSync.length === 0) return;
    
    updateSyncStatus('syncing');
    const pending = [...state.pendingSync];
    state.pendingSync = [];
    saveLocalState();
    
    for (const item of pending) {
        try {
            switch(item.action) {
                case 'addTask': await apiPost('/tasks', item.data); break;
                case 'toggleTask': await apiPatch(`/tasks/${item.data.id}`, { completed: item.data.completed }); break;
                case 'deleteTask': await apiDelete(`/tasks/${item.data.id}`); break;
                case 'completeDay': await apiPost('/complete-day', item.data); break;
            }
        } catch (e) {
            state.pendingSync.push(item);
        }
    }
    
    saveLocalState();
    await loadUserData();
    updateSyncStatus('online');
}

// ============================================
// API CLIENT
// ============================================

async function api(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(state.token ? { 'Authorization': `Bearer ${state.token}` } : {})
        },
        ...options
    };
    
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }
    
    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            const error = await response.json();
            const err = new Error(error.message || 'Request failed');
            err.status = response.status; // ← ADD THIS LINE
            throw err;
        }
        return await response.json();
    } catch (error) {
        if (!isOnline) {
            throw new Error('Offline - changes queued for sync');
        }
        throw error;
    }
}

const apiGet = (endpoint) => api(endpoint, { method: 'GET' });
const apiPost = (endpoint, body) => api(endpoint, { method: 'POST', body });
const apiPatch = (endpoint, body) => api(endpoint, { method: 'PATCH', body });
const apiDelete = (endpoint) => api(endpoint, { method: 'DELETE' });

// ============================================
// AUTHENTICATION
// ============================================

function showAuthModal() {
    document.getElementById('authModal').classList.add('active');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

function switchAuthTab(tab) {
    document.getElementById('loginTab').classList.toggle('active', tab === 'login');
    document.getElementById('registerTab').classList.toggle('active', tab === 'register');
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('authTitle').textContent = tab === 'login' ? 'Welcome Back' : 'Join TaskPet';
}

async function register() {
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    
    if (!username || !email || !password) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    try {
        const data = await apiPost('/auth/register', { username, email, password });
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('taskpet_token', data.token);
        closeAuthModal();
        updateAuthUI();
        showNotification('Welcome! Choose your pet to start.', 'success');
        setTimeout(showPetSelector, 500);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    try {
        const data = await apiPost('/auth/login', { email, password });
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('taskpet_token', data.token);
        closeAuthModal();
        await loadUserData();
        updateAuthUI();
        showNotification(`Welcome back, ${data.user.username}!`);
        syncPending();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function logout() {
    state.token = null;
    state.user = null;
    state.tasks = [];
    state.history = [];
    state.pet = null;
    localStorage.removeItem('taskpet_token');
    saveLocalState();
    updateAuthUI();
    render();
    showNotification('Logged out successfully');
}

async function loadUserData() {
    if (!state.token) return;
    try {
        const data = await apiGet('/user/data');
        state.pet = data.pet;
        state.petName = data.petName;
        state.level = data.level;
        state.xp = data.xp;
        state.streak = data.streak;
        state.lastCompletedDate = data.lastCompletedDate;
        state.tasks = data.tasks || [];
        state.history = data.history || [];
        saveLocalState();
        render();
    } catch (error) {
        console.error('Failed to load user data:', error);
    }
}

function updateAuthUI() {
    const userInfo = document.getElementById('userInfo');
    const loginBtn = document.getElementById('loginBtn');
    
    if (state.user) {
        userInfo.style.display = 'flex';
        loginBtn.style.display = 'none';
        document.getElementById('userEmail').textContent = state.user.username;
        document.getElementById('completeDayBtn').disabled = false;
    } else {
        userInfo.style.display = 'none';
        loginBtn.style.display = 'inline-flex';
        document.getElementById('completeDayBtn').disabled = true;
    }
}

// ============================================
// PET MANAGEMENT
// ============================================

function showPetSelector() {
    if (!state.user) {
        showNotification('Please login first!', 'warning');
        showAuthModal();
        return;
    }
    
    document.querySelectorAll('.pet-option').forEach(el => el.classList.remove('selected'));
    
    const modal = document.getElementById('petModal');
    if (!modal) return;
    modal.classList.add('active');
    
    if (state.pet) {
        const currentPet = document.querySelector(`[data-pet="${state.pet}"]`);
        if (currentPet) currentPet.classList.add('selected');
        const nameInput = document.getElementById('petNameInput');
        if (nameInput) nameInput.value = state.petName || '';
    }
}

function closePetSelector() {
    document.getElementById('petModal').classList.remove('active');
}

function selectPet(type) {
    document.querySelectorAll('.pet-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`[data-pet="${type}"]`)?.classList.add('selected');
    selectedPetType = type;
}

async function confirmPetSelection() {
    const name = document.getElementById('petNameInput').value.trim();
    if (!selectedPetType && !state.pet) {
        showNotification('Please select a pet!', 'error');
        return;
    }
    if (!name && !state.petName) {
        showNotification('Please name your pet!', 'error');
        return;
    }

    const petData = {
        pet: selectedPetType || state.pet,
        petName: name || state.petName
    };

    try {
        await apiPost('/user/pet', petData);
        state.pet = petData.pet;
        state.petName = petData.petName;
        saveLocalState();
        closePetSelector();
        render();
        showNotification(`Welcome, ${state.petName}! 🎉`);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// ============================================
// TASK MANAGEMENT
// ============================================

async function addTask() {
    const input = document.getElementById('taskInput');
    const text = input.value.trim();
    if (!text) return;

    if (!state.user) {
        showNotification('Please login first!', 'warning');
        showAuthModal();
        return;
    }

    const taskData = {
        id: Date.now().toString(),
        text: text,
        completed: false,
        createdAt: new Date().toISOString()
    };

    if (!isOnline) {
        state.tasks.push(taskData);
        addPendingSync('addTask', taskData);
        input.value = '';
        saveLocalState();
        render();
        return;
    }

    try {
        const result = await apiPost('/tasks', taskData);
        state.tasks = result.tasks;
        input.value = '';
        saveLocalState();
        render();
        showNotification('Task added to cloud!');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id || t._id === id);
    if (!task) return;

    const newStatus = !task.completed;
    const taskId = task._id || task.id;

    if (!isOnline) {
        task.completed = newStatus;
        addPendingSync('toggleTask', { id: taskId, completed: newStatus });
        saveLocalState();
        render();
        if (newStatus) showNotification(`+${XP_PER_TASK} XP!`);
        return;
    }

    try {
        const result = await apiPatch(`/tasks/${taskId}`, { completed: newStatus });
        state.tasks = result.tasks;
        state.xp = result.xp;
        state.level = result.level;
        saveLocalState();
        render();
        if (newStatus) showNotification(`+${XP_PER_TASK} XP!`);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function deleteTask(id) {
    const task = state.tasks.find(t => t.id === id || t._id === id);
    if (!task) return;
    const taskId = task._id || task.id;

    if (!isOnline) {
        state.tasks = state.tasks.filter(t => (t.id !== id && t._id !== id));
        addPendingSync('deleteTask', { id: taskId });
        saveLocalState();
        render();
        return;
    }

    try {
        const result = await apiDelete(`/tasks/${taskId}`);
        state.tasks = result.tasks;
        saveLocalState();
        render();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function completeDay() {
    if (state.tasks.length === 0) {
        showNotification('Add some tasks first!', 'warning');
        return;
    }

    const completed = state.tasks.filter(t => t.completed).length;
    const total = state.tasks.length;
    const percentage = Math.round((completed / total) * 100);

    const dayData = {
        completed,
        total,
        percentage,
        tasks: state.tasks.map(t => ({ id: t._id || t.id, completed: t.completed }))
    };

    if (!isOnline) {
        let xpEarned = 0;
        if (percentage === 100) { xpEarned = XP_PER_TASK * total * 2; state.streak++; }
        else if (percentage >= 75) { xpEarned = Math.floor(XP_PER_TASK * total * 1.5); state.streak++; }
        else if (percentage >= 50) { xpEarned = Math.floor(XP_PER_TASK * total); state.streak = 0; }
        else { xpEarned = Math.floor(XP_PER_TASK * completed * 0.5); state.streak = 0; }

        state.xp += xpEarned;
        state.level = Math.floor(state.xp / XP_FOR_LEVEL_UP) + 1;
        state.lastCompletedDate = new Date().toDateString();
        
        let stageIndex = 0;
        for (let i = STAGES.length - 1; i >= 0; i--) {
            if (percentage >= STAGES[i]) { stageIndex = i; break; }
        }
        
        state.history.unshift({
            date: new Date().toDateString(),
            completed, total, percentage, xpEarned, stageIndex
        });
        if (state.history.length > 30) state.history.pop();

        state.tasks = state.tasks.map(t => ({...t, completed: false}));
        
        addPendingSync('completeDay', dayData);
        saveLocalState();
        render();
        showDailySummary(completed, total, xpEarned, percentage);
        
        const petData = PETS[state.pet];
        if (petData && percentage >= 75) {
            showEvolution(petData.stages[Math.min(stageIndex, petData.stages.length - 1)], 
                percentage === 100 ? 'Perfect Evolution!' : 'Growing Strong!');
        }
        return;
    }

    try {
        const result = await apiPost('/complete-day', dayData);
        state.xp = result.xp;
        state.level = result.level;
        state.streak = result.streak;
        state.lastCompletedDate = result.lastCompletedDate;
        state.history = result.history;
        state.tasks = result.tasks || [];
        saveLocalState();
        render();
        showDailySummary(completed, total, result.xpEarned, percentage);
        
        if (result.evolved) {
            const petData = PETS[state.pet];
            showEvolution(petData.stages[Math.min(result.stageIndex, petData.stages.length - 1)], result.evolutionText);
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// ============================================
// LEADERBOARD
// ============================================

async function loadLeaderboard() {
    if (!state.user) return;
    try {
        const data = await apiGet('/leaderboard');
        const list = document.getElementById('leaderboardList');
        
        if (data.leaderboard.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏆</div><p>No players yet. Be the first!</p></div>';
            return;
        }

        list.innerHTML = data.leaderboard.map((player, index) => `
            <div class="leaderboard-item">
                <div class="leaderboard-rank ${index < 3 ? ['gold', 'silver', 'bronze'][index] : ''}">${index + 1}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${escapeHtml(player.username)} ${player.petName ? `& ${escapeHtml(player.petName)}` : ''}</div>
                    <div class="leaderboard-stats">Level ${player.level} • ${player.pet || 'No pet'}</div>
                </div>
                <div class="leaderboard-xp">${player.xp.toLocaleString()} XP</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
    }
}

// ============================================
// UI & RENDERING
// ============================================

function render() {
    if (state.pet) {
        const petData = PETS[state.pet];
        const completed = state.tasks.filter(t => t.completed).length;
        const percentage = state.tasks.length > 0 ? (completed / state.tasks.length) * 100 : 0;
        
        let stageIndex = 0;
        for (let i = STAGES.length - 1; i >= 0; i--) {
            if (percentage >= STAGES[i]) { stageIndex = i; break; }
        }
        
        const safeIndex = Math.min(stageIndex, petData.stages.length - 1);
        document.getElementById('petEmoji').textContent = petData.stages[safeIndex];
        document.getElementById('petName').textContent = state.petName;
        document.getElementById('petStage').textContent = petData.stageNames[safeIndex];
    } else {
        document.getElementById('petEmoji').textContent = '🥚';
        document.getElementById('petName').textContent = state.user ? 'Choose Your Pet' : 'Login to begin';
        document.getElementById('petStage').textContent = state.user ? 'Select to start' : 'Cloud sync enabled';
    }

    document.getElementById('levelDisplay').textContent = state.level;
    document.getElementById('xpDisplay').textContent = state.xp.toLocaleString();
    document.getElementById('streakDisplay').textContent = `${state.streak} ${state.streak > 0 ? '🔥' : ''}`;
    const completed = state.tasks.filter(t => t.completed).length;
    document.getElementById('tasksTodayDisplay').textContent = `${completed}/${state.tasks.length}`;
    
    const percentage = state.tasks.length > 0 ? Math.round((completed / state.tasks.length) * 100) : 0;
    document.getElementById('progressPercent').textContent = `${percentage}%`;
    document.getElementById('progressBar').style.width = `${percentage}%`;

    const taskList = document.getElementById('taskList');
    if (state.tasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>${state.user ? 'No tasks yet. Add some to start growing your pet!' : 'Login to start tracking tasks!'}</p>
            </div>
        `;
    } else {
        taskList.innerHTML = state.tasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''} ${task._pending ? 'syncing' : ''}">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task._id || task.id}')"></div>
                <div class="task-content">
                    <div class="task-text">${escapeHtml(task.text)}</div>
                    <div class="task-xp">+${XP_PER_TASK} XP</div>
                    ${task._pending ? '<div class="task-meta">⏳ Sync pending...</div>' : ''}
                </div>
                <button class="delete-btn" onclick="deleteTask('${task._id || task.id}')">🗑️</button>
            </div>
        `).join('');
    }

    const historyList = document.getElementById('historyList');
    if (state.history.length === 0) {
        historyList.innerHTML = '<p style="color: var(--text-muted);">Complete your first day to see history!</p>';
    } else {
        historyList.innerHTML = state.history.slice(0, 14).map(day => {
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString('en', { weekday: 'short' });
            const dateNum = date.getDate();
            return `
                <div class="history-card ${day.percentage === 100 ? 'perfect' : ''}">
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${dayName}</div>
                    <div style="font-size: 1.5rem; font-weight: bold; margin: 5px 0;">${dateNum}</div>
                    <div style="font-size: 1.2rem;">${day.percentage >= 75 ? '🔥' : day.percentage >= 50 ? '👍' : '💪'}</div>
                    <div style="font-size: 0.85rem; margin-top: 5px;">${day.completed}/${day.total}</div>
                    <div style="font-size: 0.75rem; color: var(--warning);">+${day.xpEarned} XP</div>
                </div>
            `;
        }).join('');
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('historyTab').style.display = tab === 'history' ? 'block' : 'none';
    document.getElementById('leaderboardTab').style.display = tab === 'leaderboard' ? 'block' : 'none';
    if (tab === 'leaderboard') loadLeaderboard();
}

function showDailySummary(completed, total, xp, percentage) {
    const summary = document.getElementById('dailySummary');
    document.getElementById('summaryCompleted').textContent = `${completed}/${total}`;
    document.getElementById('summaryXP').textContent = xp;
    
    let message = '';
    if (percentage === 100) message = 'Perfect! Your pet is thrilled! 🌟';
    else if (percentage >= 75) message = 'Amazing work! Almost perfect! ✨';
    else if (percentage >= 50) message = 'Good job! Keep pushing! 💪';
    else message = 'You can do better tomorrow! 🌱';
    
    document.getElementById('summaryText').textContent = message;
    summary.style.display = 'block';
}

function showEvolution(emoji, text) {
    const anim = document.getElementById('evolutionAnim');
    document.getElementById('evolutionEmoji').textContent = emoji;
    document.getElementById('evolutionText').textContent = text;
    anim.classList.add('active');
    setTimeout(() => anim.classList.remove('active'), 3000);
}

function updateSyncStatus(status) {
    const icon = document.getElementById('syncIcon');
    const text = document.getElementById('syncText');
    const el = document.getElementById('syncStatus');
    
    el.className = 'sync-status ' + status;
    if (status === 'online') { icon.textContent = '🟢'; text.textContent = 'Synced'; }
    else if (status === 'offline') { icon.textContent = '🟠'; text.textContent = 'Offline'; }
    else if (status === 'syncing') { icon.textContent = '🔵'; text.textContent = 'Syncing...'; }
}

// ============================================
// UTILITIES
// ============================================

function showNotification(text, type = 'success') {
    const notif = document.getElementById('notification');
    document.getElementById('notificationText').textContent = text;
    notif.className = 'notification show ' + type;
    setTimeout(() => notif.classList.remove('show'), 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function resetProgress() {
    if (!state.user) {
        showNotification('Login to manage cloud data', 'warning');
        return;
    }
    if (confirm('⚠️ WARNING: This will permanently delete ALL your cloud data! Are you sure?')) {
        apiDelete('/user/data').then(() => {
            state.pet = null; state.petName = ''; state.level = 1; state.xp = 0;
            state.streak = 0; state.tasks = []; state.history = [];
            saveLocalState();
            render();
            showNotification('All progress reset!', 'warning');
            setTimeout(showPetSelector, 500);
        }).catch(err => showNotification(err.message, 'error'));
    }
}

// ============================================
// NETWORK & INIT
// ============================================

window.addEventListener('online', () => {
    isOnline = true;
    document.getElementById('offlineBanner').classList.remove('show');
    updateSyncStatus('online');
    syncPending();
    showNotification('Back online! Syncing...', 'info');
});

window.addEventListener('offline', () => {
    isOnline = false;
    document.getElementById('offlineBanner').classList.add('show');
    updateSyncStatus('offline');
    showNotification('You are offline. Changes saved locally.', 'warning');
});

async function init() {
    loadLocalState();
    render();
    
    const token = localStorage.getItem('taskpet_token');
    if (token) {
        state.token = token;
        updateSyncStatus('syncing');
        try {
            const data = await apiGet('/user/me');
            state.user = data.user;
            updateAuthUI();
            await loadUserData();
            updateSyncStatus('online');
            syncPending();
            showNotification(`Welcome back, ${data.user.username}!`);
        } catch (error) {
            // Only wipe token if server EXPLICITLY rejected it (expired/invalid)
            // NOT when server is just unreachable/not started
            if (error.status === 401) {
                localStorage.removeItem('taskpet_token');
                state.token = null;
                showNotification('Session expired. Please login again.', 'warning');
            } else {
                // Server unreachable — keep token, work offline
                showNotification('Server unreachable. Working offline.', 'warning');
            }
            updateSyncStatus('offline');
        }
    } else {
        updateSyncStatus('offline');
    }
}
init();