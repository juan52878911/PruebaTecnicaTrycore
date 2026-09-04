package com.trycore.evm.domain.model;

import java.time.LocalDate;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.trycore.evm.domain.exception.InvalidActivityException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ActivityScheduleTest {

    private static final LocalDate START = LocalDate.parse("2026-09-01");
    private static final LocalDate END = LocalDate.parse("2026-09-30");

    @Test
    @DisplayName("las cuatro fechas son opcionales: una actividad puede no tener ninguna")
    void allDatesAreOptional() {
        assertThatCode(() -> new ActivitySchedule(null, null, null, null)).doesNotThrowAnyException();
        assertThat(ActivitySchedule.empty().isEmpty()).isTrue();
    }

    @Test
    @DisplayName("una actividad empezada y sin terminar es válida")
    void startedButNotFinishedIsValid() {
        final ActivitySchedule schedule = new ActivitySchedule(START, END, START, null);

        assertThat(schedule.actualEnd()).isNull();
        assertThat(schedule.isEmpty()).isFalse();
    }

    @Test
    @DisplayName("acepta que el fin coincida con el inicio: una actividad de un solo día")
    void singleDayActivityIsValid() {
        assertThatCode(() -> new ActivitySchedule(START, START, START, START)).doesNotThrowAnyException();
    }

    @Test
    void rejectsPlannedEndBeforePlannedStart() {
        assertThatThrownBy(() -> new ActivitySchedule(END, START, null, null))
                .isInstanceOf(InvalidActivityException.class)
                .hasMessageContaining("planificada");
    }

    @Test
    void rejectsActualEndBeforeActualStart() {
        assertThatThrownBy(() -> new ActivitySchedule(null, null, END, START))
                .isInstanceOf(InvalidActivityException.class)
                .hasMessageContaining("real");
    }

    @Test
    @DisplayName("no exige que lo real caiga dentro de lo planificado: un retraso es un dato, no un error")
    void actualDatesOutsidePlannedRangeAreValid() {
        final LocalDate lateFinish = END.plusMonths(2);

        assertThatCode(() -> new ActivitySchedule(START, END, START, lateFinish)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("la actividad guarda un calendario vacío cuando no se le pasa ninguno")
    void activityDefaultsToAnEmptySchedule() {
        final ActivityFigures figures = new ActivityFigures(
                new java.math.BigDecimal("1000"),
                new java.math.BigDecimal("50"),
                new java.math.BigDecimal("40"),
                new java.math.BigDecimal("600"));

        final Activity activity = Activity.create(1L, "Diseño", figures, null);

        assertThat(activity.schedule()).isNotNull();
        assertThat(activity.schedule().isEmpty()).isTrue();
    }
}
