# Sistema de Valor Ganado (EVM) - Prueba técnica Trycore

Herramienta interna para que un líder de proyecto registre el avance de sus actividades y sepa, con los
indicadores de Valor Ganado (Earned Value Management), si su proyecto va bien o mal en cronograma y presupuesto.

Estado: en construcción. El backend se desarrolla primero; el frontend queda como esqueleto hasta la Fase B.

## Stack

| Capa | Tecnología |
| --- | --- |
| Backend | Java 21, Spring Boot, Maven, arquitectura hexagonal |
| Base de datos | PostgreSQL 16 (docker-compose), migraciones con Flyway |
| Frontend | Angular (esqueleto en esta fase) |
| Pruebas | JUnit 5, AssertJ, ArchUnit, Testcontainers, JaCoCo |
| Documentación del API | OpenAPI 3 con springdoc, en `/api-docs` y `/swagger-ui` |

## Estructura del repositorio

```
backend/            API REST Spring Boot (hexagonal: domain, application, adapter, config)
frontend/           Esqueleto Angular
db/init.sql         Script de inicialización de la base a mano (esquema + datos de demostración)
docker-compose.yml  PostgreSQL 16 local
docs/               Contrato del API y notas de diseño
scripts/            Scripts locales por perfil (dev, test, prod)
AI_PROCESS.md       Documento de proceso con IA: herramientas, prompts verbatim, decisiones y reflexión
CLAUDE.md           Convenciones del proyecto para los agentes de IA
```

## Requisitos

- Java 21 y Maven 3.9+
- Docker (para PostgreSQL local y para los tests de integración con Testcontainers)
- Node 20+ (solo para el frontend)

## Cómo correr el proyecto en local

Todos los scripts son relativos a la raíz del repositorio, aunque se invoquen desde otro directorio.

### Desarrollo (perfil dev)

```bash
scripts/run-dev.sh
```

Levanta PostgreSQL en `localhost:5432` con base `evm`, usuario `evm` y contraseña `evm` (con
`docker compose up -d postgres`), espera a que el contenedor esté saludable, con un plazo máximo, y
arranca el backend con
`./backend/mvnw spring-boot:run -Pdev`. El esquema lo crea Flyway al arrancar, y el perfil `dev` carga
además los datos de demostración: un proyecto con tres actividades.
Con el backend arriba: Swagger UI en `http://localhost:8080/swagger-ui` y OpenAPI en
`http://localhost:8080/api-docs`.

### Verificación completa (perfil test)

```bash
scripts/run-tests.sh
```

Ejecuta `./backend/mvnw verify -Ptest`: Checkstyle en fase `validate`, tests unitarios, el test de
arquitectura hexagonal con ArchUnit, los tests de integración de contrato de cada endpoint
contra un PostgreSQL real de Testcontainers, y el umbral de cobertura de JaCoCo (80 % línea y rama) sobre `domain` y `application`.
Requiere Docker. Al final imprime la ruta del informe HTML de JaCoCo.

### Empaquetado de producción (perfil prod)

```bash
scripts/build-prod.sh
```

Genera `backend/target/evm-backend.jar` con `./backend/mvnw -Pprod -DskipTests clean package`, sin
herramientas de desarrollo y sin ejecutar tests.

### Arranque local del jar de producción

```bash
scripts/run-prod-local.sh
```

Levanta PostgreSQL local con docker-compose y arranca `evm-backend.jar` con `SPRING_PROFILES_ACTIVE=prod`
y `DB_URL`/`DB_USER`/`DB_PASSWORD` apuntando a ese PostgreSQL (valores por defecto solo en este script).
Swagger queda apagado salvo que se exporte `EVM_SWAGGER_ENABLED=true` antes de ejecutarlo.

## Perfiles Maven

| Perfil | Activación | Uso | Script |
| --- | --- | --- | --- |
| `dev` | Por defecto | Devtools, Postgres de docker-compose, seed de demostración, Swagger activo, solo tests unitarios (surefire) | `scripts/run-dev.sh` |
| `test` | `-Ptest` | Testcontainers, ArchUnit, tests de integración (`*IT.java` con failsafe) y JaCoCo `check` bloqueante | `scripts/run-tests.sh` |
| `prod` | `-Pprod` | Empaquetado sin herramientas de desarrollo, configuración por variables de entorno, Swagger apagado por defecto | `scripts/build-prod.sh` |

Checkstyle corre en la fase `validate` y es bloqueante en los tres perfiles. El jar de producción se
genera en `backend/target/evm-backend.jar`.

## Esquema de la base de datos

La única fuente del esquema es Flyway: `backend/src/main/resources/db/migration`. El contenedor de
`docker-compose` arranca vacío y la aplicación crea las tablas al iniciarse. Los datos de demostración son
una migración repetible que solo carga el perfil `dev`.

`db/init.sql` es el script de inicialización que pide el enunciado: crea el mismo esquema y los mismos datos
para quien prefiera preparar la base a mano, por ejemplo con `psql -U evm -d evm -f db/init.sql`. No lo monta
`docker-compose` a propósito, para que no existan dos caminos que puedan divergir en silencio.

## Flujo de trabajo

Gitflow estricto: `main` para producción, `develop` como integración, `feature/*` por funcionalidad integradas
a `develop` mediante Pull Request, y una rama `release/*` antes del merge final a `main`.
