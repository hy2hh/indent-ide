# Auto Loop Checklist

Last updated: 2026-02-25

## Goal

Run iterative autonomous improvements with explicit reviewer gates and persistent file-based state.

## Required Loop Inputs

- [ ] A concrete goal statement (single sentence)
- [ ] Acceptance criteria list (measurable)
- [ ] `WORK_CMD` that performs one improvement step
- [ ] Optional `WATCHDOG_CMD` for reviewer-style checks

## Gate Policy

- [ ] `pnpm -C apps/desktop lint`
- [ ] `pnpm -C apps/desktop exec tsc -p tsconfig.json --noEmit`
- [ ] `pnpm -C apps/desktop build`
- [ ] `pnpm -C apps/desktop test`

## Runtime Files

- Loop state: `.intent-ide/loop-state.json`
- Gate summary: `.intent-ide/watchdog-latest.json`
- Loop journal: `.intent-ide/loop-journal.log`
- Gate logs: `.intent-ide/loop-logs/`

## Standard Commands

```bash
# 1) Deterministic gate only
pnpm watchdog:gate

# 2) Full autonomous loop (required WORK_CMD)
WORK_CMD='pnpm -C apps/desktop lint' pnpm loop:auto

# 3) Full loop with reviewer command
WORK_CMD='pnpm -C apps/desktop lint' \
WATCHDOG_CMD='pnpm -C apps/desktop test' \
pnpm loop:auto
```

## Stop Conditions

- [ ] Gate failure
- [ ] Reviewer command failure (if set)
- [ ] `MAX_STALE_ITERS` consecutive iterations without repository changes
- [ ] `MAX_ITERS` reached

## Notes

- `GATE_SCOPE=workspace pnpm watchdog:gate` switches gate scope to full workspace.
- Tune loop parameters with env vars:
  - `MAX_ITERS` (default `8`)
  - `MAX_STALE_ITERS` (default `2`)
  - `SLEEP_SECONDS` (default `1`)
