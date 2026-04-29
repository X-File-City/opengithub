# shellcheck shell=bash
# inline.sh — Helpers for inlining file contents into a `codex exec` prompt.
#
# Codex CLI does not support `@filename` auto-attachment (that's a Claude Code
# feature). To pass the same context to codex, we splice file contents directly
# into the prompt string with a header per file.

# Print files with `=== <path> ===` headers, separated by blank lines.
# Missing files are skipped silently (so optional context can be passed).
inline_files() {
  local f
  for f in "$@"; do
    [ -z "$f" ] && continue
    if [ -f "$f" ]; then
      printf '\n=== %s ===\n' "$f"
      cat "$f"
      printf '\n'
    fi
  done
}
