package com.acme.app.caching.spi;

import java.util.function.Supplier;

public interface AppCache {
    <T> T get(String name, String key, Supplier<T> loader);
    void evict(String name, String key);
}
