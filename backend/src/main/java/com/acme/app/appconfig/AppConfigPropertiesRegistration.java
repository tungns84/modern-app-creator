package com.acme.app.appconfig;

import com.acme.app.appconfig.spi.CacheProperties;
import com.acme.app.appconfig.spi.EventRetentionProperties;
import com.acme.app.appconfig.spi.EventRetryProperties;
import com.acme.app.appconfig.spi.I18nProperties;
import com.acme.app.appconfig.spi.ObservabilityProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties({
    EventRetryProperties.class,
    EventRetentionProperties.class,
    ObservabilityProperties.class,
    I18nProperties.class,
    CacheProperties.class
})
class AppConfigPropertiesRegistration {}
