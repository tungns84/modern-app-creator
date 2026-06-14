package com.acme.app.shared.query;

public interface NativeQuery<T> {
    T execute();
}
