CREATE TABLE IF NOT EXISTS side_effect (
    id        BIGSERIAL    PRIMARY KEY,
    event_id  UUID         NOT NULL UNIQUE
);
