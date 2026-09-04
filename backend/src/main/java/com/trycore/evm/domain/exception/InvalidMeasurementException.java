package com.trycore.evm.domain.exception;

/** Una medición se intenta registrar en un estado imposible, por ejemplo sin fecha de corte. */
public class InvalidMeasurementException extends DomainException {

    public InvalidMeasurementException(final String message) {
        super(message);
    }
}
