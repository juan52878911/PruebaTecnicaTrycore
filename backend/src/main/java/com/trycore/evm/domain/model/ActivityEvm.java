package com.trycore.evm.domain.model;

/**
 * Actividad acompañada de sus indicadores de Valor Ganado calculados.
 *
 * @param activity   actividad con sus cifras de entrada
 * @param indicators indicadores derivados de esas cifras
 */
public record ActivityEvm(Activity activity, EvmIndicators indicators) {
}
