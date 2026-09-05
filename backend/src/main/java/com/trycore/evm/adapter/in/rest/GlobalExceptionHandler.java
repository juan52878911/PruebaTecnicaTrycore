package com.trycore.evm.adapter.in.rest;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import com.trycore.evm.adapter.in.rest.dto.ValidationErrorResponse;
import com.trycore.evm.domain.exception.ActivityNotFoundException;
import com.trycore.evm.domain.exception.InvalidActivityException;
import com.trycore.evm.domain.exception.InvalidIndicatorException;
import com.trycore.evm.domain.exception.InvalidMeasurementException;
import com.trycore.evm.domain.exception.InvalidProjectException;
import com.trycore.evm.domain.exception.MeasurementAlreadyExistsException;
import com.trycore.evm.domain.exception.MeasurementNotFoundException;
import com.trycore.evm.domain.exception.ProjectNotFoundException;

/**
 * Traduce las excepciones del dominio y de validación a respuestas RFC 7807 ({@link ProblemDetail}).
 * Ningún controlador conoce estos detalles: solo delegan en los casos de uso y dejan que este
 * componente construya la respuesta de error.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String VALIDATION_ERROR_DETAIL = "La petición contiene campos inválidos";
    private static final String INTEGRITY_ERROR_DETAIL =
            "La petición viola una restricción de la base de datos y no se pudo guardar";
    private static final String ERRORS_PROPERTY = "errors";
    private static final String UNKNOWN_PARAMETER_VALUE = "El valor del parámetro %s no es válido";

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationError(final MethodArgumentNotValidException exception) {
        final ProblemDetail problemDetail =
                ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, VALIDATION_ERROR_DETAIL);
        problemDetail.setProperty(ERRORS_PROPERTY, fieldErrors(exception));
        return problemDetail;
    }

    /** El cuerpo ilegible no aporta un detalle que se pueda mostrar al cliente sin filtrar internos. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail handleMalformedRequest() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, VALIDATION_ERROR_DETAIL);
    }

    /**
     * Un parámetro de consulta con un valor que no corresponde a ninguno admitido, por ejemplo una
     * fórmula de EAC inexistente. Sin este manejador la respuesta sería un 500, cuando en realidad
     * el error está en la petición.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail handleUnknownParameterValue(final MethodArgumentTypeMismatchException exception) {
        return ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, UNKNOWN_PARAMETER_VALUE.formatted(exception.getName()));
    }

    /**
     * Red de seguridad para lo que la base de datos rechaza y la validación de entrada no atrapó.
     * Sin este manejador la respuesta sería un 500 con la sentencia SQL y el mensaje del motor en
     * el cuerpo, lo que rompe el contrato RFC 7807 y expone detalles internos. El mensaje original
     * no se propaga al cliente justamente por eso.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail handleIntegrityViolation() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, INTEGRITY_ERROR_DETAIL);
    }

    @ExceptionHandler({
            InvalidProjectException.class,
            InvalidActivityException.class,
            InvalidIndicatorException.class,
            InvalidMeasurementException.class})
    public ProblemDetail handleInvalidDomainState(final RuntimeException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler({
            ProjectNotFoundException.class,
            ActivityNotFoundException.class,
            MeasurementNotFoundException.class})
    public ProblemDetail handleNotFound(final RuntimeException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, exception.getMessage());
    }

    /**
     * Un corte repetido no es un dato mal formado sino un conflicto con lo ya registrado: el
     * proyecto ya tiene una medición en esa fecha y la forma de rectificarla es borrarla.
     */
    @ExceptionHandler(MeasurementAlreadyExistsException.class)
    public ProblemDetail handleConflict(final MeasurementAlreadyExistsException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage());
    }

    private static List<ValidationErrorResponse> fieldErrors(final MethodArgumentNotValidException exception) {
        return exception.getBindingResult().getFieldErrors().stream()
                .map(GlobalExceptionHandler::toValidationError)
                .toList();
    }

    private static ValidationErrorResponse toValidationError(final FieldError fieldError) {
        return new ValidationErrorResponse(fieldError.getField(), fieldError.getDefaultMessage());
    }
}
