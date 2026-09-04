package com.trycore.evm.domain.model;

import com.trycore.evm.domain.exception.InvalidIndicatorException;

/**
 * Estado de un índice (CPI o SPI) junto con un mensaje legible para el líder de proyecto.
 *
 * @param status  interpretación del índice
 * @param message explicación en lenguaje natural; cuando el estado es NOT_APPLICABLE contiene el motivo
 */
public record IndexInterpretation(PerformanceStatus status, String message) {

    public IndexInterpretation {
        if (status == null) {
            throw new InvalidIndicatorException("El estado de la interpretación es obligatorio");
        }
        if (message == null) {
            throw new InvalidIndicatorException("El mensaje de la interpretación es obligatorio");
        }
    }

    /** Interpretación cuyo mensaje es la descripción estándar del estado. */
    public static IndexInterpretation of(final PerformanceStatus status) {
        return new IndexInterpretation(status, status.description());
    }

    /** Interpretación de un índice que no se puede calcular, con el motivo concreto. */
    public static IndexInterpretation notApplicable(final String reason) {
        return new IndexInterpretation(PerformanceStatus.NOT_APPLICABLE, reason);
    }
}
