package com.acme.app.appconfig;

import com.acme.app.appconfig.spi.EventRetentionProperties;
import com.acme.app.appconfig.spi.EventRetryProperties;
import com.acme.app.appconfig.spi.ObservabilityProperties;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.modulith.test.ApplicationModuleTest;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@ApplicationModuleTest
@TestPropertySource(properties = {
    "spring.autoconfigure.exclude=" +
        "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration," +
        "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration," +
        "org.springframework.boot.jdbc.autoconfigure.DataSourceTransactionManagerAutoConfiguration," +
        "org.springframework.modulith.events.jdbc.JdbcEventPublicationAutoConfiguration," +
        "org.springframework.modulith.events.config.EventPublicationAutoConfiguration," +
        "org.springframework.modulith.events.config.EventExternalizationAutoConfiguration"
})
class AppConfigModuleTest {

    @Autowired EventRetryProperties retryProps;
    @Autowired EventRetentionProperties retentionProps;
    @Autowired ObservabilityProperties observabilityProps;

    @Test
    void moduleStructureIsValid() {
        // Spring Modulith verifies module boundaries on context startup
    }

    @Test
    void retryPropertiesHaveCorrectDefaults() {
        assertThat(retryProps.maxAttempts()).isEqualTo(3);
        assertThat(retryProps.initialDelay()).isEqualTo(Duration.ofSeconds(10));
        assertThat(retryProps.multiplier()).isEqualTo(2.0);
        assertThat(retryProps.maxDelay()).isEqualTo(Duration.ofMinutes(5));
    }

    @Test
    void retentionPropertiesHaveCorrectDefault() {
        assertThat(retentionProps.completedAfter()).isEqualTo(Duration.ofDays(7));
    }

    @Test
    void observabilityPropertiesHaveDefaultKeys() {
        assertThat(observabilityProps.mdcAllowedKeys())
            .contains("traceId", "spanId", "tenantId", "userId");
    }
}
