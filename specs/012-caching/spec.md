# Spec 012: Caching Module

## Status

Draft

## Objective

Add the `caching` module to `com.acme.app`.

## Module Boundary

```java
@ApplicationModule(allowedDependencies = { "shared", "appconfig::spi" })
package com.acme.app.caching;
```
