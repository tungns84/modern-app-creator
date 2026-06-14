package com.acme.app.observability;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
    "spring.autoconfigure.exclude=" +
        "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration," +
        "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration," +
        "org.springframework.boot.jdbc.autoconfigure.DataSourceTransactionManagerAutoConfiguration," +
        "org.springframework.modulith.events.jdbc.JdbcEventPublicationAutoConfiguration," +
        "org.springframework.modulith.events.config.EventPublicationAutoConfiguration," +
        "org.springframework.modulith.events.config.EventExternalizationAutoConfiguration"
})
class ActuatorProbeTest {

    @Value("${local.server.port}")
    int port;

    private final RestTemplate http = new RestTemplate();

    @Test
    void livenessReturnsUp() {
        var response = http.getForEntity(
            "http://localhost:" + port + "/actuator/health/liveness", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void readinessReturnsUp() {
        var response = http.getForEntity(
            "http://localhost:" + port + "/actuator/health/readiness", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
