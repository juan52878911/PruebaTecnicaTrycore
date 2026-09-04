package com.trycore.evm.domain.exception;

/** No existe un proyecto con el identificador solicitado. */
public class ProjectNotFoundException extends DomainException {

    public ProjectNotFoundException(final Long projectId) {
        super("No existe el proyecto con id " + projectId);
    }
}
