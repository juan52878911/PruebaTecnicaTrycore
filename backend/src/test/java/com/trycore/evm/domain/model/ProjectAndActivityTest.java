package com.trycore.evm.domain.model;

import java.math.BigDecimal;
import java.time.Instant;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.trycore.evm.domain.exception.InvalidActivityException;
import com.trycore.evm.domain.exception.InvalidIndicatorException;
import com.trycore.evm.domain.exception.InvalidProjectException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProjectAndActivityTest {

    private static final Long PROJECT_ID = 7L;
    private static final Long ACTIVITY_ID = 3L;
    private static final Instant CREATED_AT = Instant.parse("2026-09-01T10:00:00Z");
    private static final Instant UPDATED_AT = Instant.parse("2026-09-02T10:00:00Z");
    private static final ActivityFigures FIGURES = new ActivityFigures(
            new BigDecimal("1000"), new BigDecimal("50"), new BigDecimal("40"), new BigDecimal("600"));
    private static final ActivitySchedule SCHEDULE = ActivitySchedule.empty();

    @Nested
    class ProjectInvariants {

        @Test
        void createsNewProjectWithoutIdentityNorDates() {
            final Project project = Project.create("Plataforma de pagos", "Demo");

            assertThat(project.id()).isNull();
            assertThat(project.createdAt()).isNull();
            assertThat(project.updatedAt()).isNull();
            assertThat(project.name()).isEqualTo("Plataforma de pagos");
        }

        @Test
        void renameKeepsIdentityAndDates() {
            final Project stored = new Project(PROJECT_ID, "Antiguo", null, CREATED_AT, UPDATED_AT);

            final Project renamed = stored.rename("Nuevo", "Con descripción");

            assertThat(renamed.id()).isEqualTo(PROJECT_ID);
            assertThat(renamed.createdAt()).isEqualTo(CREATED_AT);
            assertThat(renamed.updatedAt()).isEqualTo(UPDATED_AT);
            assertThat(renamed.name()).isEqualTo("Nuevo");
            assertThat(renamed.description()).isEqualTo("Con descripción");
        }

        @Test
        @DisplayName("rechaza nombre nulo, vacío o en blanco")
        void rejectsBlankName() {
            assertThatThrownBy(() -> Project.create(null, null)).isInstanceOf(InvalidProjectException.class);
            assertThatThrownBy(() -> Project.create("", null)).isInstanceOf(InvalidProjectException.class);
            assertThatThrownBy(() -> Project.create("   ", null))
                    .isInstanceOf(InvalidProjectException.class)
                    .hasMessageContaining("obligatorio");
        }

        @Test
        void rejectsNameLongerThanLimit() {
            final String tooLong = "x".repeat(Project.NAME_MAX_LENGTH + 1);

            assertThatThrownBy(() -> Project.create(tooLong, null))
                    .isInstanceOf(InvalidProjectException.class)
                    .hasMessageContaining(String.valueOf(Project.NAME_MAX_LENGTH));
        }

        @Test
        void rejectsDescriptionLongerThanLimit() {
            final String tooLong = "x".repeat(Project.DESCRIPTION_MAX_LENGTH + 1);

            assertThatThrownBy(() -> Project.create("Nombre", tooLong))
                    .isInstanceOf(InvalidProjectException.class)
                    .hasMessageContaining(String.valueOf(Project.DESCRIPTION_MAX_LENGTH));
        }

        @Test
        void acceptsNameAndDescriptionAtTheLimit() {
            final Project project = Project.create(
                    "x".repeat(Project.NAME_MAX_LENGTH), "y".repeat(Project.DESCRIPTION_MAX_LENGTH));

            assertThat(project.name()).hasSize(Project.NAME_MAX_LENGTH);
        }
    }

    @Nested
    class ActivityInvariants {

        @Test
        void createsNewActivityWithoutIdentityNorDates() {
            final Activity activity = Activity.create(PROJECT_ID, "Diseño", FIGURES, SCHEDULE);

            assertThat(activity.id()).isNull();
            assertThat(activity.projectId()).isEqualTo(PROJECT_ID);
            assertThat(activity.figures()).isEqualTo(FIGURES);
        }

        @Test
        void updateKeepsIdentityProjectAndDates() {
            final Activity stored =
                    new Activity(ACTIVITY_ID, PROJECT_ID, "Antigua", FIGURES, SCHEDULE, CREATED_AT, UPDATED_AT);
            final ActivityFigures newFigures = new ActivityFigures(
                    new BigDecimal("2000"), new BigDecimal("10"), new BigDecimal("20"), new BigDecimal("300"));

            final Activity updated = stored.update("Nueva", newFigures, SCHEDULE);

            assertThat(updated.id()).isEqualTo(ACTIVITY_ID);
            assertThat(updated.projectId()).isEqualTo(PROJECT_ID);
            assertThat(updated.createdAt()).isEqualTo(CREATED_AT);
            assertThat(updated.name()).isEqualTo("Nueva");
            assertThat(updated.figures()).isEqualTo(newFigures);
        }

        @Test
        void rejectsBlankName() {
            assertThatThrownBy(() -> Activity.create(PROJECT_ID, " ", FIGURES, SCHEDULE))
                    .isInstanceOf(InvalidActivityException.class)
                    .hasMessageContaining("obligatorio");
        }

        @Test
        void rejectsNameLongerThanLimit() {
            final String tooLong = "x".repeat(Activity.NAME_MAX_LENGTH + 1);

            assertThatThrownBy(() -> Activity.create(PROJECT_ID, tooLong, FIGURES, SCHEDULE))
                    .isInstanceOf(InvalidActivityException.class)
                    .hasMessageContaining(String.valueOf(Activity.NAME_MAX_LENGTH));
        }

        @Test
        void rejectsMissingProjectOrFigures() {
            // Toda invariante del dominio viaja como DomainException: el manejador REST la traduce
            // a un 400 con formato RFC 7807, cosa que no puede hacer con una NullPointerException.
            assertThatThrownBy(() -> Activity.create(null, "Diseño", FIGURES, SCHEDULE))
                    .isInstanceOf(InvalidActivityException.class)
                    .hasMessageContaining("proyecto");
            assertThatThrownBy(() -> Activity.create(PROJECT_ID, "Diseño", null, SCHEDULE))
                    .isInstanceOf(InvalidActivityException.class)
                    .hasMessageContaining("cifras");
        }
    }

    @Nested
    class Interpretations {

        @Test
        void ofUsesTheStatusDescription() {
            final IndexInterpretation interpretation = IndexInterpretation.of(PerformanceStatus.ON_SCHEDULE);

            assertThat(interpretation.status()).isEqualTo(PerformanceStatus.ON_SCHEDULE);
            assertThat(interpretation.message()).isEqualTo(PerformanceStatus.ON_SCHEDULE.description());
        }

        @Test
        void notApplicableCarriesTheReason() {
            final IndexInterpretation interpretation = IndexInterpretation.notApplicable("sin divisor");

            assertThat(interpretation.status()).isEqualTo(PerformanceStatus.NOT_APPLICABLE);
            assertThat(interpretation.message()).isEqualTo("sin divisor");
        }

        @Test
        void rejectsNullStatusOrMessage() {
            assertThatThrownBy(() -> new IndexInterpretation(null, "m"))
                    .isInstanceOf(InvalidIndicatorException.class);
            assertThatThrownBy(() -> new IndexInterpretation(PerformanceStatus.ON_BUDGET, null))
                    .isInstanceOf(InvalidIndicatorException.class);
        }
    }
}
