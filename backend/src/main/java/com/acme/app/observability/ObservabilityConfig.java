package com.acme.app.observability;

import com.acme.app.appconfig.spi.EventRetentionProperties;
import com.acme.app.appconfig.spi.ObservabilityProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.modulith.events.CompletedEventPublications;

@Configuration(proxyBeanMethods = false)
class ObservabilityConfig {

    private final ObservabilityProperties observabilityProps;

    ObservabilityConfig(ObservabilityProperties observabilityProps) {
        this.observabilityProps = observabilityProps;
    }

    @Bean
    MdcAllowlistFilter mdcAllowlistFilter() {
        return new MdcAllowlistFilter(observabilityProps);
    }

    @Bean
    @ConditionalOnBean(CompletedEventPublications.class)
    EventPublicationCleanupTask eventPublicationCleanupTask(
            CompletedEventPublications completedEvents,
            EventRetentionProperties retention) {
        return new EventPublicationCleanupTask(completedEvents, retention);
    }
}
