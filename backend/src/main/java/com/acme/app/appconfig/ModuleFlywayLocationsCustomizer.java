package com.acme.app.appconfig;

import org.flywaydb.core.api.configuration.FluentConfiguration;
import org.springframework.boot.flyway.autoconfigure.FlywayConfigurationCustomizer;
import org.springframework.stereotype.Component;

/**
 * Single owner of all per-module Flyway migration locations.
 * Other modules with hasTables=true append their location via the new-module scaffold.
 * Replaces the static spring.flyway.locations config entry.
 */
@Component
class ModuleFlywayLocationsCustomizer implements FlywayConfigurationCustomizer {

    @Override
    public void customize(FluentConfiguration configuration) {
        configuration.locations(
            "classpath:db/migration/shared"
        );
    }
}
