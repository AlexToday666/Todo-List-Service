# Todo List Service

Spring Boot сервис для управления задачами (CRUD) с модульной архитектурой, JWT-авторизацией и отдельным frontend.

## Архитектура

Проект организован как **модульный монолит**:
- **Backend**: Модульная структура с разделением по доменам (модули `task`, `user`, `auth`)
- **Frontend**: Отдельная папка `frontend/`, общается с backend через REST API
- **База данных**: PostgreSQL с миграциями Flyway
- **Безопасность**: JWT-токены для аутентификации, Spring Security

### Структура проекта

```
Todo-List-Service/
├── src/main/java/com/example/todo/
│   ├── config/              # Конфигурация (CORS, Security)
│   │   ├── CorsConfig.java
│   │   └── SecurityConfig.java
│   ├── auth/                # Модуль авторизации
│   │   ├── controller/      # REST контроллеры (register, login)
│   │   ├── dto/             # DTO для регистрации/входа
│   │   ├── filter/          # JWT фильтр аутентификации
│   │   └── service/         # JWT сервис
│   ├── user/                # Модуль пользователей
│   │   ├── model/           # Сущность User
│   │   ├── repository/      # Репозиторий пользователей
│   │   └── service/         # Сервис пользователей
│   ├── task/                # Модуль задач
│   │   ├── controller/      # REST контроллеры
│   │   ├── service/         # Бизнес-логика
│   │   ├── repository/      # Репозитории данных
│   │   ├── model/           # Сущности JPA
│   │   ├── dto/             # Data Transfer Objects
│   │   └── mapper/          # Мапперы между сущностями и DTO
│   └── TodoAppApplication.java
├── src/main/resources/
│   ├── application.yml      # Конфигурация приложения
│   └── db/migration/        # Flyway миграции
├── frontend/                # Отдельный frontend
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── docker-compose.yml       # Docker Compose конфигурация
├── Dockerfile               # Docker образ backend
└── pom.xml
```

## Требования

- **Java**: 17+ (проект собирается с `--release 17`)
- **Maven**: 3.8+
- **PostgreSQL**: 16+ (или используйте Docker Compose)
- **Docker** (опционально, для запуска через Docker Compose)

Проверка:

```bash
java -version
mvn -version
```

## Быстрый старт с Docker Compose

Самый простой способ запустить весь стек:

```bash
docker-compose up --build
```

Это запустит:
- PostgreSQL на порту `5432`
- Backend на порту `8080`

Frontend нужно запускать отдельно (см. раздел "Запуск Frontend").

## Запуск вручную

### 1. Запуск базы данных

#### Вариант А: PostgreSQL локально

Создайте базу данных:

```bash
createdb todo
# или через psql:
psql -U postgres
CREATE DATABASE todo;
CREATE USER todo WITH PASSWORD 'todo';
GRANT ALL PRIVILEGES ON DATABASE todo TO todo;
```

#### Вариант Б: PostgreSQL через Docker

```bash
docker run -d \
  --name todo-db \
  -e POSTGRES_DB=todo \
  -e POSTGRES_USER=todo \
  -e POSTGRES_PASSWORD=todo \
  -p 5432:5432 \
  postgres:16
```

### 2. Настройка приложения

Настройки подключения к БД находятся в `src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/todo
    username: todo
    password: todo
```

### 3. Запуск Backend

Из корня проекта:

```bash
mvn spring-boot:run
```

По умолчанию приложение стартует на `http://localhost:8080`.

**Миграции Flyway** применяются автоматически при первом запуске.

### 4. Запуск Frontend

Frontend находится в отдельной папке `frontend/` и должен запускаться отдельно.

#### Вариант 1: Простой HTTP сервер (Python)

```bash
cd frontend
python3 -m http.server 3000
```

Затем откройте в браузере: `http://localhost:3000`

#### Вариант 2: Node.js (http-server)

```bash
npm install -g http-server
cd frontend
http-server -p 3000
```

## REST API

### Авторизация

Все эндпоинты требуют JWT-токен в заголовке `Authorization: Bearer <token>`, кроме эндпоинтов регистрации и входа.

#### Регистрация

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "user123",
  "email": "user@example.com",
  "password": "password123"
}
```

**Ответ:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "Bearer"
}
```

#### Вход

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user123",
  "password": "password123"
}
```

**Ответ:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "Bearer"
}
```

### Задачи

**Базовый путь:** `/api/tasks`

Все эндпоинты требуют аутентификации (JWT токен).

#### Получить все задачи текущего пользователя

```http
GET /api/tasks
Authorization: Bearer <token>
```

#### Получить задачу по ID

```http
GET /api/tasks/{id}
Authorization: Bearer <token>
```

#### Создать задачу

```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Купить продукты",
  "description": "Хлеб, молоко",
  "completed": false
}
```

#### Обновить задачу

```http
PUT /api/tasks/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Купить продукты (обновлено)",
  "description": "Хлеб, молоко, сыр",
  "completed": true
}
```

#### Удалить задачу

```http
DELETE /api/tasks/{id}
Authorization: Bearer <token>
```

### Примеры с cURL

```bash
# Регистрация
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Вход и сохранение токена
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}' \
  | jq -r '.token')

# Создание задачи
curl -X POST http://localhost:8080/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Новая задача","description":"Описание","completed":false}'

# Получение всех задач
curl -X GET http://localhost:8080/api/tasks \
  -H "Authorization: Bearer $TOKEN"
```

## Безопасность

### JWT токены

- **Токен жизни**: 24 часа (настраивается в `application.yml`: `jwt.expiration`)
- **Секретный ключ**: настраивается в `application.yml`: `jwt.secret`
- **Формат**: Bearer токен в заголовке `Authorization`

### Изоляция данных

Каждый пользователь видит и может изменять только свои задачи. Задачи изолированы по `user_id`.

### CORS

Backend настроен для работы с отдельным frontend через CORS. Конфигурация находится в `com.example.todo.config.CorsConfig`.

## База данных

### Схема

- **users**: Пользователи системы (username, email, password)
- **tasks**: Задачи пользователей (title, description, complete, created_at, user_id)

### Миграции

Проект использует **Flyway** для управления миграциями базы данных. Миграции находятся в `src/main/resources/db/migration/`:

- `V1_init.sql` - создание таблицы tasks
- `V2_add_users.sql` - создание таблицы users и связи с tasks

Миграции применяются автоматически при запуске приложения.

## Модульная структура

Проект использует модульный монолит подход:
- Каждый домен (например, `task`, `user`, `auth`) имеет свою структуру с controller, service, repository, model, dto
- Легко добавлять новые модули по аналогии
- Все модули находятся в одном приложении, но логически разделены
- Общие компоненты (config) находятся в корне пакета

### Модули:

1. **auth** - Аутентификация и авторизация (JWT)
2. **user** - Управление пользователями
3. **task** - Управление задачами (CRUD)

## Разработка

### Сборка проекта

```bash
mvn clean package
```

### Запуск тестов

```bash
mvn test
```

### Проверка стиля кода

```bash
mvn checkstyle:check
```

## Частые проблемы

### Ошибка компиляции `release version 17 not supported`

Вы запускаете сборку на Java ниже 17. Установите JDK 17+ и убедитесь, что в PATH используется правильная версия:

```bash
java -version
```

### Ошибка подключения к базе данных

Убедитесь, что:
1. PostgreSQL запущен
2. База данных `todo` создана
3. Пользователь `todo` с паролем `todo` существует
4. В `application.yml` указаны правильные параметры подключения

### CORS ошибки при работе с frontend

Убедитесь, что:
1. Backend запущен на `http://localhost:8080`
2. Frontend запущен на другом порту (например, `http://localhost:3000`)
3. В `frontend/app.js` указан правильный `API_BASE_URL`
4. JWT токен правильно передается в заголовках запросов

### Ошибка "Invalid credentials" при логине

Проверьте:
1. Пользователь существует (зарегистрирован через `/api/auth/register`)
2. Имя пользователя и пароль указаны правильно
3. Пароль не должен быть закодирован (сервис сам кодирует его при регистрации)

### Задачи не отображаются после входа

Убедитесь, что:
1. JWT токен передается в заголовке `Authorization: Bearer <token>`
2. Токен не истек (срок жизни 24 часа)
3. Токен получен для правильного пользователя

## Технологии

- **Spring Boot 3.2.3** - основной фреймворк
- **Spring Security** - безопасность и авторизация
- **Spring Data JPA** - работа с БД
- **PostgreSQL** - база данных
- **Flyway** - миграции БД
- **JWT (jjwt)** - токены авторизации
- **Maven** - управление зависимостями
