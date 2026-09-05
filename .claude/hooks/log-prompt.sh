#!/usr/bin/env bash
# Hook UserPromptSubmit de Claude Code.
# Añade cada prompt de Juan, verbatim y con fecha, al final de AI_PROCESS.md.
# Trycore exige el registro cronológico y textual de todos los prompts; hacerlo por hook evita
# depender de la memoria del modelo o de copiar a mano después del hecho.
# La sección de prompts es la ÚLTIMA del documento a propósito: el append nunca rompe la narrativa.
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
LOG_FILE="$PROJECT_DIR/AI_PROCESS.md"
# La herramienta se nombra sin el modelo: a lo largo del proyecto se usaron varios (Fable 5.1 y
# después Opus 5) y una etiqueta fija en el hook acabaría mintiendo. Qué modelo estuvo activo en
# cada tramo se explica en la sección 1 de AI_PROCESS.md.
TOOL_NAME="Claude Code"

PROMPT="$(jq -r '.prompt // empty')"
if [ -z "$PROMPT" ]; then
  exit 0
fi

# Los prompts que empiezan por "/" son comandos de la herramienta, no instrucciones de diseño.
case "$PROMPT" in
  /*) exit 0 ;;
esac

# Las notificaciones de tareas en segundo plano llegan por el mismo gancho que un prompt, pero no
# las escribe Juan: son avisos de la propia herramienta cuando termina un comando lanzado en
# background. Registrarlas rompe el contrato de esta sección, que es el registro de SUS prompts.
case "$PROMPT" in
  '<task-notification>'*) exit 0 ;;
  '[SYSTEM NOTIFICATION'*) exit 0 ;;
esac

TIMESTAMP="$(date '+%Y-%m-%d %H:%M %Z')"
{
  printf '\n### %s - %s\n\n' "$TIMESTAMP" "$TOOL_NAME"
  printf '```text\n%s\n```\n' "$PROMPT"
} >> "$LOG_FILE"
