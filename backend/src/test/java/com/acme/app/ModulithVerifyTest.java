package com.acme.app;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

import static org.assertj.core.api.Assertions.assertThat;

class ModulithVerifyTest {

    // Phase-02 module set; updated per plan as modules are added (Phase 3 adds "iam")
    static final Set<String> BASE_MODULES = Set.of("shared", "appconfig", "caching", "i18n", "observability");

    @Test
    void modulesVerify() {
        var modules = ApplicationModules.of(Application.class);
        modules.verify();

        // bpm.enabled=false via -Pbpm-off (Plan 01 state: no bpm package yet)
        // bpm.enabled=true when bpm module is scaffolded (Plan 07+)
        boolean bpmEnabled = Boolean.parseBoolean(
                System.getProperty("bpm.enabled", "false"));

        var expected = new HashSet<>(BASE_MODULES);
        if (bpmEnabled) {
            expected.add("bpm");
        }

        var actual = modules.stream()
                .map(m -> m.getName())
                .collect(Collectors.toSet());

        assertThat(actual).isEqualTo(expected);
    }
}
