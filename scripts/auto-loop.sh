#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

WORK_CMD="${WORK_CMD:-}"
WATCHDOG_CMD="${WATCHDOG_CMD:-}"
GATE_SCRIPT="${GATE_SCRIPT:-./scripts/watchdog-gate.sh}"
STATE_DIR="${STATE_DIR:-.intent-ide}"
STATE_FILE="${STATE_FILE:-$STATE_DIR/loop-state.json}"
JOURNAL_FILE="${JOURNAL_FILE:-$STATE_DIR/loop-journal.log}"
MAX_ITERS="${MAX_ITERS:-8}"
MAX_STALE_ITERS="${MAX_STALE_ITERS:-2}"
SLEEP_SECONDS="${SLEEP_SECONDS:-1}"

if [[ -z "$WORK_CMD" ]]; then
  echo "WORK_CMD is required."
  echo "Example:"
  echo "  WORK_CMD='pnpm -C apps/desktop lint' pnpm loop:auto"
  exit 1
fi

if [[ ! -x "$GATE_SCRIPT" ]]; then
  echo "Gate script is missing or not executable: $GATE_SCRIPT"
  exit 1
fi

mkdir -p "$STATE_DIR"
touch "$JOURNAL_FILE"

write_state() {
  local status="$1"
  local iteration="$2"
  local stale_iters="$3"
  local message="$4"

  node -e '
const fs = require("node:fs");
const path = process.argv[1];
const payload = {
  updatedAt: new Date().toISOString(),
  status: process.argv[2],
  iteration: Number(process.argv[3]),
  staleIterations: Number(process.argv[4]),
  maxIterations: Number(process.argv[5]),
  maxStaleIterations: Number(process.argv[6]),
  message: process.argv[7],
};
fs.writeFileSync(path, JSON.stringify(payload, null, 2) + "\n");
' "$STATE_FILE" "$status" "$iteration" "$stale_iters" "$MAX_ITERS" "$MAX_STALE_ITERS" "$message"
}

append_journal() {
  local line="$1"
  printf '%s %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$line" >>"$JOURNAL_FILE"
}

previous_snapshot="$(git status --porcelain)"
stale_iters=0

write_state "running" 0 0 "loop initialized"
append_journal "loop initialized; max_iters=$MAX_ITERS max_stale_iters=$MAX_STALE_ITERS"

for ((i=1; i<=MAX_ITERS; i++)); do
  write_state "running" "$i" "$stale_iters" "iteration $i started"
  append_journal "iteration=$i work:start cmd=\"$WORK_CMD\""

  if ! bash -lc "$WORK_CMD"; then
    write_state "failed" "$i" "$stale_iters" "work command failed"
    append_journal "iteration=$i work:failed"
    exit 1
  fi
  append_journal "iteration=$i work:passed"

  append_journal "iteration=$i gate:start script=$GATE_SCRIPT"
  if ! bash "$GATE_SCRIPT"; then
    write_state "failed" "$i" "$stale_iters" "watchdog gate failed"
    append_journal "iteration=$i gate:failed"
    exit 1
  fi
  append_journal "iteration=$i gate:passed"

  if [[ -n "$WATCHDOG_CMD" ]]; then
    append_journal "iteration=$i reviewer:start cmd=\"$WATCHDOG_CMD\""
    if ! bash -lc "$WATCHDOG_CMD"; then
      write_state "failed" "$i" "$stale_iters" "watchdog reviewer command failed"
      append_journal "iteration=$i reviewer:failed"
      exit 1
    fi
    append_journal "iteration=$i reviewer:passed"
  fi

  current_snapshot="$(git status --porcelain)"
  if [[ "$current_snapshot" == "$previous_snapshot" ]]; then
    stale_iters=$((stale_iters + 1))
    append_journal "iteration=$i change=none stale_iters=$stale_iters"
  else
    stale_iters=0
    previous_snapshot="$current_snapshot"
    append_journal "iteration=$i change=detected stale_iters=0"
  fi

  if (( stale_iters >= MAX_STALE_ITERS )); then
    write_state "stopped" "$i" "$stale_iters" "stopped due to stale iteration limit"
    append_journal "loop stopped; reason=stale_limit"
    exit 0
  fi

  if (( i < MAX_ITERS )); then
    sleep "$SLEEP_SECONDS"
  fi
done

write_state "completed" "$MAX_ITERS" "$stale_iters" "reached max iterations"
append_journal "loop completed; reason=max_iters"

