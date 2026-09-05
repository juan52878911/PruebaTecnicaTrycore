package com.trycore.evm.domain.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

import com.trycore.evm.domain.exception.InvalidActivityException;

/**
 * Cómo mide su avance una actividad: la regla de ganancia y, cuando la regla es la de hitos, la
 * tabla de hitos que la sostiene.
 *
 * <p>Agrupa la regla en un objeto de valor, igual que {@link ActivitySchedule} agrupa las fechas,
 * para que la actividad gane la capacidad sin gastar un componente por cada dato que venga
 * después.
 *
 * <p>La invariante de los hitos ponderados es que sus pesos sumen exactamente 100. Vive aquí y no
 * en la base de datos porque es una condición sobre el conjunto entero, no sobre una fila: ningún
 * hito suelto puede saber si el conjunto es válido. Por eso el conjunto se escribe siempre completo
 * y de una vez, y por eso una actividad medida por hitos nunca existe con una tabla incompleta.
 *
 * <p>Los hitos se conservan aunque la regla no sea la de hitos. Cambiar de regla no es borrar
 * trabajo declarado: el cliente sigue viendo la tabla y sabe, por el método, que ahora no gobierna
 * el avance, de modo que puede atenuarla en vez de hacerla desaparecer.
 *
 * @param method     regla con la que la actividad reconoce valor; nunca nula
 * @param milestones hitos declarados, en su orden; lista inmutable, nunca nula, posiblemente vacía
 */
public record ProgressMeasurement(MeasurementMethod method, List<Milestone> milestones) {

    /** Suma exacta que deben alcanzar los pesos de los hitos de una actividad medida por hitos. */
    public static final BigDecimal TOTAL_WEIGHT_PERCENT = new BigDecimal("100");

    private static final ProgressMeasurement PERCENT_COMPLETE =
            new ProgressMeasurement(MeasurementMethod.PERCENT_COMPLETE, List.of());

    public ProgressMeasurement {
        // La ausencia de método significa la regla de siempre: así una petición que no lo envía
        // sigue comportándose como antes en lugar de ser rechazada.
        method = method == null ? MeasurementMethod.PERCENT_COMPLETE : method;
        milestones = milestones == null ? List.of() : List.copyOf(milestones);
        if (method == MeasurementMethod.WEIGHTED_MILESTONES) {
            requireCompleteWeights(milestones);
        }
    }

    /**
     * Medición sin hitos declarados. Con la regla de hitos ponderados es inválida por definición,
     * y esta forma existe para que el código que solo elige regla no tenga que nombrar una lista
     * vacía.
     */
    public ProgressMeasurement(final MeasurementMethod method) {
        this(method, List.of());
    }

    /** Medición por porcentaje completado, que es la regla por defecto del sistema. */
    public static ProgressMeasurement percentComplete() {
        return PERCENT_COMPLETE;
    }

    /** Medición por hitos ponderados, cuyos pesos deben sumar exactamente 100. */
    public static ProgressMeasurement weightedMilestones(final List<Milestone> milestones) {
        return new ProgressMeasurement(MeasurementMethod.WEIGHTED_MILESTONES, milestones);
    }

    /** Copia con otra tabla de hitos, conservando la regla. */
    public ProgressMeasurement withMilestones(final List<Milestone> newMilestones) {
        return new ProgressMeasurement(method, newMilestones);
    }

    /**
     * Avance que se deriva de los hitos cumplidos, o vacío cuando la regla no es la de hitos.
     *
     * <p>Es la suma de los pesos de los hitos cumplidos, en escala de porcentaje. Al ser una suma
     * de valores que ya vienen en esa escala no hay redondeo real: fijar la escala solo normaliza
     * la forma del número para que el cero se lea "0,00" igual que cualquier otro resultado.
     */
    public Optional<BigDecimal> derivedProgressPercent() {
        if (method != MeasurementMethod.WEIGHTED_MILESTONES) {
            return Optional.empty();
        }
        return Optional.of(achievedWeight().setScale(ActivityFigures.PERCENT_SCALE, RoundingMode.HALF_UP));
    }

    private BigDecimal achievedWeight() {
        return milestones.stream()
                .filter(Milestone::achieved)
                .map(Milestone::weightPercent)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * La suma se compara con {@code compareTo} y no con {@code equals}: un peso escrito como "20"
     * y otro como "20.00" son el mismo número con distinta escala, y {@code equals} los
     * distinguiría, de modo que una tabla correcta se rechazaría por cómo el cliente escribió los
     * decimales.
     */
    private static void requireCompleteWeights(final List<Milestone> milestones) {
        if (milestones.isEmpty()) {
            throw new InvalidActivityException(
                    "Una actividad medida por hitos ponderados debe declarar al menos un hito");
        }
        final BigDecimal total = milestones.stream()
                .map(Milestone::weightPercent)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(TOTAL_WEIGHT_PERCENT) != 0) {
            throw new InvalidActivityException(
                    "Los pesos de los hitos deben sumar exactamente 100 y suman " + total.toPlainString());
        }
    }
}
