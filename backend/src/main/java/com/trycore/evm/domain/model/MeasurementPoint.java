package com.trycore.evm.domain.model;

import java.time.LocalDate;

/**
 * Un punto de la evolución del proyecto: una fecha de corte con sus cifras y sus indicadores ya
 * calculados. Es la unidad que consume una gráfica de líneas.
 *
 * @param cutoffDate fecha del corte
 * @param notes      comentario del corte, útil para anotar la gráfica
 * @param totals     cifras base en esa fecha
 * @param indicators indicadores derivados de esas cifras
 */
public record MeasurementPoint(
        LocalDate cutoffDate,
        String notes,
        EvmTotals totals,
        EvmIndicators indicators) {
}
