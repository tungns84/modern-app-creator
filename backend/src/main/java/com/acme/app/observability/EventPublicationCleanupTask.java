package com.acme.app.observability;

import com.acme.app.appconfig.spi.EventRetentionProperties;
import com.acme.app.shared.scheduling.ScheduledTask;
import org.springframework.modulith.events.CompletedEventPublications;

class EventPublicationCleanupTask implements ScheduledTask {

    private final CompletedEventPublications completedEvents;
    private final EventRetentionProperties retention;

    EventPublicationCleanupTask(CompletedEventPublications completedEvents,
                                 EventRetentionProperties retention) {
        this.completedEvents = completedEvents;
        this.retention = retention;
    }

    @Override
    public String name() {
        return "event-publication-cleanup";
    }

    @Override
    public void execute() {
        completedEvents.deletePublicationsOlderThan(retention.completedAfter());
    }
}
