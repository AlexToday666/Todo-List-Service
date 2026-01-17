// ============================================
// Configuration
// ============================================
const API_BASE_URL = 'http://localhost:8080/api/tasks';

// ============================================
// State Management
// ============================================
const state = {
    tasks: [],
    nodes: new Map(), // Map<nodeId, nodeData>
    connections: [], // Array of {from, to}
    selectedNode: null,
    viewMode: 'map', // 'map' | 'calendar' | 'list'
    transform: {
        x: 0,
        y: 0,
        scale: 1
    },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    panStart: { x: 0, y: 0 }
};

// Сохранение токена после логина
localStorage.setItem('token', response.token);

// Отправка токена в заголовках
fetch('/api/tasks', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
    }
});

// ============================================
// DOM Elements
// ============================================
const elements = {
    mapContainer: document.getElementById('map-container'),
    mapCanvas: document.getElementById('map-canvas'),
    connectionsLayer: document.getElementById('connections-layer'),
    calendarCenter: document.getElementById('calendar-center'),
    calendarGrid: document.getElementById('calendar-grid'),
    sidePanel: document.getElementById('side-panel'),
    sidePanelTitle: document.getElementById('side-panel-title'),
    sidePanelContent: document.getElementById('side-panel-content'),
    closePanel: document.getElementById('close-panel'),
    fab: document.getElementById('fab'),
    addModal: document.getElementById('add-modal'),
    noteForm: document.getElementById('note-form'),
    noteTitle: document.getElementById('note-title'),
    noteDescription: document.getElementById('note-description'),
    noteDate: document.getElementById('note-date'),
    closeAddModal: document.getElementById('close-add-modal'),
    cancelNote: document.getElementById('cancel-note'),
    zoomIn: document.getElementById('zoom-in'),
    zoomOut: document.getElementById('zoom-out'),
    zoomReset: document.getElementById('zoom-reset'),
    viewButtons: document.querySelectorAll('.view-btn'),
    toastContainer: document.getElementById('toast-container')
};

// ============================================
// Calendar Generation
// ============================================
function generateCalendar() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // Set date input to today
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    elements.noteDate.value = dateStr;
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Day names
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    elements.calendarGrid.innerHTML = '';
    
    // Add day names (optional, can be styled separately)
    // For now, just add days
    const daysBefore = (firstDay === 0 ? 6 : firstDay - 1); // Adjust for Monday start
    
    // Add empty cells for days before month start
    for (let i = 0; i < daysBefore; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        elements.calendarGrid.appendChild(empty);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;
        dayEl.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Mark today
        if (day === today.getDate() && month === today.getMonth()) {
            dayEl.classList.add('today');
        }
        
        // Check if day has notes
        const dateStr = dayEl.dataset.date;
        const hasNotes = state.tasks.some(task => {
            if (!task.createdAt) return false;
            const taskDate = new Date(task.createdAt);
            return taskDate.toISOString().split('T')[0] === dateStr;
        });
        
        if (hasNotes) {
            dayEl.classList.add('has-notes');
        }
        
        dayEl.addEventListener('click', () => handleDateClick(dateStr));
        elements.calendarGrid.appendChild(dayEl);
    }
}

// ============================================
// Node Management
// ============================================
function createNode(task, position = null) {
    const nodeId = `node-${task.id}`;
    
    // Calculate position if not provided
    if (!position) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Position nodes in a circle around calendar center
        const angle = (task.id % 12) * (Math.PI * 2 / 12);
        const radius = 250 + (task.id % 3) * 100;
        position = {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius
        };
    }
    
    const node = document.createElement('div');
    node.className = 'node';
    node.id = nodeId;
    node.dataset.nodeId = nodeId;
    node.dataset.taskId = task.id;
    node.style.left = `${position.x}px`;
    node.style.top = `${position.y}px`;
    
    const date = task.createdAt ? new Date(task.createdAt) : new Date();
    const dateStr = date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'short',
        year: 'numeric'
    });
    
    node.innerHTML = `
        <div class="node-header">
            <div class="node-title">${escapeHtml(task.title || 'Без названия')}</div>
            <div class="node-date">${dateStr}</div>
        </div>
        ${task.description ? `<div class="node-description">${escapeHtml(task.description)}</div>` : ''}
        <div class="node-badge">${task.completed ? '✅ Выполнено' : '🟢 В работе'}</div>
    `;
    
    // Event listeners
    node.addEventListener('click', (e) => {
        e.stopPropagation();
        selectNode(nodeId, task);
    });
    
    // Make node draggable
    makeNodeDraggable(node, position);
    
    state.nodes.set(nodeId, {
        id: nodeId,
        taskId: task.id,
        task: task,
        element: node,
        position: position
    });
    
    elements.mapCanvas.appendChild(node);
    
    // Create connection to calendar center
    createConnection('calendar-center', nodeId);
    
    return node;
}

function makeNodeDraggable(node, initialPosition) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    
    node.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only left mouse button
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = node.getBoundingClientRect();
        initialLeft = parseFloat(node.style.left) || initialPosition.x;
        initialTop = parseFloat(node.style.top) || initialPosition.y;
        
        node.style.cursor = 'grabbing';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = (e.clientX - startX) / state.transform.scale;
        const deltaY = (e.clientY - startY) / state.transform.scale;
        
        const newX = initialLeft + deltaX;
        const newY = initialTop + deltaY;
        
        node.style.left = `${newX}px`;
        node.style.top = `${newY}px`;
        
        // Update state
        const nodeData = state.nodes.get(node.dataset.nodeId);
        if (nodeData) {
            nodeData.position = { x: newX, y: newY };
        }
        
        // Update connections
        updateConnections();
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            node.style.cursor = 'pointer';
        }
    });
}

function selectNode(nodeId, task) {
    // Deselect previous
    if (state.selectedNode) {
        const prevNode = state.nodes.get(state.selectedNode);
        if (prevNode) {
            prevNode.element.classList.remove('selected');
        }
    }
    
    // Select new
    const nodeData = state.nodes.get(nodeId);
    if (nodeData) {
        nodeData.element.classList.add('selected');
        state.selectedNode = nodeId;
        
        // Show side panel
        showSidePanel(task);
    }
}

function deselectNode() {
    if (state.selectedNode) {
        const nodeData = state.nodes.get(state.selectedNode);
        if (nodeData) {
            nodeData.element.classList.remove('selected');
        }
        state.selectedNode = null;
    }
    hideSidePanel();
}

// ============================================
// Connection Management
// ============================================
function createConnection(fromId, toId) {
    const connection = { from: fromId, to: toId };
    state.connections.push(connection);
    updateConnections();
}

function updateConnections() {
    // Clear existing connections
    elements.connectionsLayer.innerHTML = '';
    
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    state.connections.forEach(conn => {
        let fromX, fromY, toX, toY;
        
        if (conn.from === 'calendar-center') {
            fromX = centerX;
            fromY = centerY;
        } else {
            const fromNode = state.nodes.get(conn.from);
            if (!fromNode) return;
            const rect = fromNode.element.getBoundingClientRect();
            fromX = parseFloat(fromNode.element.style.left) + rect.width / 2;
            fromY = parseFloat(fromNode.element.style.top) + rect.height / 2;
        }
        
        if (conn.to === 'calendar-center') {
            toX = centerX;
            toY = centerY;
        } else {
            const toNode = state.nodes.get(conn.to);
            if (!toNode) return;
            const rect = toNode.element.getBoundingClientRect();
            toX = parseFloat(toNode.element.style.left) + rect.width / 2;
            toY = parseFloat(toNode.element.style.top) + rect.height / 2;
        }
        
        // Apply transform
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromX);
        line.setAttribute('y1', fromY);
        line.setAttribute('x2', toX);
        line.setAttribute('y2', toY);
        line.setAttribute('class', 'connection-line');
        
        elements.connectionsLayer.appendChild(line);
    });
}

// ============================================
// Map Pan & Zoom
// ============================================
function initMapControls() {
    // Pan with mouse drag
    elements.mapContainer.addEventListener('mousedown', (e) => {
        if (e.target === elements.mapContainer || e.target === elements.mapCanvas || e.target === elements.connectionsLayer) {
            state.isDragging = true;
            state.panStart.x = e.clientX - state.transform.x;
            state.panStart.y = e.clientY - state.transform.y;
            elements.mapContainer.style.cursor = 'grabbing';
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (state.isDragging) {
            state.transform.x = e.clientX - state.panStart.x;
            state.transform.y = e.clientY - state.panStart.y;
            applyTransform();
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (state.isDragging) {
            state.isDragging = false;
            elements.mapContainer.style.cursor = 'grab';
        }
    });
    
    // Zoom with mouse wheel
    elements.mapContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        zoomAtPoint(e.clientX, e.clientY, delta);
    });
    
    // Zoom buttons
    elements.zoomIn.addEventListener('click', () => {
        zoomAtPoint(window.innerWidth / 2, window.innerHeight / 2, 1.2);
    });
    
    elements.zoomOut.addEventListener('click', () => {
        zoomAtPoint(window.innerWidth / 2, window.innerHeight / 2, 0.8);
    });
    
    elements.zoomReset.addEventListener('click', () => {
        state.transform = { x: 0, y: 0, scale: 1 };
        applyTransform();
    });
}

function zoomAtPoint(clientX, clientY, factor) {
    const rect = elements.mapContainer.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const newScale = Math.max(0.5, Math.min(3, state.transform.scale * factor));
    const scaleChange = newScale / state.transform.scale;
    
    state.transform.x = x - (x - state.transform.x) * scaleChange;
    state.transform.y = y - (y - state.transform.y) * scaleChange;
    state.transform.scale = newScale;
    
    applyTransform();
}

function applyTransform() {
    elements.mapCanvas.style.transform = `translate(${state.transform.x}px, ${state.transform.y}px) scale(${state.transform.scale})`;
    updateConnections();
}

// ============================================
// Side Panel
// ============================================
function showSidePanel(task) {
    elements.sidePanelTitle.textContent = task.title || 'Детали';
    
    const date = task.createdAt ? new Date(task.createdAt) : new Date();
    const dateStr = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        ...(task.createdAt ? { hour: '2-digit', minute: '2-digit' } : {})
    });
    
    elements.sidePanelContent.innerHTML = `
        <div style="margin-bottom: 24px;">
            <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">${escapeHtml(task.title || 'Без названия')}</h3>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">${dateStr}</p>
            ${task.description ? `<p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">${escapeHtml(task.description)}</p>` : ''}
            <div class="node-badge" style="display: inline-block;">${task.completed ? '✅ Выполнено' : '🟢 В работе'}</div>
        </div>
        <div style="border-top: 1px solid var(--border-light); padding-top: 16px;">
            <button class="btn btn-primary" style="width: 100%; margin-bottom: 8px;" onclick="toggleTaskComplete(${task.id})">
                ${task.complete ? 'Отметить как невыполненное' : 'Отметить как выполненное'}
            </button>
            <button class="btn btn-secondary" style="width: 100%;" onclick="deleteTaskFromPanel(${task.id})">
                Удалить задачу
            </button>
        </div>
    `;
    
    elements.sidePanel.classList.add('open');
}

function hideSidePanel() {
    elements.sidePanel.classList.remove('open');
}

// ============================================
// Modal Management
// ============================================
function showAddModal() {
    elements.addModal.classList.add('open');
    elements.noteTitle.focus();
}

function hideAddModal() {
    elements.addModal.classList.remove('open');
    elements.noteForm.reset();
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    elements.noteDate.value = dateStr;
}

// ============================================
// API Integration
// ============================================
async function fetchJson(url, options = {}) {
    try {
        const res = await fetch(url, {
            headers: {
                'Content-Type': 'application/json'
            },
            ...options
        });
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        
        if (res.status === 204) {
            return null;
        }
        
        return await res.json();
    } catch (e) {
        console.error('API Error:', e);
        throw e;
    }
}

async function loadTasks() {
    try {
        const tasks = await fetchJson(API_BASE_URL);
        state.tasks = tasks || [];
        renderNodes();
        generateCalendar();
        showToast('Задачи загружены', 'success');
    } catch (e) {
        showToast('Не удалось загрузить задачи', 'error');
        console.error(e);
    }
}

async function createTask(data) {
    try {
        const task = await fetchJson(API_BASE_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        state.tasks.push(task);
        createNode(task);
        generateCalendar();
        hideAddModal();
        showToast('Задача создана', 'success');
    } catch (e) {
        showToast('Не удалось создать задачу', 'error');
        console.error(e);
    }
}

async function updateTask(id, data) {
    try {
        const task = await fetchJson(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        
        const index = state.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            state.tasks[index] = task;
        }
        
        // Update node
        const nodeData = Array.from(state.nodes.values()).find(n => n.taskId === id);
        if (nodeData) {
            const date = task.createdAt ? new Date(task.createdAt) : new Date();
            const dateStr = date.toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'short',
                year: 'numeric'
            });
            
            nodeData.element.innerHTML = `
                <div class="node-header">
                    <div class="node-title">${escapeHtml(task.title || 'Без названия')}</div>
                    <div class="node-date">${dateStr}</div>
                </div>
                ${task.description ? `<div class="node-description">${escapeHtml(task.description)}</div>` : ''}
                <div class="node-badge">${task.completed ? '✅ Выполнено' : '🟢 В работе'}</div>
            `;
        }
        
        generateCalendar();
        if (state.selectedNode && nodeData) {
            showSidePanel(task);
        }
        showToast('Задача обновлена', 'success');
    } catch (e) {
        showToast('Не удалось обновить задачу', 'error');
        console.error(e);
    }
}

async function deleteTask(id) {
    try {
        await fetchJson(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        
        state.tasks = state.tasks.filter(t => t.id !== id);
        
        // Remove node
        const nodeData = Array.from(state.nodes.values()).find(n => n.taskId === id);
        if (nodeData) {
            nodeData.element.remove();
            state.nodes.delete(nodeData.id);
            state.connections = state.connections.filter(c => 
                c.from !== nodeData.id && c.to !== nodeData.id
            );
            updateConnections();
        }
        
        if (state.selectedNode === nodeData?.id) {
            deselectNode();
        }
        
        generateCalendar();
        showToast('Задача удалена', 'success');
    } catch (e) {
        showToast('Не удалось удалить задачу', 'error');
        console.error(e);
    }
}

function renderNodes() {
    // Clear existing nodes
    state.nodes.forEach(node => node.element.remove());
    state.nodes.clear();
    state.connections = [];
    
    // Create nodes for all tasks
    state.tasks.forEach(task => {
        createNode(task);
    });
    
    updateConnections();
}

// ============================================
// Event Handlers
// ============================================
function handleDateClick(dateStr) {
    showToast(`Выбрана дата: ${dateStr}`, 'success');
    // Could open modal to add note for this date
}

function handleViewChange(view) {
    state.viewMode = view;
    elements.viewButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    // View switching logic can be added here
}

// Global functions for inline handlers
window.toggleTaskComplete = async function(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        await updateTask(taskId, {
            title: task.title,
            description: task.description,
            completed: !task.completed
        });
    }
};

window.deleteTaskFromPanel = async function(taskId) {
    if (confirm('Удалить эту задачу?')) {
        await deleteTask(taskId);
    }
};

// ============================================
// Toast Notifications
// ============================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<p class="toast-message">${escapeHtml(message)}</p>`;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// Utility Functions
// ============================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Initialization
// ============================================
function init() {
    // Event listeners
    elements.fab.addEventListener('click', showAddModal);
    elements.closeAddModal.addEventListener('click', hideAddModal);
    elements.cancelNote.addEventListener('click', hideAddModal);
    elements.closePanel.addEventListener('click', hideSidePanel);
    
    elements.noteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = elements.noteTitle.value.trim();
        const description = elements.noteDescription.value.trim();
        const date = elements.noteDate.value;
        
        if (!title) {
            showToast('Введите название', 'error');
            return;
        }
        
        // Create task with date
        await createTask({
            title,
            description,
            completed: false
        });
    });
    
    // View toggle
    elements.viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            handleViewChange(btn.dataset.view);
        });
    });
    
    // Close modal on backdrop click
    elements.addModal.addEventListener('click', (e) => {
        if (e.target === elements.addModal) {
            hideAddModal();
        }
    });
    
    // Initialize map controls
    initMapControls();
    
    // Load tasks
    loadTasks();
    
    // Update connections on resize
    window.addEventListener('resize', () => {
        updateConnections();
    });
}

// Start app
document.addEventListener('DOMContentLoaded', init);
