package com.trycore.evm.domain.model;

import com.trycore.evm.domain.exception.InvalidIndicatorException;

/**
 * Estado de un índice (CPI o SPI), cuánto importa su desviación, y un mensaje legible para el líder
 * de proyecto.
 *
 * <p>El estado dice qué ocurre y la severidad cuánto importa. Un CPI de 0,9857 está sobre
 * presupuesto, porque el hecho aritmético es que se gastó más de lo que se ganó, pero su desviación
 * cabe dentro de la tolerancia admitida. Separar las dos cosas permite que un cliente coloree por
 * severidad sin contradecir el texto del estado.
 *
 * @param status   interpretación del índice
 * @param severity cuánto se desvía respecto a los umbrales de tolerancia
 * @param message  explicación en lenguaje natural; cuando el estado es NOT_APPLICABLE contiene el motivo
 */
public record IndexInterpretation(PerformanceStatus status, DeviationSeverity severity, String message) {

    public IndexInterpretation {
        if (status == null) {
            throw new InvalidIndicatorException("El estado de la interpretación es obligatorio");
        }
        if (severity == null) {
            throw new InvalidIndicatorException("La severidad de la interpretación es obligatoria");
        }
        if (message == null) {
            throw new InvalidIndicatorException("El mensaje de la interpretación es obligatorio");
        }
        // Un índice que no existe no puede tener desviación, y una desviación que no aplica no
        // puede describir un índice que sí existe. Las dos direcciones se comprueban a propósito.
        if (status == PerformanceStatus.NOT_APPLICABLE ^ severity == DeviationSeverity.NOT_APPLICABLE) {
            throw new InvalidIndicatorException(
                    "Un índice no aplicable debe tener severidad no aplicable, y solo él");
        }
    }

    /** Interpretación de un índice existente, con su severidad medida contra los umbrales. */
    public static IndexInterpretation of(final PerformanceStatus status, final DeviationSeverity severity) {
        return new IndexInterpretation(status, severity, status.description());
    }

    /** Interpretación de un índice que no se puede calcular, con el motivo concreto. */
    public static IndexInterpretation notApplicable(final String reason) {
        return new IndexInterpretation(
                PerformanceStatus.NOT_APPLICABLE, DeviationSeverity.NOT_APPLICABLE, reason);
    }
}
