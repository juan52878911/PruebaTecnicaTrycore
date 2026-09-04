package com.trycore.evm.domain.exception;

/**
 * Raíz de las excepciones del dominio. No depende de ningún framework: los adaptadores de entrada
 * deciden cómo traducir cada subtipo (por ejemplo, a un código HTTP).
 */
public abstract class DomainException extends RuntimeException {

    protected DomainException(final String message) {
        super(message);
    }
}
