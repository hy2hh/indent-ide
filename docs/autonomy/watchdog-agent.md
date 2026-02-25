# Watchdog Agent Role

This repository uses a two-layer loop:

1. `Worker` executes one concrete change step (`WORK_CMD`)
2. `Watchdog` verifies quality and blocks bad iterations

## Responsibilities

- Validate the latest iteration against acceptance criteria
- Require deterministic gates to pass before next iteration
- Reject iterations that:
  - reduce test/build health
  - do not change project state repeatedly
  - violate current product parity objective

## Suggested Reviewer Prompt

Use this as a prompt for any external reviewer agent command:

```text
You are a watchdog reviewer for Intent IDE parity work.
Review the latest git diff and loop logs.
Return:
1) PASS/FAIL
2) top 3 issues by severity
3) exact next action for the worker in one sentence
Fail if lint/typecheck/build/test are broken or if changes are not advancing parity goals.
```

## Integration

Set `WATCHDOG_CMD` to your reviewer command when running `pnpm loop:auto`.
