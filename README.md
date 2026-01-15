# Todo List Service

Spring Boot сервис для управления задачами (CRUD) с простым web-интерфейсом.

## Требования

- Java: 17+ (проект собирается с `--release 17`)
- Maven: 3.8+

Проверка:

```bash
java -version
mvn -version
```

## Запуск

Из корня проекта:

```bash
mvn spring-boot:run
```

По умолчанию приложение стартует на `http://localhost:8080`.

## Web-интерфейс (frontend)

Frontend расположен в `src/main/resources/static/` и раздаётся самим Spring Boot.

Откройте в браузере:

- `http://localhost:8080/`
- или `http://localhost:8080/index.html`

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

## Частые проблемы

### Ошибка компиляции `release version 17 not supported`

Вы запускаете сборку на Java ниже 17. Установите JDK 17+ и убедитесь, что в PATH используется правильная версия:

```bash
java -version
```

