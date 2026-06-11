package com.acme.spike;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Proves Mockito 5.20 (Byte Buddy) can mock interfaces AND concrete classes on JDK 25. */
class GreetingServiceTest {

    @Test
    void mocksInterfaceCollaborator() {
        PrefixProvider provider = mock(PrefixProvider.class);
        when(provider.prefix()).thenReturn("Hello");

        assertEquals("Hello jdk25", new GreetingService(provider).greet("jdk25"));
    }

    @Test
    void mocksConcreteClass() {
        GreetingService service = mock(GreetingService.class);
        when(service.greet("x")).thenReturn("mocked");

        assertEquals("mocked", service.greet("x"));
    }
}
