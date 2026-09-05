# Nota de impacto para el frontend

Cambios del backend que afectan al tablero Valora. Todo es aditivo: nada de lo que el frontend consume hoy
cambia de forma ni de valor, así que la aplicación sigue compilando y funcionando sin tocar una línea. Lo que
sigue es lo que conviene aprovechar, y dos sitios donde el código actual quedará silenciosamente incorrecto si
no se adapta.

## 1. El color debe salir del servidor, no de umbrales propios

Cada interpretación de índice (`costStatus` y `scheduleStatus`) trae ahora un campo `severity`:

```json
"costStatus": {
  "status": "OVER_BUDGET",
  "severity": "WARNING",
  "message": "Sobre presupuesto: se gasta más de lo que se avanza"
}
```

| Valor | Cuándo |
| --- | --- |
| `NONE` | El índice alcanza o supera el objetivo |
| `WARNING` | Está por debajo pero dentro de la tolerancia |
| `CRITICAL` | Cae por debajo de la tolerancia |
| `NOT_APPLICABLE` | El índice no existe; siempre a la vez que el estado |

Y los umbrales con los que se clasificó viajan en `indicators.thresholds`:

```json
"thresholds": { "warning": 1.00, "critical": 0.95 }
```

**Qué hacer.** El color sale de `severity`, el texto de `status`. Con eso desaparece el compromiso que obligaba
a derivar el color del estado para no contradecir el distintivo: el servidor ya dice a la vez qué pasa y cuánto
importa, así que un CPI de 0,9857 puede pintarse en oliva mientras el texto sigue diciendo "sobre presupuesto",
sin mentir con ninguno de los dos.

**Qué queda duplicado.** `core/preferences/preferences.model.ts` define `warningThreshold: 0.95` y
`criticalThreshold: 0.80`, y `core/status/status-tone.ts` los aplica en `riskLevel()`. Eso es ahora una segunda
fuente de verdad que discrepa de la del servidor: un CPI de 0,90 es `CRITICAL` para el backend y solo aviso para
el cliente. Hay que retirar esos umbrales de Preferencias, o dejarlos como preferencia visual que se aplica
encima de la severidad del servidor, nunca en paralelo a ella.

## 2. La vista previa del avance quedará incorrecta con los métodos nuevos

`core/evm/progress-preview.ts` reimplementa `EV = % x BAC` en el cliente. Esa fórmula ya solo vale para una de
las cuatro reglas de medición.

| Regla | Qué reconoce |
| --- | --- |
| `PERCENT_COMPLETE` | El porcentaje declarado tal cual |
| `FIXED_0_100` | Nada hasta el 100 %, y entonces todo |
| `FIXED_50_50` | La mitad al iniciar, el resto al cerrar |
| `WEIGHTED_MILESTONES` | El avance derivado de los hitos cumplidos |

Con `FIXED_0_100` al 65 %, la vista previa diría 65.000 sobre un BAC de 100.000 y el servidor guardará 0.

**Qué hacer.** O se extiende la vista previa por regla, o se desactiva cuando la regla no sea
`PERCENT_COMPLETE`. La respuesta trae `effectivePlannedProgressPercent` y `effectiveActualProgressPercent`, que
son los porcentajes que la regla reconoció: mostrarlos junto al declarado evita que un valor ganado de cero
parezca un error del sistema.

## 3. Campos nuevos disponibles

En la actividad:

- `measurementMethod` y `measurementMethodDescription`, con el nombre legible en español de la regla.
- `effectivePlannedProgressPercent` y `effectiveActualProgressPercent`.

En los indicadores:

- `severity` en cada interpretación y `thresholds` en el bloque.
- `estimateFormula` con la fórmula titular, y `estimates` con las tres estimaciones estándar del costo final,
  cada una con su valor, si es aplicable y el supuesto de negocio que la hace válida. El rango entre ellas es
  más informativo que cualquiera de las tres por separado: en el caso canónico son 120.000, 150.000 y 172.500.

## 4. Parámetros de consulta nuevos

| Parámetro | Dónde | Para qué |
| --- | --- | --- |
| `eacFormula` | `/projects/{id}/evm` y `/projects/{id}/timeline` | Elige la fórmula titular del EAC. Un valor desconocido devuelve 400 |

Los dos endpoints aceptan el mismo nombre y el mismo valor por defecto a propósito: con fórmulas distintas por
pantalla, el análisis y el histórico mostrarían estimaciones diferentes de las mismas cifras.

## 5. Una regla que no cambia y conviene recordar

Un indicador `null` significa que no se puede calcular, nunca que valga cero, y se pinta como no disponible. Un
índice que vale cero sí es un cero real y se pinta como cero. La diferencia sigue siendo visible: `CPI: null`
con severidad `NOT_APPLICABLE` frente a `CPI: 0.0000` con severidad `CRITICAL`.
