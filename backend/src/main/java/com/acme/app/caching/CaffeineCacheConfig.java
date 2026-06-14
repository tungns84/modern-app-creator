package com.acme.app.caching;

import com.acme.app.appconfig.spi.CacheProperties;
import com.acme.app.caching.spi.AppCache;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

@Configuration(proxyBeanMethods = false)
class CaffeineCacheConfig {

    private final CacheProperties props;

    CaffeineCacheConfig(CacheProperties props) {
        this.props = props;
    }

    @Bean
    AppCache appCache() {
        ConcurrentHashMap<String, Cache<String, Object>> caches = new ConcurrentHashMap<>();
        return new AppCache() {
            @Override
            @SuppressWarnings("unchecked")
            public <T> T get(String name, String key, Supplier<T> loader) {
                Cache<String, Object> cache = caches.computeIfAbsent(name, n ->
                        Caffeine.newBuilder()
                                .maximumSize(props.maxSize())
                                .expireAfterWrite(props.ttl())
                                .build());
                return (T) cache.get(key, k -> loader.get());
            }

            @Override
            public void evict(String name, String key) {
                Cache<String, Object> cache = caches.get(name);
                if (cache != null) {
                    cache.invalidate(key);
                }
            }
        };
    }
}
