package com.trycore.evm.domain.model;

import java.math.BigDecimal;

/**
 * Actividad acompañada de sus indicadores de Valor Ganado calculados.
 *
 * <p>Los porcentajes efectivos son los que la regla de medición reconoció a partir de los
 * declarados. Viajan junto a los indicadores porque con las reglas de umbral pueden no coincidir
 * con lo que el usuario escribió: quien declara un 65 % en una actividad de todo o nada verá un
 * valor ganado de cero, y sin este dato ese cero parecería un error del sistema en lugar de la
 * regla haciendo su trabajo.
 *
 * @param activity                actividad con sus cifras de entrada
 * @param indicators              indicadores derivados de esas cifras
 * @param effectivePlannedPercent porcentaje planificado que la regla reconoce
 * @param effectiveActualPercent  porcentaje real que la regla reconoce
 */
public record ActivityEvm(
        Activity activity,
        EvmIndicators indicators,
        BigDecimal effectivePlannedPercent,
        BigDecimal effectiveActualPercent) {

    /**
     * Forma anterior a que existieran las reglas de medición: los porcentajes efectivos coinciden
     * con los declarados, que es lo que hace la regla por defecto.
     */
    public ActivityEvm(final Activity activity, final EvmIndicators indicators) {
        this(
                activity,
                indicators,
                activity.figures().plannedProgressPercent(),
                activity.figures().actualProgressPercent());
    }
}
