# Spec 010: Appconfig Module

## Status

Draft

## Objective

Add the `appconfig` module to `com.acme.app`.

## Module Boundary

```java
@ApplicationModule(allowedDependencies = { "shared" })
package com.acme.app.appconfig;
```
