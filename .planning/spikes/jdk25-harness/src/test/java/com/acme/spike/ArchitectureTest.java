package com.acme.spike;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Proves ArchUnit 1.4.2 can READ class files emitted by javac --release 25
 * (class file major version 69). Older ArchUnit fails at import time with
 * "Unsupported class file major version".
 */
class ArchitectureTest {

    @Test
    void archunitReadsJdk25ClassFilesAndChecksARule() {
        JavaClasses classes = new ClassFileImporter().importPackages("com.acme.spike");
        assertFalse(classes.isEmpty(), "ArchUnit must import compiled JDK 25 classes");

        ArchRule rule = noClasses()
                .should().dependOnClassesThat().resideInAPackage("java.sql..");
        rule.check(classes);
    }
}
