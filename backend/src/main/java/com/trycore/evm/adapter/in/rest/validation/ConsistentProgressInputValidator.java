package com.trycore.evm.adapter.in.rest.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import com.trycore.evm.adapter.in.rest.dto.ActivityRequest;
import com.trycore.evm.domain.model.MeasurementMethod;

/**
 * Comprueba la coherencia entre la regla de medición y el avance declarado.
 *
 * <p>Con la regla de hitos ponderados el avance real deja de ser un dato de entrada: se deriva de
 * los pesos de los hitos cumplidos. Una petición que lo envíe se rechaza en vez de aceptarse e
 * ignorarse en silencio, porque aceptar un dato que no se usa haría creer al cliente que fijó el
 * avance de la actividad y la respuesta le contradiría sin explicar por qué.
 */
public class ConsistentProgressInputValidator
        implements ConstraintValidator<ConsistentProgressInput, ActivityRequest> {

    static final String DERIVED_PERCENT_MESSAGE =
            "El porcentaje de avance real no se envía con la regla de hitos ponderados: se deriva de los "
                    + "pesos de los hitos cumplidos";
    static final String REQUIRED_PERCENT_MESSAGE = "El porcentaje de avance real es obligatorio";
    static final String REQUIRED_MILESTONES_MESSAGE =
            "Una actividad medida por hitos ponderados debe declarar al menos un hito";

    private static final String ACTUAL_PROGRESS_FIELD = "actualProgressPercent";
    private static final String MILESTONES_FIELD = "milestones";

    @Override
    public boolean isValid(final ActivityRequest request, final ConstraintValidatorContext context) {
        if (request == null) {
            return true;
        }
        context.disableDefaultConstraintViolation();
        if (request.measurementMethod() != MeasurementMethod.WEIGHTED_MILESTONES) {
            return requirePresentPercent(request, context);
        }
        final boolean percentAbsent = rejectPercentIfPresent(request, context);
        final boolean milestonesPresent = requireMilestones(request, context);
        return percentAbsent && milestonesPresent;
    }

    private static boolean requirePresentPercent(
            final ActivityRequest request, final ConstraintValidatorContext context) {
        if (request.actualProgressPercent() != null) {
            return true;
        }
        reject(context, ACTUAL_PROGRESS_FIELD, REQUIRED_PERCENT_MESSAGE);
        return false;
    }

    private static boolean rejectPercentIfPresent(
            final ActivityRequest request, final ConstraintValidatorContext context) {
        if (request.actualProgressPercent() == null) {
            return true;
        }
        reject(context, ACTUAL_PROGRESS_FIELD, DERIVED_PERCENT_MESSAGE);
        return false;
    }

    private static boolean requireMilestones(
            final ActivityRequest request, final ConstraintValidatorContext context) {
        if (request.milestones() != null && !request.milestones().isEmpty()) {
            return true;
        }
        reject(context, MILESTONES_FIELD, REQUIRED_MILESTONES_MESSAGE);
        return false;
    }

    /** Cada violación se cuelga del campo al que corresponde para que el 400 lo nombre. */
    private static void reject(
            final ConstraintValidatorContext context, final String field, final String message) {
        context.buildConstraintViolationWithTemplate(message)
                .addPropertyNode(field)
                .addConstraintViolation();
    }
}
