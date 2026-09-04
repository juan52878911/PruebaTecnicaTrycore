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
db/init.sql         Script de inicialización de la base local (esquema + datos de demostración)
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

Pendiente de completar cuando exista el backend. Por ahora:

```bash
docker compose up -d postgres
```

Levanta PostgreSQL en `localhost:5432` con base `evm`, usuario `evm` y contraseña `evm`, y ejecuta
`db/init.sql` la primera vez (esquema y un proyecto de demostración con tres actividades).

## Perfiles Maven

| Perfil | Uso | Comando |
| --- | --- | --- |
| `dev` | Desarrollo local con datos de demostración y Swagger | `scripts/run-dev.sh` |
| `test` | Tests unitarios + integración (Testcontainers), cobertura y Checkstyle bloqueantes | `scripts/run-tests.sh` |
| `prod` | Empaquetado sin herramientas de desarrollo, configuración por variables de entorno | `scripts/build-prod.sh` |

## Flujo de trabajo

Gitflow estricto: `main` para producción, `develop` como integración, `feature/*` por funcionalidad integradas
a `develop` mediante Pull Request, y una rama `release/*` antes del merge final a `main`.
