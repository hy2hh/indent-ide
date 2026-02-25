#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

STATE_DIR="${STATE_DIR:-.intent-ide}"
LOG_DIR="${LOG_DIR:-$STATE_DIR/loop-logs}"
SUMMARY_FILE="${SUMMARY_FILE:-$STATE_DIR/watchdog-latest.json}"
GATE_SCOPE="${GATE_SCOPE:-desktop}"

mkdir -p "$STATE_DIR" "$LOG_DIR"

TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
RUN_ID="$(date -u +"%Y%m%d-%H%M%S")-$$-$RANDOM"
LOG_FILE="$LOG_DIR/watchdog-gate-$RUN_ID.log"

run_step() {
  local step_name="$1"
  shift
  echo ">>> [$step_name] $*" | tee -a "$LOG_FILE"
  if "$@" >>"$LOG_FILE" 2>&1; then
    echo "<<< [$step_name] PASS" | tee -a "$LOG_FILE"
    return 0
  fi

  echo "<<< [$step_name] FAIL" | tee -a "$LOG_FILE"
  return 1
}

status="passed"
failed_step=""

if [[ "$GATE_SCOPE" == "workspace" ]]; then
  if ! run_step "lint" pnpm lint; then
    status="failed"
    failed_step="lint"
  elif ! run_step "build" pnpm build; then
    status="failed"
    failed_step="build"
  elif ! run_step "test" pnpm test; then
    status="failed"
    failed_step="test"
  fi
else
  if ! run_step "desktop:lint" pnpm -C apps/desktop lint; then
    status="failed"
    failed_step="desktop:lint"
  elif ! run_step "desktop:typecheck" pnpm -C apps/desktop exec tsc -p tsconfig.json --noEmit; then
    status="failed"
    failed_step="desktop:typecheck"
  elif ! run_step "desktop:build" pnpm -C apps/desktop build; then
    status="failed"
    failed_step="desktop:build"
  elif ! run_step "desktop:test" pnpm -C apps/desktop test; then
    status="failed"
    failed_step="desktop:test"
  fi
fi

node -e '
const fs = require("node:fs");
const path = process.argv[1];
const payload = {
  timestamp: process.argv[2],
  status: process.argv[3],
  scope: process.argv[4],
  failedStep: process.argv[5] || null,
  logFile: process.argv[6],
};
fs.writeFileSync(path, JSON.stringify(payload, null, 2) + "\n");
' "$SUMMARY_FILE" "$TIMESTAMP" "$status" "$GATE_SCOPE" "$failed_step" "$LOG_FILE"

echo "Summary written: $SUMMARY_FILE"
echo "Log written: $LOG_FILE"

if [[ "$status" != "passed" ]]; then
  exit 1
fi
