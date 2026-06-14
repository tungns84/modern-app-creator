package com.acme.app.observability;

import com.acme.app.appconfig.spi.ObservabilityProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

class MdcAllowlistFilter extends OncePerRequestFilter {

    private final Set<String> allowedKeys;

    MdcAllowlistFilter(ObservabilityProperties props) {
        this.allowedKeys = Set.copyOf(props.mdcAllowedKeys());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            chain.doFilter(request, response);
        } finally {
            var contextMap = MDC.getCopyOfContextMap();
            if (contextMap != null) {
                contextMap.keySet().stream()
                        .filter(key -> !allowedKeys.contains(key))
                        .forEach(MDC::remove);
            }
        }
    }
}
