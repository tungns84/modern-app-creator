package com.acme.app.observability;

import com.acme.app.shared.events.BoundedRetryListenerSupport;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("unit")
class BoundedRetryTest {

    @Test
    void doesNotExceedWithinBound() {
        var callCount = new AtomicInteger(0);
        var support = new BoundedRetryListenerSupport(2, callCount::incrementAndGet);
        var id = UUID.randomUUID();

        support.guard(id); // attempt 1
        support.guard(id); // attempt 2 — still within bound

        assertThat(callCount.get()).isEqualTo(0);
    }

    @Test
    void throwsAndCallsCallbackOnExceed() {
        var callCount = new AtomicInteger(0);
        var support = new BoundedRetryListenerSupport(2, callCount::incrementAndGet);
        var id = UUID.randomUUID();

        support.guard(id);
        support.guard(id);

        assertThatThrownBy(() -> support.guard(id))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Retry bound of 2 exceeded");

        assertThat(callCount.get()).isEqualTo(1);
    }

    @Test
    void independentCountersPerEventId() {
        var support = new BoundedRetryListenerSupport(1, () -> {});
        var id1 = UUID.randomUUID();
        var id2 = UUID.randomUUID();

        support.guard(id1);
        support.guard(id2); // independent counter — no exception
    }

    @Test
    void markCompletedResetsCounter() {
        var support = new BoundedRetryListenerSupport(1, () -> {});
        var id = UUID.randomUUID();

        support.guard(id); // attempt 1 — at bound
        support.markCompleted(id); // reset
        support.guard(id); // attempt 1 again — OK
    }
}
