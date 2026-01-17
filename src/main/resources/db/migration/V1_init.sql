CREATE TABLE tasks (
                       id BIGSERIAL PRIMARY KEY,
                       title VARCHAR(255) NOT NULL,
                       description TEXT,
                       complete BOOLEAN NOT NULL DEFAULT FALSE,
                       created_at TIMESTAMP NOT NULL
);
