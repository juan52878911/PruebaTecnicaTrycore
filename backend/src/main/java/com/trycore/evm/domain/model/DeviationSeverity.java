package com.trycore.evm.domain.model;

/**
 * Cuánto importa la desviación que describe un {@link PerformanceStatus}.
 *
 * <p>El estado y la severidad responden a preguntas distintas y por eso viajan por separado. El
 * estado es un hecho aritmético: si el CPI es menor que uno, se gastó más de lo que se ganó, y no
 * admite grados. La severidad es una política de tolerancia: en la práctica del estándar cada
 * organización fija unos umbrales de variación a partir de los cuales una desviación deja de ser
 * ruido y exige explicación. Ensanchar el estado hasta cubrir esa tolerancia mezclaría las dos
 * cosas y produciría respuestas contradictorias, del tipo "en presupuesto" acompañado de una
 * variación de costo negativa.
 *
 * <p>La escala es de un solo lado: solo mide desviación desfavorable. Un CPI muy por encima de uno
 * rara vez significa eficiencia; suele ser costo aún no registrado, avance sobrestimado o una línea
 * base mal construida. Pero eso es un problema de calidad del dato, no de desempeño, y meterlo en
 * esta escala rompería su orden: {@link #NONE} es mejor que {@link #WARNING} y este mejor que
 * {@link #CRITICAL}, de modo que quien pinta un color puede quedarse con el peor de varios índices.
 * Si algún día quiere señalarse un índice sospechosamente alto, el modelado honesto es otro eje,
 * no este enum.
 */
public enum DeviationSeverity {

    /** El índice alcanza o supera el objetivo. */
    NONE("Sin desviación relevante"),

    /** El índice está por debajo del objetivo pero dentro de la tolerancia admitida. */
    WARNING("Desviación dentro de la tolerancia: conviene vigilarla"),

    /** El índice cae por debajo de la tolerancia admitida. */
    CRITICAL("Desviación fuera de la tolerancia: exige explicación"),

    /** El índice no existe, así que no hay desviación que medir. */
    NOT_APPLICABLE("No aplica");

    private final String description;

    DeviationSeverity(final String description) {
        this.description = description;
    }

    public String description() {
        return description;
    }
}
