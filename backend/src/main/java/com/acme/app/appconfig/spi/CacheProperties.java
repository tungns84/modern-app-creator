package com.acme.app.appconfig.spi;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "acme.cache")
public record CacheProperties(
    @DefaultValue("PT10M") Duration ttl,
    @DefaultValue("1000") int maxSize
) {}
