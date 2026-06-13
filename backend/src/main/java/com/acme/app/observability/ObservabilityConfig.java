package com.acme.app.observability;

import com.acme.app.appconfig.spi.EventRetentionProperties;
import com.acme.app.appconfig.spi.EventRetryProperties;
import com.acme.app.appconfig.spi.ObservabilityProperties;
import com.acme.app.shared.events.BoundedRetryListenerSupport;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.modulith.events.CompletedEventPublications;

@Configuration(proxyBeanMethods = false)
class ObservabilityConfig {

    private final ObservabilityProperties observabilityProps;
    private final EventRetryProperties retryProps;

    ObservabilityConfig(ObservabilityProperties observabilityProps, EventRetryProperties retryProps) {
        this.observabilityProps = observabilityProps;
        this.retryProps = retryProps;
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

    @Bean
    EventPublicationMetrics eventPublicationMetrics(MeterRegistry registry) {
        return new EventPublicationMetrics(registry);
    }

    @Bean
    BoundedRetryListenerSupport boundedRetryListenerSupport(EventPublicationMetrics metrics) {
        return new BoundedRetryListenerSupport(retryProps.maxAttempts(), metrics::incrementRetryBoundExceeded);
    }
}
