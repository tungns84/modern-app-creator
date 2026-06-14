package com.acme.app;

import com.acme.app.shared.query.NativeQuery;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RestController;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noFields;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noMethods;

// Q-3: @AnalyzeClasses + @ArchTest with JUnit 6 unconfirmed — using plain @Test + ClassFileImporter
class ArchitectureGatesTest {

    static JavaClasses classes;

    @BeforeAll
    static void importClasses() {
        // DO_NOT_INCLUDE_TESTS: exclude test classes so @Autowired fields in test
        // helpers (e.g. PostgresIntegrationTest) don't trigger NO_FIELD_INJECTION.
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.acme.app");
    }

    // ArchUnit 1.4.x: FieldsShould/MethodsShould have no exist() method.
    // Pattern: noXxx().that(NARROWING).should(CONDITION) — move the "bad thing"
    // from .that() to .should() and the narrowing stays in .that().
    //
    // allowEmptyShould(true) suppresses the ArchUnit "no classes matched" error
    // for rules whose .that() clause matches nothing in the current phase state.

    static final ArchRule NO_FIELD_INJECTION = noFields()
            .should().beAnnotatedWith(Autowired.class)
            .allowEmptyShould(true)
            .because("GATE-02/NO_FIELD_INJECTION: Use constructor injection. " +
                    "Fix: remove @Autowired from field; add constructor parameter.");

    static final ArchRule NO_BARE_SCHEDULED = noMethods()
            .that().areDeclaredInClassesThat()
            .resideOutsideOfPackage("com.acme.app.shared.scheduling..")
            .should().beAnnotatedWith(Scheduled.class)
            .allowEmptyShould(true)
            .because("GATE-02/NO_BARE_SCHEDULED: Use ScheduledTaskRegistrar in shared.scheduling. " +
                    "Fix: implement ScheduledTask and register as a Spring bean.");

    // Implementations of NativeQuery<T> must live in shared.query
    static final ArchRule NO_NATIVE_QUERY_OUTSIDE_WRAPPER = noClasses()
            .that().resideOutsideOfPackage("com.acme.app.shared.query..")
            .should().implement(NativeQuery.class)
            .allowEmptyShould(true)
            .because("GATE-02/NO_NATIVE_QUERY_OUTSIDE_WRAPPER: NativeQuery implementations must " +
                    "reside in com.acme.app.shared.query. " +
                    "Fix: move the implementation into that package.");

    static final ArchRule NO_TRANSACTIONAL_PRIVATE = noMethods()
            .that().arePrivate()
            .should().beAnnotatedWith(Transactional.class)
            .allowEmptyShould(true)
            .because("GATE-02/NO_TRANSACTIONAL_PRIVATE: @Transactional on private methods is a no-op " +
                    "(proxy cannot intercept). Fix: change visibility to package-private or public.");

    // String form avoids jakarta.persistence compile dependency in Plan 01 scope
    static final ArchRule NO_ENTITY_IN_CONTROLLERS = noClasses()
            .that().areAnnotatedWith(RestController.class)
            .should().dependOnClassesThat().areAnnotatedWith("jakarta.persistence.Entity")
            .allowEmptyShould(true)
            .because("GATE-02/NO_ENTITY_IN_CONTROLLERS: Map entities to DTOs at the API boundary. " +
                    "Fix: create a record DTO and use MapStruct to map from the entity.");

    static final ArchRule NO_VALUE_OUTSIDE_APPCONFIG = noFields()
            .that().areDeclaredInClassesThat()
            .resideOutsideOfPackage("com.acme.app.appconfig..")
            .should().beAnnotatedWith(Value.class)
            .allowEmptyShould(true)
            .because("GATE-02/NO_VALUE_OUTSIDE_APPCONFIG: Use a typed @ConfigurationProperties record " +
                    "in appconfig. Fix: replace @Value with the appropriate Properties record.");

    static final ArchRule NO_ENVIRONMENT_INJECTION_OUTSIDE_APPCONFIG = noFields()
            .that().areDeclaredInClassesThat()
            .resideOutsideOfPackage("com.acme.app.appconfig..")
            .should().haveRawType(Environment.class)
            .allowEmptyShould(true)
            .because("GATE-02/NO_ENVIRONMENT_INJECTION_OUTSIDE_APPCONFIG: " +
                    "Use a typed @ConfigurationProperties record in appconfig. " +
                    "Fix: remove the Environment field; inject the Properties record instead.");

    @Test void noFieldInjection() { NO_FIELD_INJECTION.check(classes); }
    @Test void noBareScheduled() { NO_BARE_SCHEDULED.check(classes); }
    @Test void noNativeQueryOutsideWrapper() { NO_NATIVE_QUERY_OUTSIDE_WRAPPER.check(classes); }
    @Test void noTransactionalPrivate() { NO_TRANSACTIONAL_PRIVATE.check(classes); }
    @Test void noEntityInControllers() { NO_ENTITY_IN_CONTROLLERS.check(classes); }
    @Test void noValueOutsideAppconfig() { NO_VALUE_OUTSIDE_APPCONFIG.check(classes); }
    @Test void noEnvironmentInjectionOutsideAppconfig() { NO_ENVIRONMENT_INJECTION_OUTSIDE_APPCONFIG.check(classes); }
}
