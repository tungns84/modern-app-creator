# Spec 011: I18n Module

## Status

Draft

## Objective

Add the `i18n` module to `com.acme.app`.

## Module Boundary

```java
@ApplicationModule(allowedDependencies = { "shared", "appconfig::spi" })
package com.acme.app.i18n;
```
