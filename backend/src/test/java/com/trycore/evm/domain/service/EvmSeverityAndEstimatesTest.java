package com.trycore.evm.domain.service;

import java.math.BigDecimal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.trycore.evm.domain.exception.InvalidIndicatorException;
import com.trycore.evm.domain.model.ActivityFigures;
import com.trycore.evm.domain.model.CompletionEstimate;
import com.trycore.evm.domain.model.DeviationSeverity;
import com.trycore.evm.domain.model.EstimateFormula;
import com.trycore.evm.domain.model.EvmIndicators;
import com.trycore.evm.domain.model.EvmTotals;
import com.trycore.evm.domain.model.PerformanceStatus;
import com.trycore.evm.domain.model.PerformanceThresholds;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Severidad de la desviación y estimaciones del costo final.
 *
 * <p>Todos los valores esperados están derivados a mano de la fórmula y escritos literalmente,
 * nunca copiados de la salida del código.
 */
class EvmSeverityAndEstimatesTest {

    private final EvmCalculator calculator = new EvmCalculator();

    private static ActivityFigures figures(
            final String budget, final String planned, final String actual, final String cost) {
        return new ActivityFigures(
                new BigDecimal(budget), new BigDecimal(planned), new BigDecimal(actual), new BigDecimal(cost));
    }

    private static EvmTotals totals(final String bac, final String pv, final String ev, final String ac) {
        return new EvmTotals(new BigDecimal(bac), new BigDecimal(pv), new BigDecimal(ev), new BigDecimal(ac));
    }

    private static CompletionEstimate estimateOf(final EvmIndicators indicators, final EstimateFormula formula) {
        return indicators.estimates().stream()
                .filter(estimate -> estimate.formula() == formula)
                .findFirst()
                .orElseThrow();
    }

    @Nested
    @DisplayName("Severidad de la desviación")
    class Severity {

        @Test
        @DisplayName("un índice en objetivo o por encima no tiene desviación relevante")
        void indexAtOrAboveTargetHasNoSeverity() {
            // BAC 200.000, planificado 30 %, real 45 %, AC 60.000: EV 90.000, CPI 90.000/60.000 = 1,5000
            final EvmIndicators favorable = calculator.calculate(figures("200000", "30", "45", "60000"));
            // BAC 1.000, planificado 50 %, real 50 %, AC 500: CPI 500/500 = 1,0000
            final EvmIndicators onTarget = calculator.calculate(figures("1000", "50", "50", "500"));

            assertThat(favorable.costPerformanceIndex()).isEqualByComparingTo("1.5000");
            assertThat(favorable.costStatus().severity()).isEqualTo(DeviationSeverity.NONE);
            assertThat(onTarget.costPerformanceIndex()).isEqualByComparingTo("1.0000");
            assertThat(onTarget.costStatus().status()).isEqualTo(PerformanceStatus.ON_BUDGET);
            assertThat(onTarget.costStatus().severity()).isEqualTo(DeviationSeverity.NONE);
        }

        @Test
        @DisplayName("el caso que motivó la severidad: 0,9857 está sobre presupuesto pero dentro de la tolerancia")
        void slightlyOverBudgetIsOnlyAWarning() {
            // BAC 10.000, planificado 70 %, real 69 %, AC 7.000
            // EV = 6.900; CPI = 6.900 / 7.000 = 0,985714... -> 0,9857
            final EvmIndicators result = calculator.calculate(figures("10000", "70", "69", "7000"));

            assertThat(result.costPerformanceIndex()).isEqualByComparingTo("0.9857");
            assertThat(result.costStatus().status()).isEqualTo(PerformanceStatus.OVER_BUDGET);
            assertThat(result.costStatus().severity()).isEqualTo(DeviationSeverity.WARNING);
        }

        @Test
        @DisplayName("la frontera del umbral crítico es cerrada por abajo: 0,9500 todavía es aviso")
        void criticalThresholdIsInclusive() {
            // BAC 1.000, real 95 %, AC 1.000: EV 950; CPI = 950 / 1.000 = 0,9500
            final EvmIndicators atThreshold = calculator.calculate(figures("1000", "95", "95", "1000"));
            // BAC 1.000, real 94,99 %, AC 1.000: EV 949,90; CPI = 0,9499
            final EvmIndicators belowThreshold = calculator.calculate(figures("1000", "95", "94.99", "1000"));

            assertThat(atThreshold.costPerformanceIndex()).isEqualByComparingTo("0.9500");
            assertThat(atThreshold.costStatus().severity()).isEqualTo(DeviationSeverity.WARNING);
            assertThat(belowThreshold.costPerformanceIndex()).isEqualByComparingTo("0.9499");
            assertThat(belowThreshold.costStatus().severity()).isEqualTo(DeviationSeverity.CRITICAL);
        }

        @Test
        @DisplayName("un índice que vale cero es crítico; uno que no existe no es medible")
        void zeroIndexIsCriticalButAbsentIndexIsNotAssessable() {
            // BAC 80.000, planificado 25 %, real 0 %, AC 5.000: EV 0; CPI = 0 / 5.000 = 0,0000
            final EvmIndicators zeroIndex = calculator.calculate(figures("80000", "25", "0", "5000"));
            // Las mismas cifras sin costo real: CPI = 0 / 0 no existe
            final EvmIndicators absentIndex = calculator.calculate(figures("80000", "25", "0", "0"));

            assertThat(zeroIndex.costPerformanceIndex()).isEqualByComparingTo("0.0000");
            assertThat(zeroIndex.costStatus().severity()).isEqualTo(DeviationSeverity.CRITICAL);
            assertThat(absentIndex.costPerformanceIndex()).isNull();
            assertThat(absentIndex.costStatus().status()).isEqualTo(PerformanceStatus.NOT_APPLICABLE);
            assertThat(absentIndex.costStatus().severity()).isEqualTo(DeviationSeverity.NOT_APPLICABLE);
        }

        @Test
        @DisplayName("la severidad del cronograma usa los mismos umbrales que la de costo")
        void scheduleUsesTheSameThresholds() {
            // Las tres actividades de demostración consolidadas: SPI = 152.500 / 170.000 = 0,897058... -> 0,8971
            final EvmIndicators result = calculator.calculate(totals("430000", "170000", "152500", "160000"));

            assertThat(result.schedulePerformanceIndex()).isEqualByComparingTo("0.8971");
            assertThat(result.scheduleStatus().severity()).isEqualTo(DeviationSeverity.CRITICAL);
            // CPI = 152.500 / 160.000 = 0,953125 -> 0,9531, todavía dentro de la tolerancia
            assertThat(result.costPerformanceIndex()).isEqualByComparingTo("0.9531");
            assertThat(result.costStatus().severity()).isEqualTo(DeviationSeverity.WARNING);
        }

        @Test
        @DisplayName("los umbrales usados viajan en el resultado para que nadie los repita")
        void thresholdsTravelWithTheResult() {
            final EvmIndicators result = calculator.calculate(figures("1000", "50", "50", "500"));

            assertThat(result.thresholds().warning()).isEqualByComparingTo("1.00");
            assertThat(result.thresholds().critical()).isEqualByComparingTo("0.95");
        }

        @Test
        @DisplayName("un calculador con otros umbrales clasifica el mismo índice de otra manera")
        void thresholdsAreConfigurable() {
            final EvmCalculator tolerant = new EvmCalculator(
                    new PerformanceThresholds(new BigDecimal("1.00"), new BigDecimal("0.80")));

            // El mismo 0,9499 que es crítico con los umbrales por defecto
            final EvmIndicators result = tolerant.calculate(figures("1000", "95", "94.99", "1000"));

            assertThat(result.costPerformanceIndex()).isEqualByComparingTo("0.9499");
            assertThat(result.costStatus().severity()).isEqualTo(DeviationSeverity.WARNING);
        }

        @Test
        @DisplayName("unos umbrales incoherentes se rechazan al construirlos")
        void thresholdsValidateTheirOwnOrder() {
            assertThatThrownBy(() ->
                    new PerformanceThresholds(new BigDecimal("0.90"), new BigDecimal("0.95")))
                    .isInstanceOf(InvalidIndicatorException.class)
                    .hasMessageContaining("menor que el de aviso");
            assertThatThrownBy(() -> new PerformanceThresholds(new BigDecimal("1.00"), BigDecimal.ZERO))
                    .isInstanceOf(InvalidIndicatorException.class)
                    .hasMessageContaining("mayor que cero");
        }
    }

    @Nested
    @DisplayName("Estimaciones del costo final")
    class Estimates {

        @Test
        @DisplayName("las tres fórmulas sobre el caso canónico dibujan el rango del cierre")
        void threeFormulasOnTheCanonicalCase() {
            // BAC 100.000, PV 50.000, EV 40.000, AC 60.000
            // F1 = BAC x AC / EV = 100.000 x 60.000 / 40.000 = 150.000
            // F2 = AC + (BAC - EV) = 60.000 + 60.000 = 120.000
            // F3 = AC + (BAC - EV) x AC x PV / EV^2 = 60.000 + 60.000 x 60.000 x 50.000 / 1.600.000.000
            //    = 60.000 + 112.500 = 172.500
            final EvmIndicators result = calculator.calculate(figures("100000", "50", "40", "60000"));

            assertThat(result.estimates()).hasSize(EstimateFormula.values().length);
            assertThat(estimateOf(result, EstimateFormula.BAC_OVER_CPI).estimateAtCompletion())
                    .isEqualByComparingTo("150000.00");
            assertThat(estimateOf(result, EstimateFormula.AC_PLUS_REMAINING).estimateAtCompletion())
                    .isEqualByComparingTo("120000.00");
            assertThat(estimateOf(result, EstimateFormula.AC_PLUS_REMAINING_OVER_CPI_SPI).estimateAtCompletion())
                    .isEqualByComparingTo("172500.00");
        }

        @Test
        @DisplayName("la tercera fórmula se desarrolla: con los índices redondeados daría 172.494,38")
        void thirdFormulaAvoidsRoundedIndexes() {
            // CPI 0,6667 y SPI 0,8000 redondeados dan 0,53336, y 60.000 + 60.000 / 0,53336 = 172.494,38.
            // La forma desarrollada, sin redondeo intermedio, da el valor exacto 172.500,00.
            final EvmIndicators result = calculator.calculate(figures("100000", "50", "40", "60000"));

            assertThat(estimateOf(result, EstimateFormula.AC_PLUS_REMAINING_OVER_CPI_SPI).estimateAtCompletion())
                    .isEqualByComparingTo("172500.00")
                    .isNotEqualByComparingTo("172494.38");
        }

        @Test
        @DisplayName("con la segunda fórmula la variación al cierre coincide siempre con la de costo")
        void secondFormulaVarianceEqualsCostVariance() {
            final EvmIndicators canonical = calculator.calculate(figures("100000", "50", "40", "60000"));
            final EvmIndicators seed = calculator.calculate(totals("430000", "170000", "152500", "160000"));

            assertThat(estimateOf(canonical, EstimateFormula.AC_PLUS_REMAINING).varianceAtCompletion())
                    .isEqualByComparingTo(canonical.costVariance());
            assertThat(estimateOf(seed, EstimateFormula.AC_PLUS_REMAINING).varianceAtCompletion())
                    .isEqualByComparingTo(seed.costVariance());
        }

        @Test
        @DisplayName("la fórmula pedida es la que ocupa el nivel superior de la respuesta")
        void requestedFormulaBecomesTheHeadline() {
            final EvmIndicators optimistic =
                    calculator.calculate(figures("100000", "50", "40", "60000"), EstimateFormula.AC_PLUS_REMAINING);

            assertThat(optimistic.estimateFormula()).isEqualTo(EstimateFormula.AC_PLUS_REMAINING);
            assertThat(optimistic.estimateAtCompletion()).isEqualByComparingTo("120000.00");
            assertThat(optimistic.varianceAtCompletion()).isEqualByComparingTo("-20000.00");
            // Las otras dos siguen estando disponibles
            assertThat(estimateOf(optimistic, EstimateFormula.BAC_OVER_CPI).estimateAtCompletion())
                    .isEqualByComparingTo("150000.00");
        }

        @Test
        @DisplayName("sin costo real solo la segunda fórmula es aplicable, y no sustituye a las demás")
        void withoutActualCostOnlyTheSecondApplies() {
            // BAC 10.000, PV 2.000, EV 3.000, AC 0: F2 = 0 + (10.000 - 3.000) = 7.000
            final EvmIndicators result = calculator.calculate(totals("10000", "2000", "3000", "0"));

            assertThat(estimateOf(result, EstimateFormula.BAC_OVER_CPI).estimateAtCompletion()).isNull();
            assertThat(estimateOf(result, EstimateFormula.BAC_OVER_CPI).applicable()).isFalse();
            assertThat(estimateOf(result, EstimateFormula.AC_PLUS_REMAINING).estimateAtCompletion())
                    .isEqualByComparingTo("7000.00");
            assertThat(estimateOf(result, EstimateFormula.AC_PLUS_REMAINING_OVER_CPI_SPI).estimateAtCompletion())
                    .isNull();
            // El titular por defecto sigue siendo nulo: no se sustituye por la fórmula que sí aplica
            assertThat(result.estimateAtCompletion()).isNull();
        }

        @Test
        @DisplayName("sin avance real la primera y la tercera quedan indefinidas")
        void withoutEarnedValueFirstAndThirdAreUndefined() {
            // BAC 80.000, PV 20.000, EV 0, AC 5.000: F2 = 5.000 + 80.000 = 85.000
            final EvmIndicators result = calculator.calculate(totals("80000", "20000", "0", "5000"));

            assertThat(estimateOf(result, EstimateFormula.BAC_OVER_CPI).estimateAtCompletion()).isNull();
            assertThat(estimateOf(result, EstimateFormula.AC_PLUS_REMAINING).estimateAtCompletion())
                    .isEqualByComparingTo("85000.00");
            assertThat(estimateOf(result, EstimateFormula.AC_PLUS_REMAINING_OVER_CPI_SPI).estimateAtCompletion())
                    .isNull();
        }

        @Test
        @DisplayName("sin valor planificado solo la tercera queda indefinida, porque depende del SPI")
        void withoutPlannedValueOnlyTheThirdIsUndefined() {
            // BAC 50.000, PV 0, EV 5.000, AC 4.000
            // F1 = 50.000 x 4.000 / 5.000 = 40.000; F2 = 4.000 + 45.000 = 49.000
            final EvmIndicators result = calculator.calculate(totals("50000", "0", "5000", "4000"));

            assertThat(estimateOf(result, EstimateFormula.BAC_OVER_CPI).estimateAtCompletion())
                    .isEqualByComparingTo("40000.00");
            assertThat(estimateOf(result, EstimateFormula.AC_PLUS_REMAINING).estimateAtCompletion())
                    .isEqualByComparingTo("49000.00");
            assertThat(estimateOf(result, EstimateFormula.AC_PLUS_REMAINING_OVER_CPI_SPI).estimateAtCompletion())
                    .isNull();
        }

        @Test
        @DisplayName("un proyecto vacío da cero en la segunda fórmula, y ese cero es real")
        void emptyProjectGivesAGenuineZeroInTheSecondFormula() {
            // La regla del dominio dice que un índice con divisor cero es nulo. La segunda fórmula no
            // divide: su cero significa que un proyecto sin nada planificado ni gastado costará cero.
            final EvmIndicators result = calculator.calculate(totals("0", "0", "0", "0"));

            assertThat(result.estimateAtCompletion()).isNull();
            assertThat(estimateOf(result, EstimateFormula.AC_PLUS_REMAINING).estimateAtCompletion())
                    .isEqualByComparingTo("0.00");
            assertThat(estimateOf(result, EstimateFormula.AC_PLUS_REMAINING_OVER_CPI_SPI).estimateAtCompletion())
                    .isNull();
        }

        @Test
        @DisplayName("cada fórmula explica el supuesto que la hace válida")
        void everyFormulaCarriesItsAssumption() {
            final EvmIndicators result = calculator.calculate(figures("100000", "50", "40", "60000"));

            assertThat(result.estimates())
                    .allSatisfy(estimate -> assertThat(estimate.assumption()).isNotBlank());
        }
    }
}
