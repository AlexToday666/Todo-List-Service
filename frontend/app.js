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
    selectedDate: null, // Selected date in format YYYY-MM-DD
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    transform: {
        x: 0,
        y: 0,
        scale: 1
    },
    isDragging: false,
    panStart: { x: 0, y: 0 }
};

// ============================================
// DOM Elements
// ============================================
const elements = {
    calendarView: document.getElementById('calendar-view'),
    taskListView: document.getElementById('task-list-view'),
    calendarGrid: document.getElementById('calendar-grid'),
    calendarMonth: document.getElementById('calendar-month'),
    prevMonth: document.getElementById('prev-month'),
    nextMonth: document.getElementById('next-month'),
    backToCalendar: document.getElementById('back-to-calendar'),
    selectedDate: document.getElementById('selected-date'),
    taskForm: document.getElementById('task-form'),
    taskTitle: document.getElementById('task-title'),
    taskDescription: document.getElementById('task-description'),
    tasksList: document.getElementById('tasks-list'),
    emptyTasks: document.getElementById('empty-tasks'),
    mapContainer: document.getElementById('map-container'),
    mapCanvas: document.getElementById('map-canvas'),
    connectionsLayer: document.getElementById('connections-layer'),
    zoomIn: document.getElementById('zoom-in'),
    zoomOut: document.getElementById('zoom-out'),
    zoomReset: document.getElementById('zoom-reset'),
    toastContainer: document.getElementById('toast-container')
};

// ============================================
// Calendar Generation
// ============================================
function generateCalendar() {
    if (!elements.calendarGrid || !elements.calendarMonth) {
        console.error('Calendar elements not found');
        return;
    }
    
    const year = state.currentYear;
    const month = state.currentMonth;
    
    // Update month header
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    elements.calendarMonth.textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Convert Sunday (0) to 7, Monday (1) to 1, etc. for Monday-first week
    const daysBefore = (firstDay === 0 ? 6 : firstDay - 1); // Monday = 0
    
    // Get previous month days
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
    
    elements.calendarGrid.innerHTML = '';
    
    // Add day names header
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    dayNames.forEach(dayName => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = dayName;
        elements.calendarGrid.appendChild(dayHeader);
    });
    
    // Add previous month days
    for (let i = daysBefore - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayEl = createCalendarDay(day, prevYear, prevMonth, true);
        elements.calendarGrid.appendChild(dayEl);
    }
    
    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = createCalendarDay(day, year, month, false);
        elements.calendarGrid.appendChild(dayEl);
    }
    
    // Fill remaining cells (next month) - we want 6 rows total (7 days * 6 rows = 42 cells)
    const totalCells = elements.calendarGrid.children.length - 7; // Subtract day headers
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    
    for (let day = 1; day <= remainingCells; day++) {
        const dayEl = createCalendarDay(day, nextYear, nextMonth, true);
        elements.calendarGrid.appendChild(dayEl);
    }
}

function createCalendarDay(day, year, month, isOtherMonth) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    if (isOtherMonth) {
        dayEl.classList.add('other-month');
    }
    dayEl.textContent = day;
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    dayEl.dataset.date = dateStr;
    
    // Mark today
    const today = new Date();
    if (!isOtherMonth && day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        dayEl.classList.add('today');
    }
    
    // Check if day has tasks
    const hasTasks = state.tasks.some(task => {
        if (!task.createdAt) return false;
        const taskDate = new Date(task.createdAt);
        const taskDateStr = taskDate.toISOString().split('T')[0];
        return taskDateStr === dateStr;
    });
    
    if (hasTasks) {
        dayEl.classList.add('has-tasks');
    }
    
    if (!isOtherMonth) {
        dayEl.addEventListener('click', () => handleDateClick(dateStr));
    }
    
    return dayEl;
}

// ============================================
// Date Selection & View Switching
// ============================================
function handleDateClick(dateStr) {
    state.selectedDate = dateStr;
    showTaskListView(dateStr);
    loadTasksForDate(dateStr);
}

function showTaskListView(dateStr) {
    elements.calendarView.classList.add('hidden');
    elements.taskListView.classList.remove('hidden');
    
    const date = new Date(dateStr);
    const dateFormatted = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    elements.selectedDate.textContent = dateFormatted;
}

function showCalendarView() {
    elements.taskListView.classList.add('hidden');
    elements.calendarView.classList.remove('hidden');
    state.selectedDate = null;
}

// ============================================
// Task Management
// ============================================
function loadTasksForDate(dateStr) {
    const tasksForDate = state.tasks.filter(task => {
        if (!task.createdAt) return false;
        const taskDate = new Date(task.createdAt);
        return taskDate.toISOString().split('T')[0] === dateStr;
    });
    
    renderTasksList(tasksForDate);
}

function renderTasksList(tasks) {
    elements.tasksList.innerHTML = '';
    
    if (tasks.length === 0) {
        elements.emptyTasks.classList.remove('hidden');
        return;
    }
    
    elements.emptyTasks.classList.add('hidden');
    
    tasks.forEach(task => {
        const li = createTaskListItem(task);
        elements.tasksList.appendChild(li);
    });
}

function createTaskListItem(task) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.taskId = task.id;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    
    const content = document.createElement('div');
    content.className = 'task-content';
    
    const titleRow = document.createElement('div');
    titleRow.className = 'task-title-row';
    
    const title = document.createElement('div');
    title.className = 'task-title';
    if (task.completed) {
        title.classList.add('completed');
    }
    title.textContent = task.title || 'Без названия';
    
    const description = document.createElement('p');
    description.className = 'task-description';
    description.textContent = task.description || '';
    
    const badge = document.createElement('div');
    badge.className = 'task-badge';
    if (task.completed) {
        badge.classList.add('completed');
    }
    badge.textContent = task.completed ? '✅ Выполнено' : '🟢 В работе';
    
    titleRow.appendChild(checkbox);
    titleRow.appendChild(title);
    content.appendChild(titleRow);
    if (task.description) {
        content.appendChild(description);
    }
    content.appendChild(badge);
    
    const actions = document.createElement('div');
    actions.className = 'task-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'task-btn';
    editBtn.title = 'Редактировать';
    editBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
    editBtn.addEventListener('click', () => editTask(task));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-btn delete';
    deleteBtn.title = 'Удалить';
    deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    li.appendChild(content);
    li.appendChild(actions);
    
    checkbox.addEventListener('change', () => {
        updateTask(task.id, {
            title: task.title,
            description: task.description,
            completed: checkbox.checked
        });
    });
    
    return li;
}

function editTask(task) {
    elements.taskTitle.value = task.title || '';
    elements.taskDescription.value = task.description || '';
    
    // Change form to update mode
    const submitBtn = elements.taskForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Обновить задачу';
    submitBtn.dataset.mode = 'update';
    submitBtn.dataset.taskId = task.id;
    
    // Scroll to form
    elements.taskForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    elements.taskTitle.focus();
}

// ============================================
// Node Management (Right Panel Map)
// ============================================
function createNode(task, position = null) {
    const nodeId = `node-${task.id}`;
    
    // Calculate position if not provided
    if (!position) {
        const mapRect = elements.mapCanvas.getBoundingClientRect();
        const centerX = mapRect.width / 2;
        const centerY = mapRect.height / 2;
        
        // Position nodes in a circle around center
        const nodeCount = state.nodes.size;
        const angle = (nodeCount % 12) * (Math.PI * 2 / 12);
        const radius = 150 + (nodeCount % 3) * 80;
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
    
    // Create connections between nodes
    updateConnections();
    
    return node;
}

function makeNodeDraggable(node, initialPosition) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    
    node.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = node.getBoundingClientRect();
        initialLeft = parseFloat(node.style.left) || initialPosition.x;
        initialTop = parseFloat(node.style.top) || initialPosition.y;
        
        node.style.cursor = 'grabbing';
        e.preventDefault();
        e.stopPropagation();
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

function updateNode(task) {
    const nodeData = Array.from(state.nodes.values()).find(n => n.taskId === task.id);
    if (!nodeData) return;
    
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
    
    nodeData.task = task;
}

function removeNode(taskId) {
    const nodeData = Array.from(state.nodes.values()).find(n => n.taskId === taskId);
    if (nodeData) {
        nodeData.element.remove();
        state.nodes.delete(nodeData.id);
        updateConnections();
        
        // Show initial node if no tasks left
        if (state.nodes.size === 0) {
            createInitialNode();
        }
    }
}

// ============================================
// Connection Management
// ============================================
function updateConnections() {
    elements.connectionsLayer.innerHTML = '';
    
    const nodes = Array.from(state.nodes.values());
    
    // Connect nodes to each other (simple: connect each to next)
    for (let i = 0; i < nodes.length - 1; i++) {
        const fromNode = nodes[i];
        const toNode = nodes[i + 1];
        
        const fromRect = fromNode.element.getBoundingClientRect();
        const toRect = toNode.element.getBoundingClientRect();
        const mapRect = elements.mapCanvas.getBoundingClientRect();
        
        const fromX = parseFloat(fromNode.element.style.left) + fromRect.width / 2;
        const fromY = parseFloat(fromNode.element.style.top) + fromRect.height / 2;
        const toX = parseFloat(toNode.element.style.left) + toRect.width / 2;
        const toY = parseFloat(toNode.element.style.top) + toRect.height / 2;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromX);
        line.setAttribute('y1', fromY);
        line.setAttribute('x2', toX);
        line.setAttribute('y2', toY);
        line.setAttribute('class', 'connection-line');
        
        elements.connectionsLayer.appendChild(line);
    }
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
        const rect = elements.mapContainer.getBoundingClientRect();
        zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.2);
    });
    
    elements.zoomOut.addEventListener('click', () => {
        const rect = elements.mapContainer.getBoundingClientRect();
        zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.8);
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
        renderAllNodes();
        generateCalendar(); // Regenerate calendar with task markers
        if (state.selectedDate) {
            loadTasksForDate(state.selectedDate);
        }
    } catch (e) {
        // Even if API fails, show calendar and initial node
        console.error('API Error:', e);
        renderAllNodes();
        generateCalendar();
    }
}

async function createTask(data) {
    try {
        const task = await fetchJson(API_BASE_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        state.tasks.push(task);
        
        // Remove initial node if exists
        const initialNode = document.getElementById('initial-node');
        if (initialNode) {
            initialNode.remove();
        }
        
        createNode(task);
        generateCalendar();
        
        if (state.selectedDate) {
            loadTasksForDate(state.selectedDate);
        }
        
        // Reset form
        elements.taskForm.reset();
        const submitBtn = elements.taskForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Добавить задачу';
        submitBtn.dataset.mode = 'create';
        delete submitBtn.dataset.taskId;
        
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
        
        updateNode(task);
        generateCalendar();
        
        if (state.selectedDate) {
            loadTasksForDate(state.selectedDate);
        }
        
        // Reset form
        const submitBtn = elements.taskForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Добавить задачу';
        submitBtn.dataset.mode = 'create';
        delete submitBtn.dataset.taskId;
        elements.taskForm.reset();
        
        showToast('Задача обновлена', 'success');
    } catch (e) {
        showToast('Не удалось обновить задачу', 'error');
        console.error(e);
    }
}

async function deleteTask(id) {
    if (!confirm('Удалить эту задачу?')) return;
    
    try {
        await fetchJson(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        
        state.tasks = state.tasks.filter(t => t.id !== id);
        removeNode(id);
        generateCalendar();
        
        if (state.selectedDate) {
            loadTasksForDate(state.selectedDate);
        }
        
        showToast('Задача удалена', 'success');
    } catch (e) {
        showToast('Не удалось удалить задачу', 'error');
        console.error(e);
    }
}

function renderAllNodes() {
    // Clear existing nodes
    state.nodes.forEach(node => node.element.remove());
    state.nodes.clear();
    
    // Create initial node if no tasks exist
    if (state.tasks.length === 0) {
        createInitialNode();
    } else {
        // Create nodes for all tasks
        state.tasks.forEach(task => {
            createNode(task);
        });
    }
    
    updateConnections();
}

function createInitialNode() {
    // Remove existing initial node if any
    const existing = document.getElementById('initial-node');
    if (existing) {
        existing.remove();
    }
    
    // Use fixed positioning relative to map canvas
    const centerX = 50; // 50% of map canvas width
    const centerY = 50; // 50% of map canvas height
    
    const node = document.createElement('div');
    node.className = 'node';
    node.id = 'initial-node';
    node.style.left = `calc(50% - 100px)`; // Center horizontally
    node.style.top = `calc(50% - 60px)`; // Center vertically
    node.style.position = 'absolute';
    node.innerHTML = `
        <div class="node-header">
            <div class="node-title">Начните добавлять задачи</div>
        </div>
        <div class="node-description">Выберите дату в календаре и добавьте первую задачу</div>
    `;
    
    elements.mapCanvas.appendChild(node);
}

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
    // Calendar navigation
    elements.prevMonth.addEventListener('click', () => {
        if (state.currentMonth === 0) {
            state.currentMonth = 11;
            state.currentYear--;
        } else {
            state.currentMonth--;
        }
        generateCalendar();
    });
    
    elements.nextMonth.addEventListener('click', () => {
        if (state.currentMonth === 11) {
            state.currentMonth = 0;
            state.currentYear++;
        } else {
            state.currentMonth++;
        }
        generateCalendar();
    });
    
    // Back to calendar
    elements.backToCalendar.addEventListener('click', showCalendarView);
    
    // Task form
    elements.taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = elements.taskTitle.value.trim();
        const description = elements.taskDescription.value.trim();
        
        if (!title) {
            showToast('Введите название', 'error');
            return;
        }
        
        if (!state.selectedDate) {
            showToast('Выберите дату в календаре', 'error');
            return;
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const mode = submitBtn.dataset.mode || 'create';
        
        if (mode === 'update') {
            const taskId = parseInt(submitBtn.dataset.taskId);
            await updateTask(taskId, {
                title,
                description,
                completed: state.tasks.find(t => t.id === taskId)?.completed || false
            });
        } else {
            // Create task with selected date
            const date = new Date(state.selectedDate);
            await createTask({
                title,
                description,
                completed: false
            });
        }
    });
    
    // Initialize map controls
    initMapControls();
    
    // Generate calendar immediately
    generateCalendar();
    
    // Load tasks
    loadTasks();
    
    // Update connections on resize
    window.addEventListener('resize', () => {
        updateConnections();
    });
}

// Start app
document.addEventListener('DOMContentLoaded', init);
