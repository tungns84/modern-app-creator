package com.acme.app.i18n;

import com.acme.app.i18n.spi.MessageResolver;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.modulith.test.ApplicationModuleTest;
import org.springframework.modulith.test.ApplicationModuleTest.BootstrapMode;
import org.springframework.test.context.TestPropertySource;

import java.util.Locale;

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
class I18nModuleTest {

    @Autowired MessageResolver messageResolver;

    @Test
    void moduleStructureIsValid() {
        // Spring Modulith verifies module boundaries on context startup
    }

    @Test
    void resolvesVietnamese() {
        assertThat(messageResolver.resolve("greeting", Locale.forLanguageTag("vi")))
                .isEqualTo("Xin chào");
    }

    @Test
    void resolvesEnglish() {
        assertThat(messageResolver.resolve("greeting", Locale.forLanguageTag("en")))
                .isEqualTo("Hello");
    }

    @Test
    void missingKeyReturnsKey() {
        assertThat(messageResolver.resolve("nonexistent.key", Locale.ENGLISH))
                .isEqualTo("nonexistent.key");
    }

    @Test
    void supportedLocalesIncludesViAndEn() {
        assertThat(messageResolver.supportedLocales())
                .containsExactlyInAnyOrder(
                        Locale.forLanguageTag("vi"),
                        Locale.forLanguageTag("en")
                );
    }
}
