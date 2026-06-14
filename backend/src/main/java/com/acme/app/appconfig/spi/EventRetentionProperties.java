package com.acme.app.appconfig.spi;

import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * Event Publication Registry completed-record cleanup threshold (D-10).
 * Default: completedAfter=7 days.
 */
@Validated
@ConfigurationProperties(prefix = "acme.events.retention")
public record EventRetentionProperties(
    @NotNull @DefaultValue("P7D") Duration completedAfter
) {}
