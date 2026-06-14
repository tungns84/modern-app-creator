package com.acme.app.observability;

import com.acme.app.appconfig.spi.ObservabilityProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.modulith.test.ApplicationModuleTest;
import org.springframework.modulith.test.ApplicationModuleTest.BootstrapMode;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@ApplicationModuleTest(mode = BootstrapMode.DIRECT_DEPENDENCIES)
@TestPropertySource(properties = {
    "spring.autoconfigure.exclude=" +
        "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration," +
        "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration," +
        "org.springframework.boot.jdbc.autoconfigure.DataSourceTransactionManagerAutoConfiguration," +
        "org.springframework.modulith.events.jdbc.JdbcEventPublicationAutoConfiguration," +
        "org.springframework.modulith.events.config.EventPublicationAutoConfiguration," +
        "org.springframework.modulith.events.config.EventExternalizationAutoConfiguration"
})
class ObservabilityModuleTest {

    @Autowired
    MdcAllowlistFilter mdcAllowlistFilter;

    @Autowired
    ObservabilityProperties observabilityProps;

    @Test
    void moduleStructureIsValid() {
        // Modulith verifies boundaries on context startup — no assertions needed
    }

    @Test
    void mdcAllowlistFilterIsRegisteredAsBean() {
        assertThat(mdcAllowlistFilter).isNotNull();
    }

    @Test
    void observabilityPropertiesMdcDefaultsArePresent() {
        assertThat(observabilityProps.mdcAllowedKeys())
                .containsExactlyInAnyOrder("traceId", "spanId", "tenantId", "userId");
    }
}
