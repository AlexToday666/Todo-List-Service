# Todo List Service

Spring Boot сервис для управления задачами (CRUD) с модульной архитектурой и отдельным frontend.

## Архитектура

Проект организован как **модульный монолит**:
- **Backend**: Модульная структура с разделением по доменам (модуль `task`)
- **Frontend**: Отдельная папка `frontend/`, общается с backend через REST API

### Структура проекта

```
Todo-List-Service/
├── src/main/java/com/example/todo/
│   ├── config/              # Конфигурация (CORS и т.д.)
│   ├── task/                # Модуль задач
│   │   ├── controller/      # REST контроллеры
│   │   ├── service/         # Бизнес-логика
│   │   ├── repository/      # Репозитории данных
│   │   ├── model/           # Сущности JPA
│   │   ├── dto/             # Data Transfer Objects
│   │   └── mapper/          # Мапперы между сущностями и DTO
│   └── TodoAppApplication.java
├── frontend/                # Отдельный frontend
│   ├── index.html
│   ├── app.js
│   └── styles.css
└── pom.xml
```

## Требования

- Java: 17+ (проект собирается с `--release 17`)
- Maven: 3.8+

Проверка:

```bash
java -version
mvn -version
```

## Запуск Backend

Из корня проекта:

```bash
mvn spring-boot:run
```

По умолчанию приложение стартует на `http://localhost:8080`.

## Запуск Frontend

Frontend находится в отдельной папке `frontend/` и должен запускаться отдельно.

### Вариант 1: Простой HTTP сервер (Python)

```bash
cd frontend
python3 -m http.server 3000
```

Затем откройте в браузере: `http://localhost:3000`

### Вариант 2: Node.js (http-server)

```bash
npm install -g http-server
cd frontend
http-server -p 3000
```

### Настройка API URL

Если backend запущен на другом порту или хосте, измените константу `API_BASE_URL` в файле `frontend/app.js`:

```javascript
const API_BASE_URL = 'http://localhost:8080/api/tasks';
```

## REST API

Базовый путь: `/api/tasks`

- `GET /api/tasks` — список задач
- `GET /api/tasks/{id}` — получить задачу по id
- `POST /api/tasks` — создать задачу
- `PUT /api/tasks/{id}` — обновить задачу
- `DELETE /api/tasks/{id}` — удалить задачу

Тело запроса для `POST`/`PUT`:

```json
{
  "title": "Купить продукты",
  "description": "Хлеб, молоко",
  "completed": false
}
```

### CORS

Backend настроен для работы с отдельным frontend через CORS. Конфигурация находится в `com.example.todo.config.CorsConfig`.

## Модульная структура

Проект использует модульный монолит подход:
- Каждый домен (например, `task`) имеет свою структуру с controller, service, repository, model, dto, mapper
- Легко добавлять новые модули по аналогии
- Все модули находятся в одном приложении, но логически разделены

## Частые проблемы

### Ошибка компиляции `release version 17 not supported`

Вы запускаете сборку на Java ниже 17. Установите JDK 17+ и убедитесь, что в PATH используется правильная версия:

```bash
java -version
```

### CORS ошибки при работе с frontend

Убедитесь, что:
1. Backend запущен на `http://localhost:8080`
2. Frontend запущен на другом порту (например, `http://localhost:3000`)
3. В `frontend/app.js` указан правильный `API_BASE_URL`

### Frontend не может подключиться к API

Проверьте:
1. Backend запущен и доступен
2. URL в `frontend/app.js` правильный
3. CORS настроен правильно (должен быть настроен автоматически)
