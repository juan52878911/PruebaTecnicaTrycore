package com.trycore.evm.domain.exception;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Los mensajes de "no encontrado" llegan al cliente como detalle del error HTTP: deben nombrar los ids. */
class NotFoundExceptionsTest {

    private static final Long PROJECT_ID = 42L;
    private static final Long ACTIVITY_ID = 7L;

    @Test
    void projectNotFoundNamesTheProjectId() {
        final ProjectNotFoundException exception = new ProjectNotFoundException(PROJECT_ID);

        assertThat(exception).isInstanceOf(DomainException.class);
        assertThat(exception.getMessage()).isEqualTo("No existe el proyecto con id 42");
    }

    @Test
    void activityNotFoundNamesBothIds() {
        final ActivityNotFoundException exception = new ActivityNotFoundException(PROJECT_ID, ACTIVITY_ID);

        assertThat(exception).isInstanceOf(DomainException.class);
        assertThat(exception.getMessage()).isEqualTo("No existe la actividad con id 7 en el proyecto con id 42");
    }
}
