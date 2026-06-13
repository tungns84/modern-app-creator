CREATE TABLE IF NOT EXISTS scheduled_task_audit (
    id            BIGSERIAL    PRIMARY KEY,
    task_name     VARCHAR(255) NOT NULL,
    executed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    duration_ms   BIGINT,
    outcome       VARCHAR(50)  NOT NULL,
    error_message TEXT
);
