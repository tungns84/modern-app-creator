package com.acme.app.observability;

import java.util.UUID;

record SampleEvent(UUID id, String payload) {}
