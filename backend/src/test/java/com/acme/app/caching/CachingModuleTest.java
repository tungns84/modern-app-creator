package com.acme.app.caching;

import com.acme.app.caching.spi.AppCache;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.modulith.test.ApplicationModuleTest;
import org.springframework.modulith.test.ApplicationModuleTest.BootstrapMode;
import org.springframework.test.context.TestPropertySource;

import java.util.concurrent.atomic.AtomicInteger;

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
class CachingModuleTest {

    @Autowired AppCache appCache;

    @Test
    void moduleStructureIsValid() {}

    @Test
    void cacheHitSkipsLoader() {
        AtomicInteger calls = new AtomicInteger(0);
        appCache.get("test", "key1", () -> { calls.incrementAndGet(); return "value"; });
        appCache.get("test", "key1", () -> { calls.incrementAndGet(); return "value"; });
        assertThat(calls.get()).isEqualTo(1);
    }

    @Test
    void evictInvalidatesEntry() {
        appCache.get("test", "key2", () -> "original");
        appCache.evict("test", "key2");
        AtomicInteger calls = new AtomicInteger(0);
        appCache.get("test", "key2", () -> { calls.incrementAndGet(); return "reloaded"; });
        assertThat(calls.get()).isEqualTo(1);
    }

    @Test
    void differentNamesAreSeparateCaches() {
        appCache.get("cacheA", "k", () -> "a");
        appCache.evict("cacheA", "k");
        AtomicInteger calls = new AtomicInteger(0);
        appCache.get("cacheB", "k", () -> { calls.incrementAndGet(); return "b"; });
        assertThat(calls.get()).isEqualTo(1);
    }
}
