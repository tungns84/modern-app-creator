package com.acme.app.observability;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;

@TestConfiguration
class TestEventConfig {

    @Bean
    SampleEventListener sampleEventListener(JdbcTemplate jdbc) {
        return new SampleEventListener(jdbc);
    }
}
