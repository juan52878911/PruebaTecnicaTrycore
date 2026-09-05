package com.trycore.evm.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.trycore.evm.domain.exception.InvalidActivityException;

/**
 * Hito de una actividad, con el peso que aporta al avance cuando se cumple.
 *
 * <p>El peso se expresa en la misma escala que los demás porcentajes del dominio (0-100 con dos
 * decimales) para que la suma de los hitos de una actividad se pueda comparar contra 100 sin
 * ninguna conversión. Se exige estrictamente positivo: un hito de peso cero no aporta nada al
 * avance, así que declararlo solo serviría para confundir a quien lea la tabla y para hacer creer
 * que queda trabajo reconocible donde no lo hay.
 *
 * <p>El hito no conoce su posición: el orden es el de la lista que lo contiene. Guardarlo como
 * campo editable abriría la puerta a dos hitos con el mismo número o a huecos en la secuencia, y
 * obligaría a validar algo que la propia estructura de datos ya garantiza.
 *
 * @param name         nombre no vacío de hasta {@link #NAME_MAX_LENGTH} caracteres
 * @param weightPercent peso del hito sobre el total de la actividad, mayor que cero y hasta 100
 * @param achieved     si el hito ya se cumplió
 * @param achievedOn   fecha de cumplimiento; opcional y solo admisible en un hito cumplido
 */
public record Milestone(String name, BigDecimal weightPercent, boolean achieved, LocalDate achievedOn) {

    /** Mismo límite que el nombre de la actividad: la columna se dimensionó igual. */
    public static final int NAME_MAX_LENGTH = 120;

    /** Peso mínimo declarado como texto porque Bean Validation exige constantes de compilación. */
    public static final String MIN_WEIGHT_VALUE = "0";

    public Milestone {
        requireName(name);
        requireWeight(weightPercent, name);
        if (!achieved && achievedOn != null) {
            throw new InvalidActivityException(
                    "El hito '" + name + "' no puede tener fecha de cumplimiento si no está cumplido");
        }
    }

    private static void requireName(final String name) {
        if (name == null || name.isBlank()) {
            throw new InvalidActivityException("El nombre del hito es obligatorio");
        }
        if (name.length() > NAME_MAX_LENGTH) {
            throw new InvalidActivityException(
                    "El nombre del hito no puede superar " + NAME_MAX_LENGTH + " caracteres");
        }
    }

    /**
     * El peso comparte la precisión de los porcentajes de la actividad. Se rechaza el exceso de
     * decimales en vez de redondearlo por la misma razón que en {@link ActivityFigures}: un
     * truncamiento silencioso haría que la suma confirmada al cliente no fuera la almacenada.
     */
    private static void requireWeight(final BigDecimal weightPercent, final String name) {
        if (weightPercent == null) {
            throw new InvalidActivityException("El peso del hito '" + name + "' es obligatorio");
        }
        if (weightPercent.signum() <= 0) {
            throw new InvalidActivityException("El peso del hito '" + name + "' debe ser mayor que cero");
        }
        if (weightPercent.compareTo(ActivityFigures.MAX_PERCENT) > 0) {
            throw new InvalidActivityException("El peso del hito '" + name + "' no puede superar 100");
        }
        if (Math.max(weightPercent.scale(), 0) > ActivityFigures.PERCENT_SCALE) {
            throw new InvalidActivityException(
                    "El peso del hito '" + name + "' no puede tener más de "
                            + ActivityFigures.PERCENT_SCALE + " decimales");
        }
    }
}
