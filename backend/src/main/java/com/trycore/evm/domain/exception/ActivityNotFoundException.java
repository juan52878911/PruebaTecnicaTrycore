package com.trycore.evm.domain.exception;

/** No existe una actividad con ese identificador dentro del proyecto indicado. */
public class ActivityNotFoundException extends DomainException {

    public ActivityNotFoundException(final Long projectId, final Long activityId) {
        super("No existe la actividad con id " + activityId + " en el proyecto con id " + projectId);
    }
}
