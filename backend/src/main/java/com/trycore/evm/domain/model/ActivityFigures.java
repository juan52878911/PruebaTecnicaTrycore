package com.trycore.evm.domain.model;

import java.math.BigDecimal;
import java.util.Objects;

import com.trycore.evm.domain.exception.InvalidActivityException;

/**
 * Datos de entrada de una actividad para el cálculo de Valor Ganado.
 *
 * <p>Los porcentajes se expresan en escala 0-100. Las invariantes se validan aquí, en el dominio,
 * para que ningún adaptador pueda construir cifras inconsistentes.
 *
 * <p>Los límites de dígitos NO son un detalle de la base de datos que se haya filtrado al dominio:
 * son la precisión con la que este dominio decide trabajar, y las columnas se dimensionaron para
 * respetarla. Se rechaza el exceso de decimales en vez de redondearlo porque un truncamiento
 * silencioso haría que el API confirmara cifras distintas de las que guarda, y los indicadores
 * devueltos no corresponderían a los datos almacenados.
 *
 * @param budgetAtCompletion     presupuesto total planificado (BAC), mayor o igual que cero
 * @param plannedProgressPercent porcentaje de avance planificado a la fecha de corte, entre 0 y 100
 * @param actualProgressPercent  porcentaje de avance real completado, entre 0 y 100
 * @param actualCost             costo real incurrido hasta la fecha (AC), mayor o igual que cero
 */
public record ActivityFigures(
        BigDecimal budgetAtCompletion,
        BigDecimal plannedProgressPercent,
        BigDecimal actualProgressPercent,
        BigDecimal actualCost) {

    /** Los límites se declaran como texto y como enteros porque Bean Validation exige constantes de compilación. */
    public static final String MIN_PERCENT_VALUE = "0";
    public static final String MAX_PERCENT_VALUE = "100";
    public static final String MIN_MONEY_VALUE = "0";

    /** Decimales admitidos en importes y en porcentajes. */
    public static final int MONEY_SCALE = 2;
    public static final int PERCENT_SCALE = 2;

    /** Dígitos enteros admitidos: los porcentajes llegan hasta 100 y los importes hasta 17 cifras. */
    public static final int MONEY_MAX_INTEGER_DIGITS = 17;
    public static final int PERCENT_MAX_INTEGER_DIGITS = 3;

    public static final BigDecimal MIN_PERCENT = new BigDecimal(MIN_PERCENT_VALUE);
    public static final BigDecimal MAX_PERCENT = new BigDecimal(MAX_PERCENT_VALUE);

    public ActivityFigures {
        requireMoney(budgetAtCompletion, "El presupuesto total planificado (BAC)");
        requirePercent(plannedProgressPercent, "El porcentaje de avance planificado");
        requirePercent(actualProgressPercent, "El porcentaje de avance real");
        requireMoney(actualCost, "El costo real (AC)");
    }

    private static void requireMoney(final BigDecimal value, final String fieldLabel) {
        requirePresent(value, fieldLabel);
        if (value.signum() < 0) {
            throw new InvalidActivityException(fieldLabel + " no puede ser negativo");
        }
        requireDigits(value, fieldLabel, MONEY_MAX_INTEGER_DIGITS, MONEY_SCALE);
    }

    private static void requirePercent(final BigDecimal value, final String fieldLabel) {
        requirePresent(value, fieldLabel);
        if (value.compareTo(MIN_PERCENT) < 0 || value.compareTo(MAX_PERCENT) > 0) {
            throw new InvalidActivityException(fieldLabel + " debe estar entre 0 y 100");
        }
        requireDigits(value, fieldLabel, PERCENT_MAX_INTEGER_DIGITS, PERCENT_SCALE);
    }

    private static void requirePresent(final BigDecimal value, final String fieldLabel) {
        if (Objects.isNull(value)) {
            throw new InvalidActivityException(fieldLabel + " es obligatorio");
        }
    }

    /**
     * Rechaza los valores que no caben en la precisión acordada. Un {@link BigDecimal} con escala
     * negativa (notación científica como 1E+2) representa el mismo número con menos decimales, de
     * ahí que la escala se compare acotada a cero.
     */
    private static void requireDigits(
            final BigDecimal value, final String fieldLabel, final int maxIntegerDigits, final int maxScale) {
        final int scale = Math.max(value.scale(), 0);
        if (scale > maxScale) {
            throw new InvalidActivityException(
                    fieldLabel + " no puede tener más de " + maxScale + " decimales");
        }
        if (value.precision() - value.scale() > maxIntegerDigits) {
            throw new InvalidActivityException(
                    fieldLabel + " no puede tener más de " + maxIntegerDigits + " dígitos enteros");
        }
    }
}
