package com.trycore.evm.domain.model;

import java.math.BigDecimal;

import com.trycore.evm.domain.exception.InvalidIndicatorException;

/**
 * Umbrales de tolerancia con los que se clasifica la desviación de un índice.
 *
 * <p>Son una política, no una propiedad del cálculo: dicen a partir de dónde una desviación deja de
 * ser ruido. Viven juntos en un objeto de valor para que la política tenga un solo sitio y para que
 * puedan viajar en la respuesta del API, de modo que quien pinta un color no tenga que repetir los
 * mismos números por su cuenta.
 *
 * <p>Las bandas son cerradas por abajo: un índice igual a {@code warning} todavía no es aviso, y uno
 * igual a {@code critical} todavía no es crítico. La frontera exacta aparece en las pruebas, así que
 * conviene que esté escrita y no deducida.
 *
 * @param warning  índice a partir del cual no hay desviación relevante
 * @param critical índice por debajo del cual la desviación es crítica
 */
public record PerformanceThresholds(BigDecimal warning, BigDecimal critical) {

    private static final BigDecimal DEFAULT_WARNING = new BigDecimal("1.00");
    private static final BigDecimal DEFAULT_CRITICAL = new BigDecimal("0.95");

    private static final PerformanceThresholds DEFAULTS =
            new PerformanceThresholds(DEFAULT_WARNING, DEFAULT_CRITICAL);

    public PerformanceThresholds {
        if (warning == null || critical == null) {
            throw new InvalidIndicatorException("Los umbrales de tolerancia son obligatorios");
        }
        if (critical.signum() <= 0) {
            throw new InvalidIndicatorException("El umbral crítico debe ser mayor que cero");
        }
        if (critical.compareTo(warning) >= 0) {
            throw new InvalidIndicatorException("El umbral crítico debe ser menor que el de aviso");
        }
    }

    /** Umbrales por defecto: el objetivo es uno y la tolerancia admitida llega hasta el 0,95. */
    public static PerformanceThresholds defaults() {
        return DEFAULTS;
    }

    /** Clasifica un índice ya calculado; un índice nulo no tiene desviación que medir. */
    public DeviationSeverity severityOf(final BigDecimal indexValue) {
        if (indexValue == null) {
            return DeviationSeverity.NOT_APPLICABLE;
        }
        if (indexValue.compareTo(warning) >= 0) {
            return DeviationSeverity.NONE;
        }
        if (indexValue.compareTo(critical) >= 0) {
            return DeviationSeverity.WARNING;
        }
        return DeviationSeverity.CRITICAL;
    }
}
