package com.trycore.evm.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.trycore.evm.domain.exception.InvalidActivityException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Invariantes de un hito suelto y de la tabla completa de hitos de una actividad.
 *
 * <p>La tabla de referencia es la del proyecto: Diseño 20, Construcción 50 y Pruebas 30, que suman
 * 100. Todos los valores esperados están derivados a mano de esa tabla.
 */
class MilestoneTest {

    private static final String DESIGN = "Diseño";
    private static final String BUILD = "Construcción";
    private static final String TEST = "Pruebas";
    private static final LocalDate ACHIEVED_ON = LocalDate.parse("2026-03-15");
    private static final int NAME_OVER_LIMIT = Milestone.NAME_MAX_LENGTH + 1;

    private static Milestone pending(final String name, final String weight) {
        return new Milestone(name, new BigDecimal(weight), false, null);
    }

    private static Milestone done(final String name, final String weight) {
        return new Milestone(name, new BigDecimal(weight), true, ACHIEVED_ON);
    }

    @Nested
    @DisplayName("Hito suelto")
    class SingleMilestone {

        @Test
        void keepsNameWeightAndAchievementDate() {
            final Milestone milestone = done(DESIGN, "20");

            assertThat(milestone.name()).isEqualTo(DESIGN);
            assertThat(milestone.weightPercent()).isEqualByComparingTo("20");
            assertThat(milestone.achieved()).isTrue();
            assertThat(milestone.achievedOn()).isEqualTo(ACHIEVED_ON);
        }

        @Test
        void acceptsAchievedMilestoneWithoutDate() {
            // La fecha es opcional: se puede saber que el hito está cumplido sin saber cuándo.
            assertThatCode(() -> new Milestone(DESIGN, new BigDecimal("20"), true, null))
                    .doesNotThrowAnyException();
        }

        @Test
        void rejectsBlankName() {
            assertThatThrownBy(() -> pending(" ", "20"))
                    .isInstanceOf(InvalidActivityException.class)
                    .hasMessageContaining("nombre del hito es obligatorio");
        }

        @Test
        void rejectsNameLongerThanTheColumn() {
            final String tooLong = "H".repeat(NAME_OVER_LIMIT);

            assertThatThrownBy(() -> pending(tooLong, "20"))
                    .isInstanceOf(InvalidActivityException.class)
                    .hasMessageContaining("no puede superar 120 caracteres");
        }

        @Test
        void rejectsZeroWeight() {
            // Un hito que no aporta avance solo sirve para hacer creer que queda valor por ganar.
            assertThatThrownBy(() -> pending(DESIGN, "0"))
                    .isInstanceOf(InvalidActivityException.class)
                    .hasMessageContaining("debe ser mayor que cero");
        }

        @Test
        void rejectsNegativeWeight() {
            assertThatThrownBy(() -> pending(DESIGN, "-10"))
                    .isInstanceOf(InvalidActivityException.class)
                    .hasMessageContaining("debe ser mayor que cero");
        }

        @Test
        void rejectsWeightWithThreeDecimals() {
            // La columna guarda dos decimales: aceptar 33.333 haría que lo respondido no fuera lo
            // almacenado, y la suma confirmada al cliente no sería la que sostiene la invariante.
            assertThatThrownBy(() -> pending(DESIGN, "33.333"))
                    .isInstanceOf(InvalidActivityException.class)
                    .hasMessageContaining("no puede tener más de 2 decimales");
        }

        @Test
        void rejectsWeightOverOneHundred() {
            assertThatThrownBy(() -> pending(DESIGN, "101"))
                    .isInstanceOf(InvalidActivityException.class)
                    .hasMessageContaining("no puede superar 100");
        }

        @Test
        void rejectsAchievementDateOnPendingMilestone() {
            assertThatThrownBy(() -> new Milestone(DESIGN, new BigDecimal("20"), false, ACHIEVED_ON))
                    .isInstanceOf(InvalidActivityException.class)
                    .hasMessageContaining("no puede tener fecha de cumplimiento si no está cumplido");
        }
    }

    @Nested
    @DisplayName("Tabla de hitos")
    class MilestoneTable {

        @Test
        void derivesProgressFromAchievedWeights() {
            // 20 (Diseño) + 50 (Construcción) = 70,00; Pruebas no aporta porque no está cumplido.
            final ProgressMeasurement progress = ProgressMeasurement.weightedMilestones(
                    List.of(done(DESIGN, "20"), done(BUILD, "50"), pending(TEST, "30")));

            assertThat(progress.derivedProgressPercent()).contains(new BigDecimal("70.00"));
        }

        @Test
        void derivesZeroWhenNoMilestoneIsAchieved() {
            // Ningún peso cumplido: 0,00, no un valor ausente.
            final ProgressMeasurement progress = ProgressMeasurement.weightedMilestones(
                    List.of(pending(DESIGN, "20"), pending(BUILD, "50"), pending(TEST, "30")));

            assertThat(progress.derivedProgressPercent()).contains(new BigDecimal("0.00"));
        }

        @Test
        void hasNoDerivedProgressWhenTheMethodIsNotMilestones() {
            // Los hitos se conservan, pero no gobiernan: el avance sigue siendo el declarado.
            final ProgressMeasurement progress = new ProgressMeasurement(
                    MeasurementMethod.PERCENT_COMPLETE, List.of(done(DESIGN, "20")));

            assertThat(progress.derivedProgressPercent()).isEmpty();
            assertThat(progress.milestones()).hasSize(1);
        }

        @Test
        void acceptsWeightsWrittenWithDifferentScales() {
            // 20 + 50.00 + 30,0 suman 100 aunque ninguna escala coincida: la suma se compara con
            // compareTo, así que la forma en que el cliente escribió los decimales no decide.
            assertThatCode(() -> ProgressMeasurement.weightedMilestones(
                    List.of(pending(DESIGN, "20"), pending(BUILD, "50.00"), pending(TEST, "30.0"))))
                    .doesNotThrowAnyException();
        }

        @Test
        void keepsMilestonesInTheOrderTheyWereDeclared() {
            final ProgressMeasurement progress = ProgressMeasurement.weightedMilestones(
                    List.of(pending(DESIGN, "20"), pending(BUILD, "50"), pending(TEST, "30")));

            assertThat(progress.milestones()).extracting(Milestone::name).containsExactly(DESIGN, BUILD, TEST);
        }

        @Test
        void milestoneListIsImmutable() {
            final ProgressMeasurement progress =
                    ProgressMeasurement.weightedMilestones(List.of(pending(DESIGN, "100")));

            assertThatThrownBy(() -> progress.milestones().add(pending(BUILD, "1")))
                    .isInstanceOf(UnsupportedOperationException.class);
        }

        @Test
        void rejectsWeightsThatFallShortOfOneHundred() {
            // 20 + 50 = 70: falta reconocer un 30 % del trabajo y el avance derivado nunca llegaría
            // al 100 % ni con todos los hitos cumplidos.
            assertThatThrownBy(() -> ProgressMeasurement.weightedMilestones(
                    List.of(pending(DESIGN, "20"), pending(BUILD, "50"))))
                    .isInstanceOf(InvalidActivityException.class)
                    .hasMessageContaining("suman 70");
        }

        @Test
        void rejectsWeightsThatExceedOneHundred() {
            // 20 + 50 + 40 = 110: el avance derivado podría superar el 100 % declarado.
            assertThatThrownBy(() -> ProgressMeasurement.weightedMilestones(
                    List.of(pending(DESIGN, "20"), pending(BUILD, "50"), pending(TEST, "40"))))
                    .isInstanceOf(InvalidActivityException.class)
                    .hasMessageContaining("suman 110");
        }

        @Test
        void rejectsEmptyMilestoneList() {
            assertThatThrownBy(() -> ProgressMeasurement.weightedMilestones(List.of()))
                    .isInstanceOf(InvalidActivityException.class)
                    .hasMessageContaining("al menos un hito");
        }

        @Test
        void rejectsMilestoneMethodWithoutMilestones() {
            assertThatThrownBy(() -> new ProgressMeasurement(MeasurementMethod.WEIGHTED_MILESTONES))
                    .isInstanceOf(InvalidActivityException.class)
                    .hasMessageContaining("al menos un hito");
        }
    }
}
