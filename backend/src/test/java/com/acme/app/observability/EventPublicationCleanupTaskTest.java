package com.acme.app.observability;

import com.acme.app.appconfig.spi.EventRetentionProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.modulith.events.CompletedEventPublications;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class EventPublicationCleanupTaskTest {

    @Mock
    CompletedEventPublications completedEvents;

    @Test
    void nameIsEventPublicationCleanup() {
        var task = new EventPublicationCleanupTask(completedEvents, new EventRetentionProperties(Duration.ofDays(7)));

        assertThat(task.name()).isEqualTo("event-publication-cleanup");
    }

    @Test
    void executeCallsDeleteOlderThanWithConfiguredRetentionDuration() {
        var retention = new EventRetentionProperties(Duration.ofDays(7));
        var task = new EventPublicationCleanupTask(completedEvents, retention);

        task.execute();

        verify(completedEvents).deletePublicationsOlderThan(Duration.ofDays(7));
    }
}
