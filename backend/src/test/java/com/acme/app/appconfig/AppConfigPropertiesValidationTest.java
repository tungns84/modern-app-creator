package com.acme.app.appconfig;

import com.acme.app.appconfig.spi.EventRetryProperties;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.time.Duration;
import java.util.Set;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AppConfigPropertiesValidationTest {

    static Validator validator;

    @BeforeAll
    static void setup() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    void validRetryPropertiesPassValidation() {
        var props = new EventRetryProperties(3, Duration.ofSeconds(10), 2.0, Duration.ofMinutes(5));
        Set<ConstraintViolation<EventRetryProperties>> violations = validator.validate(props);
        assertThat(violations).isEmpty();
    }

    @Test
    void maxAttemptsZeroFailsValidation() {
        var props = new EventRetryProperties(0, Duration.ofSeconds(10), 2.0, Duration.ofMinutes(5));
        Set<ConstraintViolation<EventRetryProperties>> violations = validator.validate(props);
        assertThat(violations)
            .as("maxAttempts=0 should violate @Min(1)")
            .isNotEmpty();
    }

    @Test
    void maxAttemptsAboveCeilingFailsValidation() {
        var props = new EventRetryProperties(21, Duration.ofSeconds(10), 2.0, Duration.ofMinutes(5));
        Set<ConstraintViolation<EventRetryProperties>> violations = validator.validate(props);
        assertThat(violations)
            .as("maxAttempts=21 should violate @Max(20)")
            .isNotEmpty();
    }

    @Test
    void multiplierBelowOneFailsValidation() {
        var props = new EventRetryProperties(3, Duration.ofSeconds(10), 0.5, Duration.ofMinutes(5));
        Set<ConstraintViolation<EventRetryProperties>> violations = validator.validate(props);
        assertThat(violations)
            .as("multiplier=0.5 should violate @DecimalMin(1.0)")
            .isNotEmpty();
    }
}
