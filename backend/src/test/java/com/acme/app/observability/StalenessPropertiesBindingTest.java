package com.acme.app.observability;

import com.acme.app.appconfig.spi.ObservabilityProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestPropertySource(properties = {
    "spring.autoconfigure.exclude=" +
        "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration," +
        "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration," +
        "org.springframework.boot.jdbc.autoconfigure.DataSourceTransactionManagerAutoConfiguration," +
        "org.springframework.modulith.events.jdbc.JdbcEventPublicationAutoConfiguration," +
        "org.springframework.modulith.events.config.EventPublicationAutoConfiguration," +
        "org.springframework.modulith.events.config.EventExternalizationAutoConfiguration"
})
class StalenessPropertiesBindingTest {

    @Autowired
    ObservabilityProperties observabilityProps;

    @Test
    void stalenessPublishedBindsToTenMinutes() {
        assertThat(observabilityProps.stalenessPublished()).isEqualTo(Duration.ofMinutes(10));
    }

    @Test
    void stalenessResubmittedBindsToThirtyMinutes() {
        assertThat(observabilityProps.stalenessResubmitted()).isEqualTo(Duration.ofMinutes(30));
    }
}
