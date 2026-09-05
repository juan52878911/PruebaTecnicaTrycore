package com.trycore.evm.domain.model;

/**
 * Cómo mide su avance una actividad.
 *
 * <p>Agrupa la regla de ganancia en un objeto de valor, igual que {@link ActivitySchedule} agrupa
 * las fechas, para que la actividad gane la capacidad sin gastar un componente por cada dato que
 * venga después.
 *
 * @param method regla con la que la actividad reconoce valor; nunca nula
 */
public record ProgressMeasurement(MeasurementMethod method) {

    private static final ProgressMeasurement PERCENT_COMPLETE =
            new ProgressMeasurement(MeasurementMethod.PERCENT_COMPLETE);

    public ProgressMeasurement {
        // La ausencia de método significa la regla de siempre: así una petición que no lo envía
        // sigue comportándose como antes en lugar de ser rechazada.
        method = method == null ? MeasurementMethod.PERCENT_COMPLETE : method;
    }

    /** Medición por porcentaje completado, que es la regla por defecto del sistema. */
    public static ProgressMeasurement percentComplete() {
        return PERCENT_COMPLETE;
    }
}
