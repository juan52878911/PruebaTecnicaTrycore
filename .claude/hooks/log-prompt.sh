#!/usr/bin/env bash
# Hook UserPromptSubmit de Claude Code.
# Añade cada prompt de Juan, verbatim y con fecha, al final de AI_PROCESS.md.
# Trycore exige el registro cronológico y textual de todos los prompts; hacerlo por hook evita
# depender de la memoria del modelo o de copiar a mano después del hecho.
# La sección de prompts es la ÚLTIMA del documento a propósito: el append nunca rompe la narrativa.
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
LOG_FILE="$PROJECT_DIR/AI_PROCESS.md"
TOOL_NAME="Claude Code (Claude Fable 5.1)"

PROMPT="$(jq -r '.prompt // empty')"
if [ -z "$PROMPT" ]; then
  exit 0
fi

# Los prompts que empiezan por "/" son comandos de la herramienta, no instrucciones de diseño.
case "$PROMPT" in
  /*) exit 0 ;;
esac

TIMESTAMP="$(date '+%Y-%m-%d %H:%M %Z')"
{
  printf '\n### %s - %s\n\n' "$TIMESTAMP" "$TOOL_NAME"
  printf '```text\n%s\n```\n' "$PROMPT"
} >> "$LOG_FILE"
