package com.acme.spike;

/** Concrete class with a collaborator — Mockito/Byte Buddy probe target. */
public class GreetingService {
    private final PrefixProvider prefixProvider;

    public GreetingService(PrefixProvider prefixProvider) {
        this.prefixProvider = prefixProvider;
    }

    public String greet(String name) {
        return prefixProvider.prefix() + " " + name;
    }
}
