package com.acme.app.appconfig.spi;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * Bounded-retry configuration for Spring Modulith event publication (D-12).
 * Defaults: maxAttempts=3, initialDelay=PT10S, multiplier=2.0, maxDelay=PT5M.
 */
@Validated
@ConfigurationProperties(prefix = "acme.events.retry")
public record EventRetryProperties(
    @Min(1) @Max(20) @DefaultValue("3") int maxAttempts,
    @NotNull @DefaultValue("PT10S") Duration initialDelay,
    @DecimalMin("1.0") @DefaultValue("2.0") double multiplier,
    @NotNull @DefaultValue("PT5M") Duration maxDelay
) {}
