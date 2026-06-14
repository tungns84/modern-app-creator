package com.acme.app.i18n;

import com.acme.app.appconfig.spi.I18nProperties;
import com.acme.app.i18n.spi.MessageResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;

@Configuration(proxyBeanMethods = false)
class I18nConfig {

    private final I18nProperties props;

    I18nConfig(I18nProperties props) {
        this.props = props;
    }

    @Bean
    MessageResolver messageResolver() {
        var source = new ResourceBundleMessageSource();
        source.setBasename("i18n/messages");
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        return new DefaultMessageResolver(source, props);
    }
}
