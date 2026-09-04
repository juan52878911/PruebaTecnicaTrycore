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
  "createdAt": "2026-09-03T21:00:00Z",
  "updatedAt": "2026-09-03T21:00:00Z"
}
```

Request de creación/edición (`ProjectRequest`):

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `name` | string | obligatorio, 1-120 caracteres |
| `description` | string | opcional, hasta 500 caracteres |

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

Cuando `actualCost` es 0, `costPerformanceIndex`, `estimateAtCompletion` y `varianceAtCompletion` son `null`
y `costStatus` es `NOT_APPLICABLE` con el motivo. Cuando `plannedValue` es 0, `schedulePerformanceIndex` es
`null` y `scheduleStatus` es `NOT_APPLICABLE`.

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

## Endpoints

| Método | Ruta | Éxito | Errores |
| --- | --- | --- | --- |
| GET | `/projects` | 200 lista de Proyecto | |
| POST | `/projects` | 201 Proyecto, cabecera `Location` | 400 validación |
| GET | `/projects/{id}` | 200 Proyecto | 404 |
| PUT | `/projects/{id}` | 200 Proyecto | 400, 404 |
| DELETE | `/projects/{id}` | 204 | 404 |
| GET | `/projects/{id}/evm` | 200 ProjectEvmSummary | 404 |
| GET | `/projects/{id}/activities` | 200 lista de Actividad con indicators | 404 |
| POST | `/projects/{id}/activities` | 201 Actividad, cabecera `Location` | 400, 404 |
| PUT | `/projects/{id}/activities/{activityId}` | 200 Actividad | 400, 404 |
| DELETE | `/projects/{id}/activities/{activityId}` | 204 | 404 |

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

| Código | Cuándo |
| --- | --- |
| 400 | Validación de campos o JSON malformado |
| 404 | Proyecto o actividad inexistente, o actividad que no pertenece al proyecto |
| 500 | Error no controlado (no debería ocurrir; se registra en log) |
