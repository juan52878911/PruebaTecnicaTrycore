# Proceso de desarrollo con IA

Documento de proceso exigido por Trycore. Registra las herramientas de IA usadas, todos los prompts enviados en
orden cronológico y sin parafrasear, cómo se aprendió y validó el Valor Ganado, las decisiones donde no se siguió
a la IA, una decisión de arquitectura independiente y una reflexión final.

Convención de este documento:

- Las secciones 1 a 6 son narrativa y se completan a medida que avanza el proyecto.
- La sección 7 contiene los prompts que Claude Code generó para delegar trabajo a subagentes y a opencode. Son
  prompts de la IA, no de Juan, y se marcan como tales.
- La sección 8 es el registro cronológico verbatim de los prompts de Juan. Se alimenta automáticamente con el
  hook `.claude/hooks/log-prompt.sh` en cada envío. Es la última sección a propósito, para que el append no
  rompa la narrativa. Los prompts anteriores a la instalación del hook (la sesión de planificación) se copiaron
  a mano, textualmente, desde la conversación.
- Sin emojis.

## 1. Herramientas de IA usadas y por qué

| Herramienta | Modelo | Para qué | Por qué |
| --- | --- | --- | --- |
| Claude Code (app de escritorio) | Claude Fable 5.1 | Planificación, convenciones, dominio EVM, revisiones, merges, este documento | Es el modelo más capaz disponible y el trabajo crítico (cálculo, arquitectura, decisiones) no se delega |
| Claude Code, subagentes | Claude Sonnet | Scaffolding del backend, CRUD y adaptadores, esqueleto del frontend, verificación independiente | Tareas amplias pero bien especificadas; un modelo intermedio las resuelve a menor coste y se pueden paralelizar en worktrees |
| Claude Code, agentes auditores | Claude Haiku / Sonnet | Auditoría adversarial (tests que no pueden fallar, pérdidas silenciosas de datos) | Revisión barata e independiente de quien implementó |
| opencode | MiniMax M2.7 | Ficheros mecánicos: `.gitignore`, `.editorconfig`, `docker-compose.yml`, `db/init.sql`, plantilla de PR | Trabajo de plantilla donde un modelo económico basta; toda su salida se revisa y se ejecuta antes de commit |

(Sección en construcción: se completa al cierre de cada oleada.)

## 2. Cómo aprendí EVM

(Pendiente. Aquí van las preguntas que Juan hizo a la IA sobre Valor Ganado, la validación de las fórmulas a
mano con un ejemplo numérico antes de implementarlas, y qué partes de la explicación de la IA se contrastaron
con otra fuente.)

## 3. Dos decisiones donde no seguí a la IA

(Pendiente. La redacta Juan. Claude dejará aquí material candidato marcado como "candidato" con lo que propuso y
lo que finalmente se hizo, para que Juan elija y explique con sus palabras.)

## 4. Cómo verifiqué que los cálculos son correctos

(Pendiente. Aquí van los números: el caso canónico calculado a mano, los casos borde y la comparación entre lo
que devuelve el API con el seed de demostración y el cálculo manual.)

Caso canónico acordado en la planificación, calculado a mano antes de escribir código:

| Dato | Valor |
| --- | --- |
| BAC | 100.000 |
| Avance planificado | 50 % |
| Avance real | 40 % |
| AC | 60.000 |

| Indicador | Cálculo | Resultado |
| --- | --- | --- |
| PV | 0,50 x 100.000 | 50.000 |
| EV | 0,40 x 100.000 | 40.000 |
| CV | 40.000 - 60.000 | -20.000 |
| SV | 40.000 - 50.000 | -10.000 |
| CPI | 40.000 / 60.000 | 0,6667 |
| SPI | 40.000 / 50.000 | 0,8000 |
| EAC | 100.000 / 0,6667 | 150.000 |
| VAC | 100.000 - 150.000 | -50.000 |

Lectura: CPI < 1, sobre presupuesto; SPI < 1, atrasado.

## 5. Una decisión de arquitectura que tomé de forma independiente

(Pendiente. La redacta Juan.)

## 6. Qué haría diferente

(Pendiente. La redacta Juan al final.)

## 7. Prompts generados por Claude para delegar trabajo

Estos prompts los escribió Claude Code (Fable 5.1), no Juan. Se registran por transparencia: muestran qué se
delegó, a qué modelo y con qué instrucciones.

### 2026-09-03 22:55 -05 - opencode, MiniMax M2.7 - ficheros mecánicos de la raíz

```text
Estas en un directorio vacio. Crea EXACTAMENTE estos cinco ficheros (rutas relativas al directorio actual) para un monorepo de una prueba tecnica: backend Java 21 + Spring Boot (Maven) en `backend/`, frontend Angular en `frontend/`, PostgreSQL 16 en docker-compose. Todo corre en local. No crees ningun otro fichero, no inicialices git, no instales nada.

1. `.gitignore`: reglas para Maven (`target/`), Java (`*.class`, `*.jar` salvo `.mvn/wrapper/maven-wrapper.jar`), Node/Angular (`node_modules/`, `dist/`, `.angular/`), IDEs (`.idea/`, `*.iml`, `.vscode/` excepto `.vscode/settings.json` NO, ignoralo entero), macOS (`.DS_Store`), logs (`*.log`), variables de entorno (`.env`, `.env.*`, pero NO `.env.example`), y `.claude/worktrees/`.

2. `.editorconfig`: `root = true`; por defecto `indent_style = space`, `indent_size = 2`, `end_of_line = lf`, `charset = utf-8`, `trim_trailing_whitespace = true`, `insert_final_newline = true`; para `*.java` `indent_size = 4`; para `*.md` `trim_trailing_whitespace = false`; para `Makefile` `indent_style = tab`.

3. `docker-compose.yml`: servicio `postgres` con imagen `postgres:16-alpine`, contenedor `evm-postgres`, puerto `5432:5432`, variables `POSTGRES_DB=evm`, `POSTGRES_USER=evm`, `POSTGRES_PASSWORD=evm`, volumen con nombre `evm-postgres-data` montado en `/var/lib/postgresql/data`, montaje de `./db/init.sql` en `/docker-entrypoint-initdb.d/01-init.sql` en solo lectura, y `healthcheck` con `pg_isready -U evm -d evm` cada 5 s, 10 reintentos. No anadas servicios de backend ni frontend todavia. Sin campo `version` (esta obsoleto).

4. `db/init.sql`: script de inicializacion PostgreSQL idempotente. Crea la tabla `projects` (`id BIGSERIAL PRIMARY KEY`, `name VARCHAR(120) NOT NULL`, `description VARCHAR(500)`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`) y la tabla `activities` (`id BIGSERIAL PRIMARY KEY`, `project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE`, `name VARCHAR(120) NOT NULL`, `budget_at_completion NUMERIC(19,2) NOT NULL CHECK (budget_at_completion >= 0)`, `planned_progress_percent NUMERIC(5,2) NOT NULL CHECK (planned_progress_percent BETWEEN 0 AND 100)`, `actual_progress_percent NUMERIC(5,2) NOT NULL CHECK (actual_progress_percent BETWEEN 0 AND 100)`, `actual_cost NUMERIC(19,2) NOT NULL CHECK (actual_cost >= 0)`, `created_at`, `updated_at` igual que projects), con indice `idx_activities_project_id` sobre `project_id`. Usa `CREATE TABLE IF NOT EXISTS` y `CREATE INDEX IF NOT EXISTS`. Al final, un bloque de datos de demostracion protegido con `INSERT ... SELECT ... WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Plataforma de pagos')`: un proyecto llamado `Plataforma de pagos` con descripcion `Proyecto de demostracion para el analisis de Valor Ganado`, y tres actividades para ese proyecto: `Diseno de arquitectura` (BAC 100000.00, planificado 50.00, real 40.00, AC 60000.00), `Desarrollo del API` (BAC 250000.00, planificado 40.00, real 45.00, AC 100000.00), `Pruebas de integracion` (BAC 80000.00, planificado 25.00, real 0.00, AC 0.00). Comentarios SQL en espanol con tildes explicando que la tabla de esquema real la gestiona Flyway desde el backend y que este script solo sirve para inicializar la base local de docker-compose.

5. `.github/pull_request_template.md`: plantilla corta en espanol con secciones `## Que cambia`, `## Por que`, `## Como se verifico` (con una lista de casillas: `mvn verify -Ptest` en verde, Checkstyle limpio, cobertura >= 80% en dominio y aplicacion), y `## Que NO cambia`. Sin emojis.

Reglas: sin emojis en ningun fichero. Comentarios en espanol con tildes. No inventes campos ni servicios que no se han pedido. Cuando termines, lista los ficheros creados.
```

Resultado: entregó los cinco ficheros. Se corrigieron a mano dos cosas antes de commit: `.gitignore` no
excluía `.env.example` de la regla `.env.*` y tenía la errata "Claudia"; `init.sql` y la plantilla de PR
venían sin tildes pese a pedirlas. Se validó ejecutando `docker compose up`, consultando el seed, comprobando
que la restricción de porcentaje rechaza 150 y re-ejecutando el script para confirmar que es idempotente.

## 8. Registro cronológico de prompts de Juan

Cada entrada es el texto exacto enviado a Claude Code, con fecha y hora local (Bogotá, UTC-5).

### 2026-09-03 21:50 -05 - Claude Code (Claude Fable 5.1) - copiado a mano, anterior al hook

```text
Quiero crear el siguiente proyecto para una prueba tecnica en TryCore:

## Desafío técnico

## Ingeniero de Desarrollo — Trycore Colombia

Hola,

Gracias por tu interés en hacer parte de Trycore. Este documento describe la prueba técnica que queremos que desarrolles como parte del proceso de selección.

Antes de entrar en detalle, queremos ser directos sobre lo que buscamos: no nos interesa si memorizas patrones de diseño ni si resuelves acertijos algorítmicos en tiempo récord. Nos interesa cómo piensas cuando te enfrentas a un problema que no conoces, cómo tomas decisiones cuando hay varias opciones válidas, y cómo construyes software que otra persona pueda entender y mantener.

Tienes cinco días calendario para entregar. Si tienes alguna duda, escríbenos — responder preguntas bien formuladas también nos dice mucho de cómo trabajas.

## El problema

Queremos construir una herramienta interna para que los líderes de proyecto puedan registrar el avance de sus actividades y entender, en tiempo real, si su proyecto va bien o mal en términos de cronograma y presupuesto.

La metodología que usaremos para ese análisis es el Valor Ganado (Earned Value Management), un estándar del PMI que probablemente no conoces. Eso está bien — de hecho, es parte intencional del ejercicio. Tendrás que aprenderlo durante el desarrollo.

La idea central del Valor Ganado es sencilla: no basta con saber cuánto has gastado ni cuánto has avanzado por separado. Lo que importa es la relación entre los dos. Un proyecto puede haber gastado el 60% del presupuesto habiendo completado solo el 40% del trabajo — y eso es una señal de alerta. Los indicadores EVM te permiten cuantificar exactamente eso.

## Qué debes construir

Una aplicación fullstack que permita gestionar proyectos y sus actividades, y que calcule automáticamente los indicadores de Valor Ganado.


## Backend

Necesitamos una API REST que exponga operaciones para crear, editar y eliminar proyectos y actividades. Cada actividad debe registrar los siguientes datos:

- \- Nombre

- \- Presupuesto total planificado (BAC — Budget at Completion)

- \- Porcentaje de avance planificado a la fecha de corte

- \- Porcentaje de avance real completado

- \- Costo real incurrido hasta la fecha (AC — Actual Cost)

Con esos datos, el sistema debe calcular automáticamente los siguientes indicadores por actividad y de forma consolidada por proyecto:

| Indicador | Fórmula |
| --- | --- |
| PV — Planned Value | % planificado × BAC |
| EV — Earned Value | % completado × BAC |
| CV — Cost Variance | EV − AC |
| SV — Schedule Variance | EV − PV |
| CPI — Cost Performance Index | EV / AC |
| SPI — Schedule Performance Index | EV / PV |
| EAC — Estimate at Completion | BAC / CPI |
| VAC — Variance at Completion | BAC − EAC |

El API también debe retornar la interpretación de CPI y SPI: si el proyecto está bajo presupuesto o sobre presupuesto, adelantado o atrasado. Un CPI mayor a 1 indica eficiencia en costos; menor a 1 indica que se está gastando más de lo que se avanza. El SPI funciona con la misma lógica pero sobre el cronograma.


## Frontend

Un dashboard donde el líder de proyecto pueda ingresar y editar sus actividades, y ver el resultado del análisis en tiempo real. Debe incluir la tabla de actividades con sus indicadores calculados, los indicadores consolidados del proyecto, una indicación visual del estado de CPI y SPI, y una gráfica que compare PV, EV y AC por actividad.

No pedimos un diseño elaborado. Pedimos que la información sea clara y que quien la mire entienda de un vistazo si el proyecto va bien o mal.

## Estándares que debe cumplir el desarrollo

Pruebas unitarias. Toda la lógica de cálculo EVM debe estar cubierta con pruebas unitarias. Esto incluye los casos borde: qué pasa cuando AC es cero, cuando no hay actividades, cuando el avance real es cero. Esperamos una cobertura mínima del 80% sobre la capa de negocio. Cada endpoint debe tener al menos un test de integración que valide el contrato de respuesta.

Cero code smells. El código debe estar limpio. Sin bloques comentados, sin variables sin usar, sin números o strings mágicos dispersos por el código. Los nombres de variables, métodos y clases deben ser descriptivos. La lógica de negocio no debe vivir en los controladores. Si una función hace más de una cosa, probablemente deba dividirse. Si un bloque de lógica se repite más de dos veces, debe abstraerse. Recomendamos configurar un linter en el proyecto — si lo haces, incluye la configuración en el repositorio.

Gitflow estricto. El historial de tu repositorio es parte de la entrega. La estructura de ramas debe seguir el flujo estándar: main para producción, develop como rama de integración, ramas feature/* por cada funcionalidad, y al menos una rama release/* antes del merge final a main. Cada feature debe integrarse a develop mediante un Pull Request, aunque trabajes solo. Los mensajes de commit deben ser descriptivos y en imperativo: Add EVM calculation service, Fix CPI edge case when AC is zero. Mensajes como fix, cambios o wip no son aceptables.

OpenAPI/Swagger. Valoramos positivamente que el API esté documentado con la especificación OpenAPI. Si lo implementas, debe ser accesible localmente en /api-docs o /swagger-ui, y cada endpoint debe incluir descripción, esquemas de request y response, y los posibles códigos de error. Hacerlo bien demuestra que entiendes el contrato del API como un artefacto de comunicación, no solo como documentación.


## Stack tecnológico

Usa el stack con el que tengas mayor dominio. Nuestra preferencia es Java con Spring Boot o Python con FastAPI en el backend, base de datos relacional (PostgreSQL idealmente), y Angular o React en el frontend. Si eliges algo diferente, explica por qué en tu documento de proceso.

## Los tres entregables

## 1. El repositorio

En GitHub o GitLab — no aceptamos archivos comprimidos porque necesitamos ver el historial de commits. Debe incluir un README.md con instrucciones para correr el proyecto localmente y el script de inicialización de la base de datos.

## 2. El documento AI_PROCESS.md

Este documento es tan importante para nosotros como el código. Debe estar en el repositorio e incluir lo siguiente:

- Las herramientas de IA que usaste y por qué elegiste esas.

- Todos los prompts que enviaste, copiados textualmente y en orden cronológico — no los resumas ni los parafrasees.

- Cómo aprendiste EVM: qué le preguntaste a la IA, cómo validaste que entendiste las fórmulas antes de implementarlas.

- Dos decisiones donde no seguiste lo que la IA te sugirió, explicando qué propuso y por qué tomaste un camino diferente. Cómo verificaste que los cálculos son correctos — no solo que el código funciona, sino que los números tienen sentido.

- Una decisión de arquitectura que tomaste de forma independiente.

- Una reflexión honesta sobre qué harías diferente si repitieras el ejercicio.

No esperamos un documento perfecto. Esperamos uno honesto.

## 3. El video

- Máximo diez minutos, grabando tu pantalla. Sin edición elaborada. Queremos escucharte y verte explicar, en tus propias palabras, qué es el Valor Ganado y cómo funciona — como si se lo explicaras a un colega que nunca lo ha escuchado.

- Luego muéstranos la arquitectura de tu solución, una decisión técnica que te resultó difícil, una demo del sistema funcionando con al menos un proyecto y tres actividades, y cómo se ve tu flujo de trabajo con IA en el documento de proceso.


La fluidez al explicar algo que aprendiste durante el ejercicio nos dice más que cualquier algoritmo que hayas memorizado.

## Cómo evaluamos

El mayor peso de la evaluación está en el video y en el documento de proceso, no en el código. Un código impecable producido sin comprensión real vale menos para nosotros que un código más modesto respaldado por razonamiento claro. Lo que buscamos ver es un ingeniero que use la IA para pensar mejor, no para evitar pensar. Que sepa cuándo la IA tiene razón y cuándo no. Que escriba código que otro pueda leer y mantener. Que entienda lo que construyó lo suficientemente bien como para

explicarlo sin leer. Lo que no queremos ver es un documento de proceso genérico escrito después del hecho, un video donde el candidato lee en lugar de explicar, o pruebas unitarias que solo verifican

que las funciones retornan algo.

Queda pendiente que nos confirmes la recepción de este documento. Cualquier pregunta, escríbenos.

Éxitos,

## Equipo de Tecnología

Trycore Colombia


Necesito que escribas las convenciones del proyecto complementando el archivo @CLAUDE.md ya que tiene informacion que inclui para este desarrollo, que guardes todos los prompts que te doy en el archivo @AI_PROCESS.md con las instrucciones del texto anterior, que crees un plan de desarrollo que incluya paralelizado de agentes con el poder solo necesario para tomar la tarea o fase que crees. Tambien tengo opencode donde puedes delegarle tareas sencillas pues cuento con Minimax M3 para hacer cosas simples.

Recuerda NO modificar la convencion del @CLAUDE.md donde menciono nombrarme en cada generacion (decirme Juan)
```

### 2026-09-03 22:10 -05 - Claude Code (Claude Fable 5.1) - respuestas de Juan a cuatro preguntas de Claude, copiadas a mano

Claude preguntó (con opciones) por el framework de frontend, el idioma de los commits, la base de datos de los
tests de integración y cómo crear el remoto. Juan respondió:

```text
¿Qué framework usamos para el frontend del dashboard? = Angular
Trycore pide commits imperativos y sus ejemplos están en inglés (Add EVM calculation service). Tu costumbre es commits en español. ¿En qué idioma van los commits de este repo? = Inglés imperativo (Recommended)
¿Con qué base de datos corren los tests de integración de los endpoints? = Testcontainers PostgreSQL (Recommended)
No hay remoto configurado. ¿Cómo creamos el repo en GitHub para los PRs de gitflow? = Yo lo creo con gh (cuenta juan52878911)
```

### 2026-09-03 22:30 -05 - Claude Code (Claude Fable 5.1) - respuesta al primer plan propuesto, copiado a mano

```text
Quiero que el proyecto sea hecho con arquitectura hexagonal, que tengamos coverage de tests con JaCoCo, crea perfiles dentro de maven para que podamos separar testing, develop y prod en dependencias, scripts y configuraciones especificas. Al final de la orquestacion debes validar que todos hayan hecho su trabajo correctamente. Por ahora todo es local y es un ejercicio tecnico para entrevista, tenlo en cuenta para no hacer cosas demas como despliegues automaticos a mi servidor, configuraciones de wireguard o certificados de seguridad, solo si te lo pido debes hacerlo
```

### 2026-09-03 22:45 -05 - Claude Code (Claude Fable 5.1) - respuesta al segundo plan propuesto, copiado a mano

```text
Enfocate por ahora en el backend, despues vemos el frontend. Primero enfocamos todos nuestros esfuerzos en el backend, deja la carpeta y la estructura basica del proyecto en frontend
```
