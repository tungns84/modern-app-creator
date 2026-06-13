package com.acme.app;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class SharedFlywaySchemaTest extends PostgresIntegrationTest {

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void sharedBaselineMigrationRecorded() {
        var count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE script LIKE '%V1__shared_baseline%'",
                Long.class);
        assertThat(count).isGreaterThan(0);
    }

    @Test
    void scheduledTaskAuditTableExists() {
        var count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables " +
                "WHERE table_schema = 'public' AND table_name = 'scheduled_task_audit'",
                Long.class);
        assertThat(count).isEqualTo(1L);
    }
}
