# Sistema de Valor Ganado (EVM) - Prueba técnica Trycore

Herramienta interna para que un líder de proyecto registre el avance de sus actividades y sepa, con los
indicadores de Valor Ganado (Earned Value Management), si su proyecto va bien o mal en cronograma y presupuesto.

Versión 1.1.0. Backend y frontend completos y verificados: el API calcula los indicadores y el tablero
Valora los presenta en escritorio y móvil.

## El problema en una frase

Saber cuánto se ha gastado y cuánto se ha avanzado por separado no dice nada. Un proyecto que gastó el 60 % del
presupuesto habiendo completado el 40 % del trabajo va mal, y los indicadores EVM lo cuantifican.

| Indicador | Fórmula | Qué responde |
| --- | --- | --- |
| PV, Planned Value | % planificado x BAC | Cuánto trabajo debería haberse hecho a la fecha |
| EV, Earned Value | % completado x BAC | Cuánto trabajo se ha hecho de verdad, medido en dinero |
| CV, Cost Variance | EV - AC | Cuánto dinero se ha desviado |
| SV, Schedule Variance | EV - PV | Cuánto trabajo se lleva de adelanto o de atraso |
| CPI, Cost Performance Index | EV / AC | Cuánto valor se obtiene por cada peso gastado |
| SPI, Schedule Performance Index | EV / PV | Qué fracción del avance previsto se ha logrado |
| EAC, Estimate at Completion | BAC / CPI | Cuánto costará el proyecto si se sigue al ritmo actual |
| VAC, Variance at Completion | BAC - EAC | Cuánto se desviará del presupuesto al terminar |

Un CPI mayor que 1 es eficiencia en costos, menor que 1 significa que se gasta más de lo que se avanza. El SPI
funciona igual sobre el cronograma.

## Stack

| Capa | Tecnología |
| --- | --- |
| Backend | Java 21, Spring Boot 4.1, Maven, arquitectura hexagonal |
| Base de datos | PostgreSQL 16 en `docker-compose`, migraciones con Flyway |
| Frontend | Angular 22 sin zone.js, componentes standalone, signals y Axios |
| Pruebas | JUnit 5, AssertJ, Mockito, ArchUnit, Testcontainers, JaCoCo |
| Documentación del API | OpenAPI 3 con springdoc, en `/api-docs` y `/swagger-ui` |
| Calidad | Checkstyle bloqueante en los tres perfiles, ESLint y Prettier en el frontend |

## Requisitos

- Java 21 y Maven (el repositorio incluye el wrapper, `./backend/mvnw`)
- Docker, para PostgreSQL local y para los tests de integración con Testcontainers
- Node 20 o superior, solo para el frontend

## Cómo correr el proyecto en local

Todos los scripts se resuelven respecto a la raíz del repositorio, aunque se invoquen desde otro directorio.

### Desarrollo

```bash
scripts/run-dev.sh
```

Levanta PostgreSQL en `localhost:5432` con base `evm`, usuario `evm` y contraseña `evm`, espera a que el
contenedor esté saludable con un plazo máximo, y arranca el backend en el puerto 8080. Flyway crea el esquema
al iniciar y el perfil `dev` carga los datos de demostración: un proyecto con tres actividades.

Con el backend arriba:

- Swagger UI: http://localhost:8080/swagger-ui
- Especificación OpenAPI: http://localhost:8080/api-docs
- Análisis del proyecto de demostración: http://localhost:8080/api/v1/projects/1/evm

### Verificación completa

```bash
scripts/run-tests.sh
```

Ejecuta `./backend/mvnw verify -Ptest`: Checkstyle, los tests unitarios, el test de arquitectura hexagonal con
ArchUnit, los tests de contrato de cada endpoint contra un PostgreSQL real levantado con Testcontainers, y el
umbral de cobertura de JaCoCo. Requiere Docker. Al final imprime la ruta del informe de cobertura agregado,
que suma la cobertura de los tests unitarios y la de los de integración.

### Empaquetado y arranque de producción

```bash
scripts/build-prod.sh
scripts/run-prod-local.sh
```

El primero genera `backend/target/evm-backend.jar` sin herramientas de desarrollo. El segundo lo arranca contra
el PostgreSQL local con el perfil `prod`, que toma su configuración de las variables `DB_URL`, `DB_USER` y
`DB_PASSWORD` y deja Swagger apagado salvo que se exporte `EVM_SWAGGER_ENABLED=true`.

### Frontend

```bash
./scripts/run-frontend.sh
```

Arranca en <http://localhost:4200>. Necesita el backend en marcha: le habla directamente a
<http://localhost:8080/api/v1> por CORS, no por proxy. El origen está declarado en
`evm.cors.allowed-origins` del perfil `dev`.

Para verificarlo entero (formato, lint, pruebas y build de producción):

```bash
./scripts/run-frontend-tests.sh
```

Y para servir el build de producción desde su propio origen, en el puerto 4300, que es lo que ejercita
CORS de verdad:

```bash
./scripts/run-frontend-prod.sh
```

#### Configuración por entorno

El cliente HTTP es una única instancia de Axios construida a partir de `API_CONFIG`, un token de
inyección. Los valores por entorno viven en `frontend/src/environments/` y Angular sustituye el fichero en
tiempo de compilación:

| Entorno | Fichero | Raíz del API | Espera máxima |
| --- | --- | --- | --- |
| Desarrollo | `environment.ts` | `http://localhost:8080/api/v1` | 10 s |
| Producción | `environment.production.ts` | `http://localhost:8080/api/v1` | 15 s |
| Pruebas | `environment.testing.ts` | `http://localhost/api/v1` | 100 ms |

En las pruebas la configuración se sustituye por inyector, que es lo que hace falta la mayor parte de las
veces: `TestBed.configureTestingModule({ providers: provideApiTesting({ routes }) })` monta la instancia
real, con sus interceptores, sobre un transporte falso.

`axios` se importa en un solo fichero, `core/api/axios-instance.ts`, y una regla de ESLint lo impone.
Cambiar de cliente HTTP sería reescribir ese fichero y sus dos interceptores, sin tocar ninguna vista.

## Arquitectura del frontend

```
frontend/src/app/
  core/api/        Cliente Axios, modelos del contrato, normalización de errores RFC 7807
  core/preferences Preferencias del usuario, persistidas en el navegador
  core/format      Formato de dinero, índices, porcentajes y fechas
  core/labels      Siglas del estándar o español claro, conmutables en Ajustes
  core/status      Traducción del estado del servidor a color y a nivel de riesgo
  shared/ui        Componentes presentacionales: tarjetas, curva S, diálogos, avisos
  features/        Una carpeta por vista, con su store
  layout/          Marco y navegación
```

Sin zone.js: la detección de cambios la dispara la escritura de un signal, no la resolución de una
promesa. Las lecturas usan `resource()` y las escrituras métodos `async` que escriben signals; ni una
promesa cruza hacia el componente.

Un indicador que el servidor devuelve como `null` se pinta siempre como `N/A`, nunca como cero. Un índice
que vale cero sí se pinta como cero, porque ese índice existe.

## Perfiles Maven

| Perfil | Activación | Qué incluye | Script |
| --- | --- | --- | --- |
| `dev` | Por defecto | Devtools, PostgreSQL de `docker-compose`, datos de demostración, Swagger activo, solo tests unitarios | `scripts/run-dev.sh` |
| `test` | `-Ptest` | Testcontainers, ArchUnit, tests de integración con failsafe, JaCoCo bloqueante | `scripts/run-tests.sh` |
| `prod` | `-Pprod` | Sin devtools ni datos de demostración, configuración por variables de entorno, Swagger apagado | `scripts/build-prod.sh` |

Checkstyle corre en fase `validate` y es bloqueante en los tres perfiles: un linter que solo avisa acaba
ignorado.

## Esquema de la base de datos

La única fuente del esquema es Flyway, en `backend/src/main/resources/db/migration`. El contenedor de
`docker-compose` arranca vacío y la aplicación crea las tablas al iniciarse. Los datos de demostración son una
migración repetible que solo carga el perfil `dev`.

`db/init.sql` es el script de inicialización que pide el enunciado, para quien prefiera preparar la base a
mano con `psql -U evm -d evm -f db/init.sql`. No se edita: lo genera `./scripts/build-init-sql.sh`
concatenando las migraciones y la semilla, de modo que no pueda divergir del esquema real. `docker-compose`
no lo monta a propósito, para que exista un solo camino de inicialización efectivo.

## API

Prefijo `/api/v1`. Los errores usan RFC 7807 (`ProblemDetail`), y los de validación incluyen una lista `errors`
con el campo y el motivo. El contrato completo está en [docs/api-contract.md](docs/api-contract.md) y en la
especificación OpenAPI.

| Método | Ruta | Respuesta |
| --- | --- | --- |
| GET, POST | `/projects` | 200, 201 |
| GET, PUT, DELETE | `/projects/{id}` | 200, 200, 204 |
| GET | `/projects/{id}/evm` | 200, análisis consolidado con cada actividad |
| GET, POST | `/projects/{id}/activities` | 200, 201 |
| PUT, DELETE | `/projects/{id}/activities/{activityId}` | 200, 204 |
| GET, POST | `/projects/{id}/measurements` | 200, 201 |
| GET, DELETE | `/projects/{id}/measurements/{measurementId}` | 200, 204 |
| GET | `/projects/{id}/timeline` | 200, serie temporal lista para graficar |

Ejemplo con el proyecto de demostración:

```bash
curl -s http://localhost:8080/api/v1/projects/1/evm
```

```json
{
  "budgetAtCompletion": 430000.00,
  "indicators": {
    "plannedValue": 170000.00,
    "earnedValue": 152500.00,
    "actualCost": 160000.00,
    "costVariance": -7500.00,
    "scheduleVariance": -17500.00,
    "costPerformanceIndex": 0.9531,
    "schedulePerformanceIndex": 0.8971,
    "estimateAtCompletion": 451147.54,
    "varianceAtCompletion": -21147.54,
    "costStatus": { "status": "OVER_BUDGET", "message": "Sobre presupuesto: se gasta más de lo que se avanza" },
    "scheduleStatus": { "status": "BEHIND_SCHEDULE", "message": "Atrasado respecto al cronograma" }
  }
}
```

## Histórico y series temporales

Un **corte** (`measurement`) es la fotografía de un proyecto en una fecha: las cuatro cifras base (BAC, PV, EV
y AC) del proyecto y de cada una de sus actividades, con el nombre que cada actividad tenía entonces. No se
envían cifras al crearlo, se toman de las actividades tal como están en ese momento, y la fecha no puede ser
futura: un corte documenta lo que ya ocurrió, no una previsión.

**Los índices no se guardan.** Un corte almacena solo cifras; el CPI, el SPI, el EAC y sus interpretaciones se
calculan al leer, con el mismo `EvmCalculator` que usa el análisis en vivo. Así el histórico no puede
desincronizarse del cálculo vigente: si mañana se corrige una fórmula, las mediciones ya tomadas se leen con la
fórmula corregida en lugar de arrastrar un número obsoleto que nadie podría reproducir.

Un corte es inmutable: no hay operación de actualización. Para rectificarlo se borra y se vuelve a tomar. Dos
cortes del mismo proyecto en la misma fecha se rechazan con 409, porque romperían el orden de la gráfica. Las
líneas por actividad no tienen clave foránea hacia `activities` a propósito: la actividad puede eliminarse
después y el registro histórico debe sobrevivir.

Uso típico: se registra un corte al cierre de cada semana y se pide `GET /projects/{id}/timeline`, que devuelve
un punto por corte, ordenado cronológicamente y con los indicadores ya calculados e interpretados. Es la
respuesta que consume directamente una gráfica de líneas, sin que el cliente reimplemente ninguna fórmula.

```bash
curl -s -X POST http://localhost:8080/api/v1/projects/1/measurements \
  -H 'Content-Type: application/json' \
  -d '{"cutoffDate":"2026-08-31","notes":"Cierre de la semana 1"}'
curl -s http://localhost:8080/api/v1/projects/1/timeline
```

## Decisiones de cálculo

- Todo se calcula con `BigDecimal`. Los importes tienen escala 2, los índices escala 4, redondeo `HALF_UP`.
  Los porcentajes se expresan de 0 a 100.
- **Un índice cuyo divisor es cero no vale cero: no existe.** Con AC = 0 el CPI se devuelve como `null` con
  estado `NOT_APPLICABLE` y su motivo, en lugar de un cero que se leería como el peor desempeño posible.
  Lo mismo con el SPI cuando PV = 0. EAC y VAC heredan esa indefinición.
- **EAC se calcula como BAC x AC / EV con precisión completa**, no dividiendo por el CPI ya redondeado. Es la
  misma fórmula, pero usar el CPI a cuatro decimales daría 149.992,50 donde el resultado exacto es 150.000.
- **El consolidado del proyecto suma BAC, PV, EV y AC y calcula los índices sobre las sumas.** No promedia los
  índices de las actividades: dos actividades con CPI 2,0 y 0,5 consolidan en 1,0, no en 1,25.
- Las cifras se rechazan si exceden la precisión con la que el dominio trabaja, en vez de redondearse en
  silencio. Aceptar un 33,333 % y guardar 33,33 haría que el API confirmara datos que no almacenó.

## Arquitectura

Hexagonal, con las reglas de dependencia verificadas por un test de ArchUnit que rompe el build si se violan.

```
com.trycore.evm
  domain/        modelo y cálculo EVM. Sin Spring, sin JPA, sin Jackson.
    model/       Project, Activity, ActivityFigures, EvmIndicators, ProjectEvmSummary,
                 ProjectMeasurement, MeasurementPoint, ProjectTimeline
    service/     EvmCalculator
    exception/   excepciones de negocio
  application/   casos de uso. Tampoco depende de ningún framework.
    port/in/     lo que el sistema sabe hacer
    port/out/    lo que el sistema necesita que le den
    service/     implementaciones, clases planas sin anotaciones
  adapter/
    in/rest/     controladores, DTOs, mapeadores, manejador de errores
    out/persistence/  entidades JPA, repositorios y adaptadores
  config/        único lugar donde se cablea la aplicación con sus adaptadores
```

La lógica de negocio no vive en controladores ni en entidades JPA: los primeros traducen HTTP a casos de uso y
las segundas solo mapean columnas.

## Pruebas

269 tests: 135 en el backend (97 unitarios y 38 de integración) y 134 en el frontend. Los valores esperados de
cada cálculo EVM están derivados a mano de la fórmula y escritos literalmente en el test, nunca copiados de la
salida del código.

| Tipo | Dónde | Qué cubre |
| --- | --- | --- |
| Unitarios | `backend/src/test/java` | Cálculo EVM con sus casos borde, invariantes del modelo, casos de uso con dobles de los puertos |
| Arquitectura | `backend/src/test-integration/java` | Reglas de dependencia entre capas con ArchUnit |
| Integración | `backend/src/test-integration/java` | Contrato de cada endpoint contra PostgreSQL real, incluida la política CORS |
| Frontend | `frontend/src/app/**/*.spec.ts` | Normalización de errores, cliente Axios, servicios del API, stores, formato, umbrales y componentes |

Los tests del frontend no simulan el módulo de axios: sustituyen su adaptador de transporte, de modo que la
petición recorre la tubería real, interceptores incluidos, sin levantar ningún servidor y sin añadir
dependencias.

Casos borde cubiertos: AC = 0, PV = 0, avance real 0, BAC = 0, proyecto sin actividades, proyecto sin cortes,
fecha de corte futura o repetida, porcentajes fuera de rango, precisión mayor que la almacenable, importes que
no caben en la columna, almacenamiento del navegador bloqueado o con datos corruptos, y respuesta de error que
no tiene forma de RFC 7807.

## Documento de proceso

[AI_PROCESS.md](AI_PROCESS.md) recoge las herramientas de IA usadas, todos los prompts en orden cronológico y
sin parafrasear, cómo se validaron las fórmulas, las decisiones en las que no se siguió a la IA y la reflexión
final.

## Flujo de trabajo

Gitflow estricto: `main` para producción, `develop` como integración, una rama `feature/*` por funcionalidad
integrada mediante Pull Request con commit de merge, y una rama `release/*` antes del merge final a `main`.
