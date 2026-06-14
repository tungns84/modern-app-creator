package com.acme.app.appconfig.spi;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "acme.i18n")
public record I18nProperties(
    @DefaultValue("vi") String defaultLocale,
    @DefaultValue({"vi", "en"}) List<String> supportedLocales
) {}
