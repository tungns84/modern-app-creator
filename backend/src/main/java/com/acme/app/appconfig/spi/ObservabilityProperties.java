package com.acme.app.appconfig.spi;

import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * MDC PII allowlist and Modulith event-publication staleness thresholds (D-12).
 */
@Validated
@ConfigurationProperties(prefix = "acme.observability")
public record ObservabilityProperties(
    @DefaultValue({"traceId", "spanId", "tenantId", "userId"}) List<String> mdcAllowedKeys,
    @NotNull @DefaultValue("PT10M") Duration stalenessPublished,
    @NotNull @DefaultValue("PT30M") Duration stalenessResubmitted
) {}
