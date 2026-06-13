package com.acme.app.i18n.spi;

import java.util.Locale;
import java.util.Set;

public interface MessageResolver {

    /**
     * Resolves a message key for the given locale.
     * Returns the key itself when no bundle entry exists.
     */
    String resolve(String key, Locale locale);

    Set<Locale> supportedLocales();
}
