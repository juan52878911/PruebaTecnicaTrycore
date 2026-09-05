package com.trycore.evm.adapter.in.rest.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/**
 * Exige que el avance declarado en la petición sea coherente con la regla de medición elegida.
 *
 * <p>Es una restricción de clase y no de campo porque la regla que decide qué campos son válidos
 * está en otro campo de la misma petición. Se resuelve en la validación de entrada, y no dejando
 * que el dominio lo descubra, para que el cliente reciba el error asociado al campo concreto que
 * sobra o que falta.
 */
@Documented
@Constraint(validatedBy = ConsistentProgressInputValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ConsistentProgressInput {

    /** Mensaje por defecto; en la práctica cada violación aporta el suyo, ligado a su campo. */
    String message() default "El avance declarado no es coherente con la regla de medición";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
