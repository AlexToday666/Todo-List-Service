const API_BASE = '/api/tasks';

const elements = {
    form: document.getElementById('task-form'),
    title: document.getElementById('title'),
    description: document.getElementById('description'),
    list: document.getElementById('task-list'),
    status: document.getElementById('status'),
    emptyState: document.getElementById('empty-state'),
    refreshBtn: document.getElementById('refresh-btn')
};

function setStatus(message, isError = false) {
    if (!elements.status) return;
    elements.status.textContent = message || '';
    elements.status.classList.toggle('status-bar--error', !!isError);
}

async function fetchJson(url, options = {}) {
    try {
        const res = await fetch(url, {
            headers: {
                'Content-Type': 'application/json'
            },
            ...options
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `HTTP ${res.status}`);
        }

        if (res.status === 204) {
            return null;
        }

        return await res.json();
    } catch (e) {
        console.error(e);
        throw e;
    }
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.id = task.id;

    const left = document.createElement('div');
    left.className = 'task-left';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = !!task.completed;

    const main = document.createElement('div');
    main.className = 'task-main';

    const titleRow = document.createElement('div');
    titleRow.className = 'task-title-row';

    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = task.title || '(Без названия)';

    const badge = document.createElement('span');
    badge.className = 'task-badge' + (task.completed ? ' completed' : '');
    badge.textContent = task.completed ? '✅ Готово' : '🟢 В работе';

    const description = document.createElement('p');
    description.className = 'task-description';
    description.textContent = task.description || 'Без описания';

    const meta = document.createElement('div');
    meta.className = 'task-meta';
    meta.textContent = `ID: ${task.id}`;

    if (task.completed) {
        title.classList.add('completed');
        description.classList.add('completed');
    }

    titleRow.appendChild(title);
    titleRow.appendChild(badge);
    main.appendChild(titleRow);
    main.appendChild(description);
    main.appendChild(meta);

    left.appendChild(checkbox);
    left.appendChild(main);

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.innerHTML = '<span class="btn-icon">🗑️</span><span class="btn-text">Удалить</span>';

    actions.appendChild(deleteBtn);

    li.appendChild(left);
    li.appendChild(actions);

    checkbox.addEventListener('change', () => {
        updateTask(task.id, {
            title: task.title,
            description: task.description,
            completed: checkbox.checked
        });
    });

    deleteBtn.addEventListener('click', () => {
        if (confirm('Удалить задачу?')) {
            deleteTask(task.id);
        }
    });

    return li;
}

function renderTasks(tasks) {
    elements.list.innerHTML = '';

    if (!tasks || tasks.length === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
    }

    elements.emptyState.classList.add('hidden');
    tasks
        .slice()
        .sort((a, b) => Number(a.completed) - Number(b.completed))
        .forEach(task => {
            const el = createTaskElement(task);
            elements.list.appendChild(el);
        });
}

async function loadTasks() {
    setStatus('Загружаем задачи...');
    try {
        const tasks = await fetchJson(API_BASE);
        renderTasks(tasks);
        setStatus(`Задач: ${tasks.length}`);
    } catch (e) {
        setStatus('Не удалось загрузить список задач', true);
    }
}

async function createTask(data) {
    setStatus('Создаём задачу...');
    try {
        await fetchJson(API_BASE, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        elements.form.reset();
        await loadTasks();
        setStatus('Задача добавлена');
    } catch (e) {
        setStatus('Не удалось создать задачу', true);
    }
}

async function updateTask(id, data) {
    setStatus('Обновляем задачу...');
    try {
        await fetchJson(`${API_BASE}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        await loadTasks();
        setStatus('Задача обновлена');
    } catch (e) {
        setStatus('Не удалось обновить задачу', true);
    }
}

async function deleteTask(id) {
    setStatus('Удаляем задачу...');
    try {
        await fetchJson(`${API_BASE}/${id}`, {
            method: 'DELETE'
        });
        await loadTasks();
        setStatus('Задача удалена');
    } catch (e) {
        setStatus('Не удалось удалить задачу', true);
    }
}

function initEvents() {
    elements.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = elements.title.value.trim();
        const description = elements.description.value.trim();

        if (!title) {
            elements.title.focus();
            return;
        }

        createTask({
            title,
            description,
            completed: false
        });
    });

    elements.refreshBtn.addEventListener('click', () => {
        loadTasks();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    loadTasks();
});

