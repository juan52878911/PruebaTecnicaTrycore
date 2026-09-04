package com.trycore.evm.domain.exception;

/** Un proyecto viola alguna invariante del dominio (por ejemplo, nombre vacío). */
public class InvalidProjectException extends DomainException {

    public InvalidProjectException(final String message) {
        super(message);
    }
}
