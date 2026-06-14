package com.acme.app.observability;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.modulith.events.IncompleteEventPublications;
import org.springframework.transaction.support.TransactionTemplate;

import com.acme.app.PostgresIntegrationTest;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestEventConfig.class)
class KillListenerTest extends PostgresIntegrationTest {

    @Autowired ApplicationEventPublisher publisher;
    @Autowired IncompleteEventPublications incompletePublications;
    @Autowired SampleEventListener listener;
    @Autowired JdbcTemplate jdbc;
    @Autowired TransactionTemplate tx;

    @Test
    void eventNotLostOnListenerDeath() {
        var id = UUID.randomUUID();
        listener.setFailNext(true);

        // Publish inside a committed TX; listener fires AFTER_COMMIT and throws.
        // Spring may or may not propagate the afterCommit exception — handle both.
        try {
            tx.execute(status -> {
                publisher.publishEvent(new SampleEvent(id, "kill-test"));
                return null;
            });
        } catch (RuntimeException ignored) {}

        // Listener threw before any write — EPR publication is INCOMPLETE
        assertThat(sideEffects(id)).isEqualTo(0);

        // Resubmit drives the listener synchronously via processEvent()
        incompletePublications.resubmitIncompletePublicationsOlderThan(Duration.ZERO);

        assertThat(sideEffects(id)).isEqualTo(1);
    }

    @Test
    void sideEffectAppliedExactlyOnceAfterRedelivery() {
        var id = UUID.randomUUID();
        listener.setFailNext(true);

        try {
            tx.execute(status -> {
                publisher.publishEvent(new SampleEvent(id, "idempotency-test"));
                return null;
            });
        } catch (RuntimeException ignored) {}

        assertThat(sideEffects(id)).isEqualTo(0);

        incompletePublications.resubmitIncompletePublicationsOlderThan(Duration.ZERO);
        incompletePublications.resubmitIncompletePublicationsOlderThan(Duration.ZERO);

        assertThat(sideEffects(id)).isEqualTo(1);
    }

    private int sideEffects(UUID id) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM side_effect WHERE event_id = ?", Integer.class, id);
        return count != null ? count : 0;
    }
}
