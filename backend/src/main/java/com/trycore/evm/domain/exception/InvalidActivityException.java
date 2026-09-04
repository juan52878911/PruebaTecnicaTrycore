package com.trycore.evm.domain.exception;

/** Una actividad viola alguna invariante del dominio (por ejemplo, un porcentaje fuera de 0-100). */
public class InvalidActivityException extends DomainException {

    public InvalidActivityException(final String message) {
        super(message);
    }
}
