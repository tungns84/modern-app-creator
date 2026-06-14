package com.acme.app.observability;

import com.acme.app.appconfig.spi.ObservabilityProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MdcAllowlistTest {

    private final ObservabilityProperties props = new ObservabilityProperties(
            List.of("requestId", "traceId", "spanId", "tenantId", "userId"),
            Duration.ofMinutes(10),
            Duration.ofMinutes(30));

    private final MdcAllowlistFilter filter = new MdcAllowlistFilter(props);

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void allowlistedKeyIsPreservedAfterRequest() throws Exception {
        MDC.put("requestId", "req-123");

        filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(MDC.get("requestId")).isEqualTo("req-123");
    }

    @Test
    void nonAllowlistedPiiKeyIsRemovedAfterRequest() throws Exception {
        MDC.put("requestId", "req-123");
        MDC.put("email", "user@example.com");

        filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(MDC.get("email")).isNull();
        assertThat(MDC.get("requestId")).isEqualTo("req-123");
    }

    @Test
    void allNonAllowlistedKeysAreRemovedWhenMdcHasMultiplePiiFields() throws Exception {
        MDC.put("traceId", "trace-abc");
        MDC.put("email", "user@example.com");
        MDC.put("ssn", "123-45-6789");
        MDC.put("phone", "0912345678");

        filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(MDC.get("traceId")).isEqualTo("trace-abc");
        assertThat(MDC.get("email")).isNull();
        assertThat(MDC.get("ssn")).isNull();
        assertThat(MDC.get("phone")).isNull();
    }
}
