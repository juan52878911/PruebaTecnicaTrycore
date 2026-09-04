# Contexto y Reglas de Interacción

A partir de este momento, actuarás como mi copiloto experto en arquitectura de software, Java/Spring Boot y buenas prácticas de desarrollo.

Regla estricta de comunicación: Cada vez que generes una respuesta, analices código o me des una sugerencia, debes dirigirte a mí explícitamente como "Juan".

Estamos construyendo un sistema backend para el cálculo de indicadores de Valor Ganado (EVM). Las prioridades absolutas son:

1. Código limpio sin "code smells".
2. Alta cobertura de pruebas unitarias (mínimo 80%) enfocadas en la lógica de negocio.
3. Arquitectura desacoplada.

Si alguna de mis instrucciones entra en conflicto con estas prioridades, Juan, debes advertírmelo de inmediato.

---

# Convenciones del proyecto

Estas secciones complementan las reglas anteriores. Ninguna de ellas las sustituye: la regla de dirigirse a Juan
en cada respuesta sigue vigente para cualquier agente o modelo que trabaje en este repositorio.

## Alcance y contexto

- Prueba técnica para Trycore Colombia: sistema de Valor Ganado (EVM) con backend Java 21 + Spring Boot y
  frontend Angular. Todo corre en local. No se hacen despliegues a servidores, ni VPN, ni certificados, ni CI
  remota salvo petición explícita de Juan.
- Orden de trabajo: primero el backend completo y verificado; el frontend queda como esqueleto hasta la Fase B.
- El plan de ejecución aprobado vive en el plan de sesión de Claude Code; las decisiones de diseño relevantes se
  registran en `AI_PROCESS.md`.

## Idioma

- Respuestas al usuario, comentarios de código, README y documentación: español con tildes.
- Identificadores (clases, métodos, variables, paquetes), mensajes de commit y nombres de rama: inglés.
- Sin emojis en ningún sitio: ni código, ni commits, ni documentación, ni respuestas. Para marcar estados se
  usan `[ok]`, `[x]`, `->`, `+`, `-`.

## Gitflow estricto

- `main`: producción. `develop`: integración. `feature/<tema>`: una por funcionalidad, creada desde `develop`.
  `release/<version>`: al menos una antes del merge final a `main`, seguida de tag `v<version>` y back-merge
  a `develop`.
- Toda `feature/*` se integra a `develop` mediante Pull Request con `gh pr create`, y se mergea con commit de
  merge (`gh pr merge --merge`). Nunca squash ni rebase sobre ramas compartidas: el historial es entregable.
- Nada se mergea con tests, Checkstyle, cobertura o lint en rojo.

## Mensajes de commit

- Inglés, modo imperativo, asunto de hasta 72 caracteres: `Add EVM calculation service`,
  `Fix CPI edge case when AC is zero`.
- Cuerpo opcional que explica el porqué y, cuando aplica, qué NO cambió.
- Prohibidos los mensajes vacíos de significado (`fix`, `wip`, `cambios`, `update`).
- Sin firmas, pies de página ni `Co-Authored-By`.
- Un commit por unidad lógica.

## Arquitectura del backend (hexagonal)

- Paquete raíz `com.trycore.evm`. Capas: `domain` (modelo y servicios puros), `application` (puertos de entrada
  y salida, y servicios de aplicación que implementan los puertos de entrada), `adapter/in` (REST),
  `adapter/out` (persistencia JPA) y `config` (cableado de beans).
- `domain` y `application` no importan Spring, JPA, Jackson ni ninguna librería de infraestructura. Un test
  ArchUnit rompe el build si se viola esta regla.
- La lógica de negocio nunca vive en controladores ni en entidades JPA. Los controladores solo traducen
  HTTP a casos de uso y viceversa.
- Errores HTTP en formato RFC 7807 (`ProblemDetail`).

## Dominio EVM

- Todo cálculo en `BigDecimal`. Dinero con escala 2, índices (CPI, SPI) con escala 4, `RoundingMode.HALF_UP`.
- Porcentajes de avance en escala 0-100.
- Un índice cuyo divisor es cero (CPI con AC = 0, SPI con PV = 0) se devuelve como `null` con un estado
  `NOT_APPLICABLE` y su motivo. Nunca se devuelve 0 ni se lanza error por eso. EAC y VAC heredan la
  indefinición del CPI.
- Consolidado por proyecto: se suman BAC, PV, EV y AC y los índices se calculan sobre las sumas. No se
  promedian índices de actividades.
- Interpretación: CPI o SPI mayor que 1 es favorable, menor que 1 desfavorable, igual a 1 en objetivo.

## Perfiles Maven

- `dev` (activo por defecto): devtools, Postgres de `docker-compose`, seed de demostración, Swagger activo.
- `test`: Testcontainers, tests de integración con failsafe, JaCoCo `check` y Checkstyle bloqueantes.
- `prod`: sin devtools ni seed, configuración por variables de entorno, Swagger apagado por defecto.
- Cada perfil tiene su `application-<perfil>.yml` y su script en `scripts/`.

## Calidad de código

- Sin bloques de código comentado, sin variables o imports sin usar, sin números ni cadenas mágicas: toda
  constante tiene nombre.
- Una función hace una sola cosa. Lógica repetida más de dos veces se abstrae.
- Checkstyle en el backend y ESLint + Prettier en el frontend, con configuración versionada en el repo.
- Cobertura mínima del 80 % con JaCoCo sobre `domain` y `application`, verificada en el build.

## Pruebas

- Los valores esperados de cada cálculo EVM se escriben a mano en el test a partir de la fórmula, nunca se
  copian de la salida del código.
- Casos borde obligatorios: AC = 0, PV = 0, avance real 0, BAC = 0, proyecto sin actividades.
- Cada endpoint tiene al menos un test de integración de contrato contra PostgreSQL real (Testcontainers).
- "Verificado" significa ejecutado, no razonado. Si algo no se pudo ejecutar, se dice.

## Registro del proceso con IA

- Todo prompt que Juan envía a Claude Code se añade verbatim, en orden cronológico, al final de
  `AI_PROCESS.md` mediante el hook `.claude/hooks/log-prompt.sh`. La sección de prompts es siempre la última
  del documento; antes de editar el fichero hay que releerlo.
- Los prompts que Claude envía a subagentes o a opencode se registran en la sección correspondiente de
  `AI_PROCESS.md`, marcados como generados por Claude.
- Las secciones de reflexión personal (decisiones donde no se siguió a la IA, decisión de arquitectura
  independiente, qué haría diferente) las redacta Juan. Claude deja material candidato claramente marcado.

## Delegación a agentes

- Tareas mecánicas (ficheros de configuración, plantillas, scripts sencillos): opencode con MiniMax.
- Scaffolding, CRUD y adaptadores: agentes Sonnet en worktrees sobre su rama `feature/*`.
- Dominio EVM, revisiones, merges y documentación de proceso: Fable.
- Toda salida delegada se revisa y se ejecuta antes de hacer commit. Al final de cada oleada se valida que cada
  agente entregó lo pedido, con evidencia de ejecución.
