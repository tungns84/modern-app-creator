package com.acme.app.observability;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;

class EventPublicationMetrics {

    private final Counter retryBoundExceeded;

    EventPublicationMetrics(MeterRegistry registry) {
        this.retryBoundExceeded = Counter.builder("acme.events.retry.bound.exceeded")
                .description("Event listener retry bound exceeded count")
                .register(registry);
    }

    void incrementRetryBoundExceeded() {
        retryBoundExceeded.increment();
    }
}
