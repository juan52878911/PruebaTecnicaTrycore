package com.trycore.evm.architecture;

import org.junit.jupiter.api.Test;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * Verifica que la arquitectura hexagonal se respete: el dominio no depende de la aplicación ni
 * de la infraestructura, los adaptadores de entrada y de salida no dependen entre sí, y los
 * servicios de aplicación no llevan anotaciones de Spring.
 *
 * <p>Todos los paquetes (dominio, aplicación y adaptadores) tienen ya sus primeras clases, así
 * que ninguna regla necesita {@code allowEmptyShould(true)}: todas exigen que exista al menos una
 * clase que las cumpla.
 */
class HexagonalArchitectureTest {

    private static final String DOMAIN_PACKAGE = "com.trycore.evm.domain..";
    private static final String APPLICATION_PACKAGE = "com.trycore.evm.application..";
    private static final String APPLICATION_SERVICE_PACKAGE = "com.trycore.evm.application.service..";
    private static final String ADAPTER_IN_PACKAGE = "com.trycore.evm.adapter.in..";
    private static final String ADAPTER_OUT_PACKAGE = "com.trycore.evm.adapter.out..";
    private static final String CONFIG_PACKAGE = "com.trycore.evm.config..";
    private static final String SPRING_SERVICE_ANNOTATION = "org.springframework.stereotype.Service";

    private final JavaClasses classes = new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("com.trycore.evm");

    @Test
    void domainShouldNotDependOnApplication() {
        final ArchRule rule = noClasses()
                .that().resideInAPackage(DOMAIN_PACKAGE)
                .should().dependOnClassesThat().resideInAPackage(APPLICATION_PACKAGE);

        rule.check(classes);
    }

    @Test
    void domainShouldNotDependOnAdapters() {
        final ArchRule rule = noClasses()
                .that().resideInAPackage(DOMAIN_PACKAGE)
                .should().dependOnClassesThat().resideInAnyPackage(ADAPTER_IN_PACKAGE, ADAPTER_OUT_PACKAGE);

        rule.check(classes);
    }

    @Test
    void domainShouldNotDependOnConfig() {
        final ArchRule rule = noClasses()
                .that().resideInAPackage(DOMAIN_PACKAGE)
                .should().dependOnClassesThat().resideInAPackage(CONFIG_PACKAGE);

        rule.check(classes);
    }

    @Test
    void domainShouldNotDependOnFrameworks() {
        final ArchRule rule = noClasses()
                .that().resideInAPackage(DOMAIN_PACKAGE)
                .should().dependOnClassesThat().resideInAnyPackage(
                        "org.springframework..",
                        "jakarta.persistence..",
                        "com.fasterxml..");

        rule.check(classes);
    }

    @Test
    void applicationShouldNotDependOnAdapters() {
        final ArchRule rule = noClasses()
                .that().resideInAPackage(APPLICATION_PACKAGE)
                .should().dependOnClassesThat().resideInAnyPackage(ADAPTER_IN_PACKAGE, ADAPTER_OUT_PACKAGE);

        rule.check(classes);
    }

    @Test
    void applicationShouldNotDependOnConfig() {
        final ArchRule rule = noClasses()
                .that().resideInAPackage(APPLICATION_PACKAGE)
                .should().dependOnClassesThat().resideInAPackage(CONFIG_PACKAGE);

        rule.check(classes);
    }

    @Test
    void applicationShouldNotDependOnFrameworks() {
        final ArchRule rule = noClasses()
                .that().resideInAPackage(APPLICATION_PACKAGE)
                .should().dependOnClassesThat().resideInAnyPackage(
                        "org.springframework..",
                        "jakarta.persistence..",
                        "com.fasterxml..");

        rule.check(classes);
    }

    @Test
    void applicationServicesShouldNotBeAnnotatedWithSpringService() {
        final ArchRule rule = noClasses()
                .that().resideInAPackage(APPLICATION_SERVICE_PACKAGE)
                .should().beAnnotatedWith(SPRING_SERVICE_ANNOTATION);

        rule.check(classes);
    }

    @Test
    void adapterInShouldNotDependOnAdapterOut() {
        final ArchRule rule = noClasses()
                .that().resideInAPackage(ADAPTER_IN_PACKAGE)
                .should().dependOnClassesThat().resideInAPackage(ADAPTER_OUT_PACKAGE);

        rule.check(classes);
    }

    @Test
    void adapterOutShouldNotDependOnAdapterIn() {
        final ArchRule rule = noClasses()
                .that().resideInAPackage(ADAPTER_OUT_PACKAGE)
                .should().dependOnClassesThat().resideInAPackage(ADAPTER_IN_PACKAGE);

        rule.check(classes);
    }
}
