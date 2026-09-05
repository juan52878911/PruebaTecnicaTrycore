package com.trycore.evm.domain.model;

/**
 * Las cifras de una actividad congeladas en una fecha de corte.
 *
 * <p>Guarda el nombre además del identificador porque la medición es un registro histórico: si la
 * actividad se renombra o se elimina más tarde, el corte debe seguir contando lo que pasó entonces.
 *
 * @param activityId   identificador de la actividad medida
 * @param activityName nombre que tenía la actividad en el momento del corte
 * @param totals       cifras base de esa actividad en el corte
 */
public record ActivityMeasurement(Long activityId, String activityName, EvmTotals totals) {
}
