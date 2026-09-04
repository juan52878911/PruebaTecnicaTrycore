package com.trycore.evm.domain.model;

import java.math.BigDecimal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import com.trycore.evm.domain.exception.InvalidActivityException;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ActivityFiguresTest {

    private static final BigDecimal VALID_BUDGET = new BigDecimal("1000");
    private static final BigDecimal VALID_PERCENT = new BigDecimal("50");
    private static final BigDecimal VALID_COST = new BigDecimal("400");

    @Test
    @DisplayName("acepta los límites: presupuesto y costo en cero, porcentajes en 0 y 100")
    void acceptsBoundaryValues() {
        assertThatCode(() -> new ActivityFigures(
                BigDecimal.ZERO, ActivityFigures.MIN_PERCENT, ActivityFigures.MAX_PERCENT, BigDecimal.ZERO))
                .doesNotThrowAnyException();
    }

    @ParameterizedTest(name = "porcentaje planificado {0} es inválido")
    @CsvSource({"-0.01", "100.01", "150"})
    void rejectsPlannedPercentOutOfRange(final String planned) {
        assertThatThrownBy(() -> new ActivityFigures(VALID_BUDGET, new BigDecimal(planned), VALID_PERCENT, VALID_COST))
                .isInstanceOf(InvalidActivityException.class)
                .hasMessageContaining("planificado")
                .hasMessageContaining("entre 0 y 100");
    }

    @ParameterizedTest(name = "porcentaje real {0} es inválido")
    @CsvSource({"-1", "100.5"})
    void rejectsActualPercentOutOfRange(final String actual) {
        assertThatThrownBy(() -> new ActivityFigures(VALID_BUDGET, VALID_PERCENT, new BigDecimal(actual), VALID_COST))
                .isInstanceOf(InvalidActivityException.class)
                .hasMessageContaining("real");
    }

    @Test
    void rejectsNegativeBudget() {
        assertThatThrownBy(() -> new ActivityFigures(new BigDecimal("-1"), VALID_PERCENT, VALID_PERCENT, VALID_COST))
                .isInstanceOf(InvalidActivityException.class)
                .hasMessageContaining("BAC")
                .hasMessageContaining("negativo");
    }

    @Test
    void rejectsNegativeActualCost() {
        final BigDecimal negativeCost = new BigDecimal("-0.01");

        assertThatThrownBy(() -> new ActivityFigures(VALID_BUDGET, VALID_PERCENT, VALID_PERCENT, negativeCost))
                .isInstanceOf(InvalidActivityException.class)
                .hasMessageContaining("AC");
    }

    @Test
    void rejectsNullValues() {
        assertThatThrownBy(() -> new ActivityFigures(null, VALID_PERCENT, VALID_PERCENT, VALID_COST))
                .isInstanceOf(InvalidActivityException.class)
                .hasMessageContaining("obligatorio");
        assertThatThrownBy(() -> new ActivityFigures(VALID_BUDGET, null, VALID_PERCENT, VALID_COST))
                .isInstanceOf(InvalidActivityException.class)
                .hasMessageContaining("obligatorio");
    }
}
