package com.trycore.evm.architecture;

import org.junit.jupiter.api.Test;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * Verifica que la arquitectura hexagonal se respete: el dominio no depende de la aplicación ni
 * de la infraestructura, y los adaptadores de entrada y de salida no dependen entre sí.
 *
 * <p>Nota: las reglas sobre la aplicación y los adaptadores usan {@code allowEmptyShould(true)}
 * mientras esos paquetes sigan vacíos. Ese permiso debe retirarse en cuanto entren sus primeras
 * clases, para que las reglas vuelvan a exigir que exista al menos una clase que las cumpla. Las
 * reglas del dominio ya no lo tienen: el dominio tiene clases y debe cumplirlas.
 */
class HexagonalArchitectureTest {

    private static final String DOMAIN_PACKAGE = "com.trycore.evm.domain..";
    private static final String APPLICATION_PACKAGE = "com.trycore.evm.application..";
    private static final String ADAPTER_IN_PACKAGE = "com.trycore.evm.adapter.in..";
    private static final String ADAPTER_OUT_PACKAGE = "com.trycore.evm.adapter.out..";
    private static final String CONFIG_PACKAGE = "com.trycore.evm.config..";

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
                .should().dependOnClassesThat().resideInAnyPackage(ADAPTER_IN_PACKAGE, ADAPTER_OUT_PACKAGE)
                .allowEmptyShould(true);

        rule.check(classes);
    }

    @Test
    void applicationShouldNotDependOnConfig() {
        final ArchRule rule = noClasses()
                .that().resideInAPackage(APPLICATION_PACKAGE)
                .should().dependOnClassesThat().resideInAPackage(CONFIG_PACKAGE)
                .allowEmptyShould(true);

        rule.check(classes);
    }

    @Test
    void applicationShouldNotDependOnFrameworks() {
        final ArchRule rule = noClasses()
                .that().resideInAPackage(APPLICATION_PACKAGE)
                .should().dependOnClassesThat().resideInAnyPackage(
                        "org.springframework..",
                        "jakarta.persistence..",
                        "com.fasterxml..")
                .allowEmptyShould(true);

        rule.check(classes);
    }

    @Test
    void adapterInShouldNotDependOnAdapterOut() {
        final ArchRule rule = noClasses()
                .that().resideInAPackage(ADAPTER_IN_PACKAGE)
                .should().dependOnClassesThat().resideInAPackage(ADAPTER_OUT_PACKAGE)
                .allowEmptyShould(true);

        rule.check(classes);
    }

    @Test
    void adapterOutShouldNotDependOnAdapterIn() {
        final ArchRule rule = noClasses()
                .that().resideInAPackage(ADAPTER_OUT_PACKAGE)
                .should().dependOnClassesThat().resideInAPackage(ADAPTER_IN_PACKAGE)
                .allowEmptyShould(true);

        rule.check(classes);
    }
}
