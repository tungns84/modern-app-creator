package com.acme.app;

import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
@Tag("integration")
abstract class PostgresIntegrationTest {

    // Testcontainers 2.x + Boot 4: @ServiceConnection replaces @DynamicPropertySource
    // for datasource wiring. Do NOT use @DynamicPropertySource here.
    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine");
}
