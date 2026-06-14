package com.acme.app.i18n;

import com.acme.app.appconfig.spi.I18nProperties;
import com.acme.app.i18n.spi.MessageResolver;
import org.springframework.context.support.ResourceBundleMessageSource;

import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

class DefaultMessageResolver implements MessageResolver {

    private final ResourceBundleMessageSource messageSource;
    private final I18nProperties props;

    DefaultMessageResolver(ResourceBundleMessageSource messageSource, I18nProperties props) {
        this.messageSource = messageSource;
        this.props = props;
    }

    @Override
    public String resolve(String key, Locale locale) {
        return messageSource.getMessage(key, null, key, locale);
    }

    @Override
    public Set<Locale> supportedLocales() {
        return props.supportedLocales().stream()
                .map(Locale::forLanguageTag)
                .collect(Collectors.toUnmodifiableSet());
    }
}
