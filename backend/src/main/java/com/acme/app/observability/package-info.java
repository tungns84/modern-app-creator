@org.springframework.modulith.ApplicationModule(
    allowedDependencies = { "shared", "shared::scheduling", "shared::events", "appconfig::spi" }
)
package com.acme.app.observability;
