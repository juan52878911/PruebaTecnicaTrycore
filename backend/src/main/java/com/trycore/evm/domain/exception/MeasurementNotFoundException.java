package com.trycore.evm.domain.exception;

/** No existe una medición con ese identificador dentro del proyecto indicado. */
public class MeasurementNotFoundException extends DomainException {

    public MeasurementNotFoundException(final Long projectId, final Long measurementId) {
        super("No existe la medición con id " + measurementId + " en el proyecto con id " + projectId);
    }
}
