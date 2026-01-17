CREATE TABLE users
(
    id         BIGSERIAL PRIMARY KEY,
    username   VARCHAR(50) UNIQUE  NOT NULL,
    email      VARCHAR(255) UNIQUE NOT NULL,
    password   VARCHAR(255)        NOT NULL,
    created_at TIMESTAMP           NOT NULL
);

ALTER TABLE tasks
    ADD COLUMN user_id BIGINT NOT NULL
CREATE INDEX idx_tasks_user_id ON tasks (user_id);