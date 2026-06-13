package com.acme.app.shared.events;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Tracks per-event attempt counts and enforces a retry ceiling.
 * Caller must invoke {@link #guard(UUID)} at the start of each listener attempt.
 * Throws {@link IllegalStateException} when {@code maxAttempts} is exceeded so the
 * EPR publication remains INCOMPLETE for operator intervention.
 */
public class BoundedRetryListenerSupport {

    private final int maxAttempts;
    private final Runnable onBoundExceeded;
    private final ConcurrentHashMap<UUID, AtomicInteger> attemptCounts = new ConcurrentHashMap<>();

    public BoundedRetryListenerSupport(int maxAttempts, Runnable onBoundExceeded) {
        this.maxAttempts = maxAttempts;
        this.onBoundExceeded = onBoundExceeded;
    }

    public void guard(UUID eventId) {
        int count = attemptCounts.computeIfAbsent(eventId, k -> new AtomicInteger(0)).incrementAndGet();
        if (count > maxAttempts) {
            onBoundExceeded.run();
            throw new IllegalStateException(
                    "Retry bound of " + maxAttempts + " exceeded for event " + eventId);
        }
    }

    public void markCompleted(UUID eventId) {
        attemptCounts.remove(eventId);
    }
}
