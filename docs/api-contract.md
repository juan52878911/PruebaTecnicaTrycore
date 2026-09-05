# Contrato del API REST (v1)

Prefijo: `/api/v1`. Formato: JSON. Errores: RFC 7807 (`application/problem+json`).
Este contrato se escribe antes que el código para que backend y frontend avancen en paralelo. La fuente de
verdad final es la especificación OpenAPI expuesta en `/api-docs` y `/swagger-ui`.

## Convenciones numéricas

- Dinero: decimal con dos cifras (`100000.00`).
- Porcentajes: escala 0-100 con dos cifras (`50.00`).
- Índices (CPI, SPI): cuatro cifras (`0.6667`), o `null` cuando el divisor es cero.
- Todo número se serializa como número JSON, nunca como cadena.

## Recursos

### Proyecto

```json
{
  "id": 1,
  "name": "Plataforma de pagos",
  "description": "Proyecto de demostración para el análisis de Valor Ganado",
  "manager": "Alicia Ramos",
  "createdAt": "2026-09-03T21:00:00Z",
  "updatedAt": "2026-09-03T21:00:00Z"
}
```

`manager` es el responsable del proyecto y admite `null`: un proyecto puede registrarse antes de que se designe
a quien lo dirige. `PUT /projects/{id}` reemplaza el recurso completo, así que una petición sin `manager` deja
el proyecto sin responsable.

Request de creación/edición (`ProjectRequest`):

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `name` | string | obligatorio, 1-120 caracteres |
| `description` | string | opcional, hasta 500 caracteres |
| `manager` | string | opcional, hasta 120 caracteres |

#### Listado con indicadores

`GET /projects?includeIndicators=true` añade a cada proyecto el contador de actividades, las sumas y los
indicadores consolidados, para que una tabla con cifras no tenga que pedir `/projects/{id}/evm` una vez por
proyecto. El servidor resuelve la pantalla entera en dos consultas: una de proyectos y una de actividades.

```json
{
  "id": 1,
  "name": "Plataforma de pagos",
  "description": "...",
  "manager": "Alicia Ramos",
  "createdAt": "2026-09-03T21:00:00Z",
  "updatedAt": "2026-09-03T21:00:00Z",
  "activityCount": 5,
  "totals": {
    "budgetAtCompletion": 2000000.00,
    "plannedValue": 1240000.00,
    "earnedValue": 1116000.00,
    "actualCost": 1258000.00
  },
  "indicators": { "...": "ver EvmIndicators" }
}
```

Las tres propiedades nuevas se omiten por completo cuando no se pide el parámetro: sin él la respuesta es
exactamente la de siempre, ni siquiera con nulos. Un proyecto sin actividades devuelve `activityCount` 0, sumas
en 0 e índices `null` con estado `NOT_APPLICABLE`, nunca un error. Las cifras salen del mismo consolidado que
`GET /projects/{id}/evm`, así que la fila del listado y el detalle no pueden discrepar.

### Actividad

```json
{
  "id": 10,
  "projectId": 1,
  "name": "Diseño de arquitectura",
  "budgetAtCompletion": 100000.00,
  "plannedProgressPercent": 50.00,
  "actualProgressPercent": 40.00,
  "actualCost": 60000.00,
  "indicators": { "...": "ver EvmIndicators" }
}
```

Request de creación/edición (`ActivityRequest`):

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `name` | string | obligatorio, 1-120 caracteres |
| `budgetAtCompletion` | decimal | obligatorio, >= 0 |
| `plannedProgressPercent` | decimal | obligatorio, 0-100 |
| `actualProgressPercent` | decimal | obligatorio, 0-100 |
| `actualCost` | decimal | obligatorio, >= 0 |
| `measurementMethod` | enum | opcional; si se omite, `PERCENT_COMPLETE` |

### Regla de medición del avance

Cada actividad reconoce valor según su regla, y **la regla se aplica tanto al valor planificado como al
ganado**. Es lo que hace que SV y SPI signifiquen algo: restar dos cifras medidas con varas distintas fabrica
atrasos que no existen.

| Valor | Qué reconoce |
| --- | --- |
| `PERCENT_COMPLETE` | El porcentaje declarado tal cual. Comportamiento por defecto |
| `FIXED_0_100` | Nada hasta llegar al 100 %, y entonces todo |
| `FIXED_50_50` | La mitad al iniciar, el resto al cerrar |
| `WEIGHTED_MILESTONES` | El avance derivado de los hitos cumplidos y sus pesos |

Una actividad se considera iniciada si tiene fecha real de inicio **o** un avance declarado mayor que cero.
La primera señal es la que importa en `FIXED_50_50`: quien usa esa regla no estima el avance intermedio y deja
el porcentaje a cero hasta cerrar, así que deducir el arranque del porcentaje anularía el método.

La respuesta de actividad incluye `effectivePlannedProgressPercent` y `effectiveActualProgressPercent`, que son
los porcentajes que la regla reconoció. Con las reglas de umbral pueden no coincidir con los declarados, y sin
ese dato un valor ganado de cero sobre un avance del 65 % parecería un error en vez de la regla haciendo su
trabajo.

Ejemplo con BAC 100.000, planificado 50 %, real 40 % y AC 60.000:

| Regla | PV | EV | SV | SPI |
| --- | --- | --- | --- | --- |
| `PERCENT_COMPLETE` | 50.000 | 40.000 | -10.000 | 0,8000 |
| `FIXED_0_100` | 0 | 0 | 0 | `null` |
| `FIXED_50_50` | 50.000 | 50.000 | 0 | 1,0000 |

### EvmIndicators

```json
{
  "plannedValue": 50000.00,
  "earnedValue": 40000.00,
  "actualCost": 60000.00,
  "costVariance": -20000.00,
  "scheduleVariance": -10000.00,
  "costPerformanceIndex": 0.6667,
  "schedulePerformanceIndex": 0.8000,
  "estimateAtCompletion": 150000.00,
  "varianceAtCompletion": -50000.00,
  "costStatus": { "status": "OVER_BUDGET", "message": "Sobre presupuesto: se gasta más de lo que se avanza" },
  "scheduleStatus": { "status": "BEHIND_SCHEDULE", "message": "Atrasado respecto al cronograma" }
}
```

Estados posibles:

| Campo | Valores |
| --- | --- |
| `costStatus.status` | `UNDER_BUDGET`, `ON_BUDGET`, `OVER_BUDGET`, `NOT_APPLICABLE` |
| `scheduleStatus.status` | `AHEAD_OF_SCHEDULE`, `ON_SCHEDULE`, `BEHIND_SCHEDULE`, `NOT_APPLICABLE` |
| `costStatus.severity` y `scheduleStatus.severity` | `NONE`, `WARNING`, `CRITICAL`, `NOT_APPLICABLE` |

### Estado y severidad

El estado es un hecho aritmético y la severidad una política de tolerancia. Un CPI de 0,9857 está
`OVER_BUDGET`, porque se gastó más de lo que se ganó, y su severidad es `WARNING`, porque la desviación cabe
dentro de lo admitido. Quien pinte un color debe usar `severity`; quien muestre un texto, `status`. Los
umbrales con los que se clasificó viajan en `indicators.thresholds` para que ningún cliente los repita:

```json
"thresholds": { "warning": 1.00, "critical": 0.95 }
```

Las bandas son cerradas por abajo: `índice >= warning` es `NONE`, `critical <= índice < warning` es `WARNING`,
y por debajo `CRITICAL`. Un índice nulo es `NOT_APPLICABLE`, siempre a la vez en estado y en severidad.

### Estimaciones del costo final

`estimateAtCompletion` y `varianceAtCompletion` son los de la fórmula titular, y `estimates` trae las tres
fórmulas estándar sobre las mismas cifras, cada una con su supuesto:

| Fórmula | Cálculo | Supuesto |
| --- | --- | --- |
| `BAC_OVER_CPI` (por defecto) | BAC / CPI | El desempeño de costo observado se mantiene |
| `AC_PLUS_REMAINING` | AC + (BAC - EV) | La desviación fue puntual; lo que queda va a presupuesto |
| `AC_PLUS_REMAINING_OVER_CPI_SPI` | AC + (BAC - EV) / (CPI x SPI) | Hay que recuperar el atraso sin ampliar plazo |

El parámetro de consulta `eacFormula` elige la titular en `GET /projects/{id}/evm` y en
`GET /projects/{id}/timeline`; un valor desconocido devuelve 400. Una fórmula que no se puede calcular
devuelve `null` con `applicable: false`, y **no se sustituye** por otra que sí aplique. La segunda nunca es
indefinida porque no divide: su cero en un proyecto vacío es un cero real, no un indefinido disfrazado.

Cuando `actualCost` es 0, `costPerformanceIndex`, `estimateAtCompletion` y `varianceAtCompletion` son `null`
y `costStatus` es `NOT_APPLICABLE` con el motivo. Cuando `plannedValue` es 0, `schedulePerformanceIndex` es
`null` y `scheduleStatus` es `NOT_APPLICABLE`.

Hay un tercer caso, en el que el índice sí existe pero la estimación no: con avance real 0 y costo incurrido,
`costPerformanceIndex` vale `0.0000` (desempeño real y desfavorable, `OVER_BUDGET`), mientras que
`estimateAtCompletion` y `varianceAtCompletion` son `null` porque dividir el presupuesto entre cero no da un
número. Es el único caso en que un valor nulo no viene acompañado de un estado propio que lo explique: el
estado describe el índice, que en ese caso sí está definido.

### ProjectEvmSummary (`GET /projects/{id}/evm`)

```json
{
  "project": { "id": 1, "name": "Plataforma de pagos", "description": "..." },
  "budgetAtCompletion": 430000.00,
  "indicators": { "...": "EvmIndicators calculados sobre las sumas del proyecto" },
  "activities": [ { "...": "Actividad con sus indicators" } ]
}
```

Un proyecto sin actividades devuelve 200 con sumas en 0, índices `null` y estados `NOT_APPLICABLE`.

### Medición (corte del histórico)

Una medición congela las cifras del proyecto en una fecha. No se envían cifras al crearla: se toman de las
actividades tal como están en ese momento.

```json
{
  "id": 1,
  "projectId": 1,
  "cutoffDate": "2026-08-31",
  "notes": "Cierre de la semana 1",
  "totals": {
    "budgetAtCompletion": 430000.00,
    "plannedValue": 170000.00,
    "earnedValue": 152500.00,
    "actualCost": 160000.00
  },
  "activities": [
    {
      "activityId": 10,
      "activityName": "Diseño de arquitectura",
      "totals": {
        "budgetAtCompletion": 100000.00,
        "plannedValue": 50000.00,
        "earnedValue": 40000.00,
        "actualCost": 60000.00
      }
    }
  ],
  "createdAt": "2026-08-31T21:00:00Z"
}
```

Request de creación (`MeasurementRequest`):

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `cutoffDate` | date | obligatorio, no puede ser futura |
| `notes` | string | opcional, hasta 500 caracteres |

Una medición no se actualiza: para rectificarla se borra y se vuelve a tomar. Dos cortes del mismo proyecto en
la misma fecha son un conflicto (409), no un error de validación. El corte guarda el nombre que tenía cada
actividad, de modo que sigue siendo legible aunque después se renombre o se elimine.

Un corte devuelve cifras, no indicadores: los índices no se almacenan. Quien los necesita pide la serie
temporal, que los calcula al leer con el mismo servicio que usa el análisis en vivo.

### ProjectTimeline (`GET /projects/{id}/timeline`)

Serie lista para graficar: un punto por corte, ordenados por fecha de la más antigua a la más reciente.

```json
{
  "project": { "id": 1, "name": "Plataforma de pagos", "description": "..." },
  "points": [
    {
      "cutoffDate": "2026-08-24",
      "notes": "Cierre de la semana 1",
      "totals": {
        "budgetAtCompletion": 100000.00,
        "plannedValue": 50000.00,
        "earnedValue": 40000.00,
        "actualCost": 60000.00
      },
      "indicators": {
        "plannedValue": 50000.00,
        "earnedValue": 40000.00,
        "actualCost": 60000.00,
        "costVariance": -20000.00,
        "scheduleVariance": -10000.00,
        "costPerformanceIndex": 0.6667,
        "schedulePerformanceIndex": 0.8000,
        "estimateAtCompletion": 150000.00,
        "varianceAtCompletion": -50000.00,
        "costStatus": { "status": "OVER_BUDGET", "message": "Sobre presupuesto: se gasta más de lo que se avanza" },
        "scheduleStatus": { "status": "BEHIND_SCHEDULE", "message": "Atrasado respecto al cronograma" }
      }
    },
    {
      "cutoffDate": "2026-08-31",
      "notes": "Cierre de la semana 2",
      "totals": {
        "budgetAtCompletion": 100000.00,
        "plannedValue": 80000.00,
        "earnedValue": 70000.00,
        "actualCost": 80000.00
      },
      "indicators": {
        "plannedValue": 80000.00,
        "earnedValue": 70000.00,
        "actualCost": 80000.00,
        "costVariance": -10000.00,
        "scheduleVariance": -10000.00,
        "costPerformanceIndex": 0.8750,
        "schedulePerformanceIndex": 0.8750,
        "estimateAtCompletion": 114285.71,
        "varianceAtCompletion": -14285.71,
        "costStatus": { "status": "OVER_BUDGET", "message": "Sobre presupuesto: se gasta más de lo que se avanza" },
        "scheduleStatus": { "status": "BEHIND_SCHEDULE", "message": "Atrasado respecto al cronograma" }
      }
    }
  ]
}
```

Un proyecto sin cortes devuelve 200 con `points` vacío.

## Endpoints

| Método | Ruta | Éxito | Errores |
| --- | --- | --- | --- |
| GET | `/projects` | 200 lista de Proyecto; con `?includeIndicators=true` cada uno con `activityCount`, `totals` e `indicators` | |
| POST | `/projects` | 201 Proyecto, cabecera `Location` | 400 validación |
| GET | `/projects/{id}` | 200 Proyecto | 404 |
| PUT | `/projects/{id}` | 200 Proyecto | 400, 404 |
| DELETE | `/projects/{id}` | 204 | 404 |
| GET | `/projects/{id}/evm` | 200 ProjectEvmSummary | 404 |
| GET | `/projects/{id}/activities` | 200 lista de Actividad con indicators | 404 |
| GET | `/projects/{id}/activities/{activityId}` | 200 Actividad con indicators | 404 |
| POST | `/projects/{id}/activities` | 201 Actividad, cabecera `Location` | 400, 404 |
| PUT | `/projects/{id}/activities/{activityId}` | 200 Actividad | 400, 404 |
| DELETE | `/projects/{id}/activities/{activityId}` | 204 | 404 |
| GET | `/projects/{id}/measurements` | 200 lista de Medición | 404 |
| POST | `/projects/{id}/measurements` | 201 Medición, cabecera `Location` | 400, 404, 409 |
| GET | `/projects/{id}/measurements/{measurementId}` | 200 Medición | 404 |
| DELETE | `/projects/{id}/measurements/{measurementId}` | 204 | 404 |
| GET | `/projects/{id}/timeline` | 200 ProjectTimeline | 404 |

## Errores (RFC 7807)

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "La petición contiene campos inválidos",
  "instance": "/api/v1/projects/1/activities",
  "errors": [ { "field": "plannedProgressPercent", "message": "debe estar entre 0 y 100" } ]
}
```

La lista `errors` solo aparece en los errores de validación de campos. En OpenAPI este cuerpo se documenta con
el esquema `ValidationProblem`; los demás errores usan `ProblemDetail` sin esa lista.

| Código | Cuándo |
| --- | --- |
| 400 | Validación de campos, JSON malformado o fecha de corte futura |
| 404 | Proyecto, actividad o medición inexistente, o que no pertenece al proyecto |
| 409 | El proyecto ya tiene un corte en esa fecha |
| 500 | Error no controlado (no debería ocurrir; se registra en log) |
