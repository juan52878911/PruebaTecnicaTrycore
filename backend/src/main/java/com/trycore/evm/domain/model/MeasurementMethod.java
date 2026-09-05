package com.trycore.evm.domain.model;

import java.math.BigDecimal;

/**
 * Regla con la que una actividad reconoce valor a partir de su avance.
 *
 * <p>En el estándar se llama regla de ganancia, y gobierna tanto el valor ganado como el
 * planificado. Es importante que se aplique a los dos lados: SV = EV - PV y SPI = EV / PV solo
 * significan "adelantado o atrasado" si ambos términos están medidos con la misma vara. Un paquete
 * de 0/100 que va perfectamente al día pero aún no ha cerrado, medido con la regla solo en el lado
 * ganado, daría una desviación de cronograma enorme y un SPI de cero: una alarma falsa fabricada
 * por restar dos cifras que no son comparables. Aplicada a los dos lados, su valor planificado
 * también es cero y la resta vale cero, que es la respuesta correcta.
 *
 * <p>Consecuencia visible que conviene no esconder: con las reglas de umbral el valor planificado
 * deja de crecer de forma continua y avanza a saltos, así que la curva acumulada de esas
 * actividades es una escalera y no una rampa.
 */
public enum MeasurementMethod {

    /**
     * El avance declarado se reconoce tal cual. Es el comportamiento histórico y el valor por
     * defecto: sirve cuando el avance de la actividad se puede estimar de forma continua y creíble.
     */
    PERCENT_COMPLETE("Porcentaje completado") {
        @Override
        BigDecimal fractionOf(final BigDecimal reportedPercent, final boolean started) {
            return reportedPercent;
        }
    },

    /**
     * No se reconoce nada hasta cerrar. Evita discutir estimaciones intermedias en actividades
     * cortas o donde un avance parcial no tiene valor por sí mismo.
     */
    FIXED_0_100("Todo o nada (0 / 100)") {
        @Override
        BigDecimal fractionOf(final BigDecimal reportedPercent, final boolean started) {
            return isComplete(reportedPercent) ? FULL : NONE;
        }
    },

    /**
     * Se reconoce la mitad al arrancar y el resto al cerrar. Su razón de ser es no tener que medir
     * el avance intermedio, así que quien lo usa suele dejar el porcentaje a cero hasta terminar:
     * por eso "iniciada" no se deduce del porcentaje, se recibe como dato.
     */
    FIXED_50_50("Mitad al iniciar, mitad al cerrar (50 / 50)") {
        @Override
        BigDecimal fractionOf(final BigDecimal reportedPercent, final boolean started) {
            if (isComplete(reportedPercent)) {
                return FULL;
            }
            return started ? HALF : NONE;
        }
    },

    /**
     * El valor se reconoce por hitos cumplidos, cada uno con su peso.
     *
     * <p>Aquí el porcentaje que llega ya viene derivado de los hitos, así que la regla se limita a
     * respetarlo. La ponderación es una regla de construcción de la actividad, no de cálculo del
     * valor ganado, y mantenerla fuera de este enum evita que el cálculo tenga que conocer los
     * hitos y que existan dos fuentes de verdad sobre el mismo avance.
     */
    WEIGHTED_MILESTONES("Hitos ponderados") {
        @Override
        BigDecimal fractionOf(final BigDecimal reportedPercent, final boolean started) {
            return reportedPercent;
        }
    };

    private static final BigDecimal NONE = BigDecimal.ZERO;
    private static final BigDecimal HALF = new BigDecimal("50");
    private static final BigDecimal FULL = new BigDecimal("100");

    private final String description;

    MeasurementMethod(final String description) {
        this.description = description;
    }

    public String description() {
        return description;
    }

    /**
     * Porcentaje que esta regla reconoce a partir del declarado.
     *
     * @param reportedPercent porcentaje declarado, entre 0 y 100
     * @param started         si la actividad ha arrancado; solo lo consulta la regla de 50/50
     */
    public BigDecimal recognisedPercent(final BigDecimal reportedPercent, final boolean started) {
        return fractionOf(reportedPercent, started);
    }

    abstract BigDecimal fractionOf(BigDecimal reportedPercent, boolean started);

    private static boolean isComplete(final BigDecimal reportedPercent) {
        return reportedPercent.compareTo(FULL) >= 0;
    }
}
