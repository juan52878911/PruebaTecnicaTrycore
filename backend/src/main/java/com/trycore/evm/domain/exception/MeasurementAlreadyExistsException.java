package com.trycore.evm.domain.exception;

import java.time.LocalDate;

/**
 * Ya existe un corte de ese proyecto en esa fecha. Dos mediciones del mismo proyecto en la misma
 * fecha romperían el orden de la serie temporal: para rectificar hay que borrar el corte y volver
 * a tomarlo.
 */
public class MeasurementAlreadyExistsException extends DomainException {

    public MeasurementAlreadyExistsException(final Long projectId, final LocalDate cutoffDate) {
        super("Ya existe una medición del proyecto con id " + projectId + " en la fecha de corte " + cutoffDate);
    }
}
