package com.acme.app.observability;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.event.TransactionalEventListener;

class SampleEventListener {

    private final JdbcTemplate jdbc;
    private volatile boolean failNext;

    SampleEventListener(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    void setFailNext(boolean fail) {
        this.failNext = fail;
    }

    @TransactionalEventListener
    void on(SampleEvent event) {
        if (failNext) {
            failNext = false;
            throw new RuntimeException("Simulated listener failure — EPR publication stays INCOMPLETE");
        }
        Integer exists = jdbc.queryForObject(
                "SELECT COUNT(*) FROM side_effect WHERE event_id = ?", Integer.class, event.id());
        if (exists == null || exists == 0) {
            jdbc.update("INSERT INTO side_effect (event_id) VALUES (?)", event.id());
        }
    }
}
