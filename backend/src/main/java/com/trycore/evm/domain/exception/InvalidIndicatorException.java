package com.trycore.evm.domain.exception;

/** Un indicador se intenta construir en un estado imposible, por ejemplo sin interpretación. */
public class InvalidIndicatorException extends DomainException {

    public InvalidIndicatorException(final String message) {
        super(message);
    }
}
