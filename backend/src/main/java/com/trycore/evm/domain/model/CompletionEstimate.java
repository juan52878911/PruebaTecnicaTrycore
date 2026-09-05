package com.trycore.evm.domain.model;

import java.math.BigDecimal;

/**
 * Una estimación del costo final del proyecto según una fórmula concreta, con el supuesto que la
 * hace válida.
 *
 * <p>Se devuelven todas las fórmulas a la vez porque el valor analítico está en el rango que
 * dibujan entre ellas, no en una cifra suelta: saber que el cierre costará entre 120 y 172 mil
 * según qué se suponga sobre el futuro dice más que cualquiera de los dos extremos por separado.
 *
 * @param formula              fórmula empleada
 * @param estimateAtCompletion EAC resultante, nulo cuando la fórmula no es aplicable
 * @param varianceAtCompletion VAC = BAC - EAC, nulo cuando el EAC lo es
 * @param assumption           supuesto de negocio sobre el futuro que hace válida esta estimación
 */
public record CompletionEstimate(
        EstimateFormula formula,
        BigDecimal estimateAtCompletion,
        BigDecimal varianceAtCompletion,
        String assumption) {

    /** Calcula la estimación de una fórmula sobre unas cifras dadas. */
    public static CompletionEstimate of(final EstimateFormula formula, final EvmTotals totals) {
        return new CompletionEstimate(
                formula,
                formula.estimate(totals),
                formula.varianceAtCompletion(totals),
                formula.assumption());
    }

    /** Indica si esta fórmula pudo calcularse con las cifras dadas. */
    public boolean applicable() {
        return estimateAtCompletion != null;
    }
}
