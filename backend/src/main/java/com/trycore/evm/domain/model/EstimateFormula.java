package com.trycore.evm.domain.model;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

/**
 * Formas estándar de estimar el costo final de un proyecto (EAC), cada una con su supuesto sobre lo
 * que va a pasar de aquí al cierre.
 *
 * <p>No son fórmulas rivales: son escenarios. El valor de tenerlas todas está en el rango que
 * dibujan entre ellas, porque una sola cifra esconde de qué supuesto depende.
 *
 * <p>Cada una devuelve {@code null} cuando alguno de los índices de los que depende no existe, con
 * la misma regla que el resto del dominio: un resultado indefinido nunca se sustituye por cero ni
 * por el valor de otra fórmula. En particular {@link #AC_PLUS_REMAINING} no se usa como recambio
 * cuando las demás no aplican, porque devolver un número de otra fórmula que la pedida rompería el
 * significado de la respuesta.
 */
public enum EstimateFormula {

    /**
     * EAC = BAC / CPI. Supuesto: lo que ha pasado seguirá pasando, y la eficiencia de costo
     * observada hasta hoy se mantendrá hasta el final. Es la estimación basada en datos y no en una
     * promesa, y por eso es la titular por defecto.
     */
    BAC_OVER_CPI("El desempeño de costo observado se mantiene hasta el final") {
        @Override
        BigDecimal computeEstimate(final EvmTotals totals) {
            if (isZero(totals.actualCost()) || isZero(totals.earnedValue())) {
                return null;
            }
            // BAC / CPI se desarrolla como BAC x AC / EV para no arrastrar el redondeo del índice.
            return totals.budgetAtCompletion()
                    .multiply(totals.actualCost())
                    .divide(totals.earnedValue(), EXACT_DIVISION);
        }
    },

    /**
     * EAC = AC + (BAC - EV). Supuesto: la desviación ya ocurrida fue puntual y está superada, así
     * que el trabajo restante se ejecutará exactamente a presupuesto. Es la estimación optimista, y
     * solo se sostiene cuando se conoce la causa del sobrecosto y se ha corregido.
     *
     * <p>Nunca es indefinida, porque no divide. Su cero en un proyecto sin nada planificado ni
     * gastado es un cero real, no un valor indefinido disfrazado.
     */
    AC_PLUS_REMAINING("La desviación fue puntual: lo que queda se ejecuta a presupuesto") {
        @Override
        BigDecimal computeEstimate(final EvmTotals totals) {
            return totals.actualCost()
                    .add(totals.budgetAtCompletion().subtract(totals.earnedValue()));
        }
    },

    /**
     * EAC = AC + (BAC - EV) / (CPI x SPI). Supuesto: hay que recuperar el atraso sin ampliar el
     * plazo, de modo que lo que queda se pagará con la penalización combinada de ir mal de costo y
     * mal de cronograma. Es el escenario pesimista, apropiado cuando la fecha de fin es intocable.
     */
    AC_PLUS_REMAINING_OVER_CPI_SPI("Lo que queda sufre a la vez la ineficiencia de costo y la de plazo") {
        @Override
        BigDecimal computeEstimate(final EvmTotals totals) {
            // La definibilidad se comprueba sobre los índices, no sobre la expresión desarrollada:
            // con AC = 0 esta se reduciría a 0 + 0 y devolvería un número finito y falso.
            if (isZero(totals.actualCost()) || isZero(totals.plannedValue()) || isZero(totals.earnedValue())) {
                return null;
            }
            // CPI x SPI = EV² / (AC x PV), así que dividir por él equivale a multiplicar por
            // AC x PV / EV². Se desarrolla para no multiplicar índices ya redondeados a escala 4:
            // hacerlo desviaría el resultado en varias unidades monetarias.
            final BigDecimal remaining = totals.budgetAtCompletion().subtract(totals.earnedValue());
            final BigDecimal penalised = remaining
                    .multiply(totals.actualCost())
                    .multiply(totals.plannedValue())
                    .divide(totals.earnedValue().multiply(totals.earnedValue()), EXACT_DIVISION);
            return totals.actualCost().add(penalised);
        }
    };

    private static final MathContext EXACT_DIVISION = MathContext.DECIMAL128;
    private static final int MONEY_SCALE = 2;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    private final String assumption;

    EstimateFormula(final String assumption) {
        this.assumption = assumption;
    }

    /** Supuesto de negocio sobre el futuro que hace válida esta estimación. */
    public String assumption() {
        return assumption;
    }

    /** Estimación a la conclusión con escala de dinero, o nulo si esta fórmula no es aplicable. */
    public BigDecimal estimate(final EvmTotals totals) {
        final BigDecimal raw = computeEstimate(totals);
        return raw == null ? null : raw.setScale(MONEY_SCALE, ROUNDING);
    }

    /** Variación a la conclusión que corresponde a esta estimación, nula si la estimación lo es. */
    public BigDecimal varianceAtCompletion(final EvmTotals totals) {
        final BigDecimal estimate = estimate(totals);
        return estimate == null
                ? null
                : totals.budgetAtCompletion().subtract(estimate).setScale(MONEY_SCALE, ROUNDING);
    }

    /** Cálculo sin redondear de cada fórmula, o nulo cuando alguno de sus índices no existe. */
    abstract BigDecimal computeEstimate(EvmTotals totals);

    private static boolean isZero(final BigDecimal value) {
        return value.signum() == 0;
    }
}
