package com.trycore.evm.domain.model;

import java.time.Instant;

import com.trycore.evm.domain.exception.InvalidProjectException;

/**
 * Proyecto que agrupa actividades para el análisis de Valor Ganado.
 *
 * <p>El identificador y las fechas son nulos mientras el proyecto no ha sido persistido; los asigna
 * el adaptador de persistencia. El resto de invariantes se validan aquí.
 *
 * @param id          identificador asignado por la persistencia, nulo antes de guardar
 * @param name        nombre no vacío de hasta {@link #NAME_MAX_LENGTH} caracteres
 * @param description descripción opcional de hasta {@link #DESCRIPTION_MAX_LENGTH} caracteres
 * @param manager     responsable opcional de hasta {@link #MANAGER_MAX_LENGTH} caracteres, nulo si
 *                    todavía no se ha asignado
 * @param createdAt   fecha de creación, nula antes de guardar
 * @param updatedAt   fecha de última modificación, nula antes de guardar
 */
public record Project(
        Long id,
        String name,
        String description,
        String manager,
        Instant createdAt,
        Instant updatedAt) {

    public static final int NAME_MAX_LENGTH = 120;
    public static final int DESCRIPTION_MAX_LENGTH = 500;
    public static final int MANAGER_MAX_LENGTH = 120;

    public Project {
        if (name == null || name.isBlank()) {
            throw new InvalidProjectException("El nombre del proyecto es obligatorio");
        }
        if (name.length() > NAME_MAX_LENGTH) {
            throw new InvalidProjectException(
                    "El nombre del proyecto no puede superar " + NAME_MAX_LENGTH + " caracteres");
        }
        if (description != null && description.length() > DESCRIPTION_MAX_LENGTH) {
            throw new InvalidProjectException(
                    "La descripción del proyecto no puede superar " + DESCRIPTION_MAX_LENGTH + " caracteres");
        }
        // El responsable es opcional a propósito: un proyecto puede existir antes de que se
        // designe a quien lo dirige, y forzarlo obligaría a inventar un nombre.
        if (manager != null && manager.length() > MANAGER_MAX_LENGTH) {
            throw new InvalidProjectException(
                    "El responsable del proyecto no puede superar " + MANAGER_MAX_LENGTH + " caracteres");
        }
    }

    /**
     * Constructor con la forma anterior a que existiera el responsable, que lo deja sin asignar.
     * Existe para que el código que no lo elige no tenga que nombrarlo.
     */
    public Project(
            final Long id,
            final String name,
            final String description,
            final Instant createdAt,
            final Instant updatedAt) {
        this(id, name, description, null, createdAt, updatedAt);
    }

    /** Proyecto nuevo sin responsable asignado, todavía sin identificador ni fechas. */
    public static Project create(final String name, final String description) {
        return create(name, description, null);
    }

    /** Proyecto nuevo, todavía sin identificador ni fechas. */
    public static Project create(final String name, final String description, final String manager) {
        return new Project(null, name, description, manager, null, null);
    }

    /** Copia del proyecto con nuevo nombre y descripción, conservando responsable, identidad y fechas. */
    public Project rename(final String newName, final String newDescription) {
        return rename(newName, newDescription, manager);
    }

    /** Copia del proyecto con nuevos nombre, descripción y responsable, conservando identidad y fechas. */
    public Project rename(final String newName, final String newDescription, final String newManager) {
        return new Project(id, newName, newDescription, newManager, createdAt, updatedAt);
    }
}
