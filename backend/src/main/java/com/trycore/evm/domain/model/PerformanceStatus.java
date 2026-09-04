package com.trycore.evm.domain.model;

/**
 * Interpretación de un índice de desempeño (CPI o SPI).
 *
 * <p>Un índice mayor que 1 es favorable, menor que 1 desfavorable e igual a 1 está en objetivo.
 * {@link #NOT_APPLICABLE} se usa cuando el índice no se puede calcular porque su divisor es cero;
 * en ese caso el motivo concreto viaja en el mensaje de {@link IndexInterpretation}.
 */
public enum PerformanceStatus {

    UNDER_BUDGET("Bajo presupuesto: se avanza más de lo que se gasta"),
    ON_BUDGET("En presupuesto: el costo coincide con el avance"),
    OVER_BUDGET("Sobre presupuesto: se gasta más de lo que se avanza"),
    AHEAD_OF_SCHEDULE("Adelantado respecto al cronograma"),
    ON_SCHEDULE("En cronograma"),
    BEHIND_SCHEDULE("Atrasado respecto al cronograma"),
    NOT_APPLICABLE("No aplica");

    private final String description;

    PerformanceStatus(final String description) {
        this.description = description;
    }

    public String description() {
        return description;
    }
}
