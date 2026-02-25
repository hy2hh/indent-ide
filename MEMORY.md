# Project Memory

Last updated: 2026-02-25

## What this project builds

This repository builds **Intent IDE**, a macOS desktop IDE where multiple AI agents collaborate to implement coding tasks from a natural-language goal.

## Core product idea

- Workflow: `goal input -> spec generation -> parallel implementation -> verification -> review/PR`
- Development model: **Spec-Driven Development (SDD)** with a Living Spec updated in real time
- Runtime form: Electron + React desktop app, backed by a pnpm monorepo
- Agent execution: local CLI tools (`claude`, `codex`, `gemini`) without direct API-key integration
- Isolation strategy: implementor agents run in separate git worktrees, then merge on success

## Current status snapshot

- Main 3-panel UI and core agent pipeline exist
- Spec approval, changes tab, files tab, and PTY terminal are implemented in the desktop app
- Remaining parity work is mostly around UX polish and advanced orchestration behavior

## Source of truth docs

- `PRODUCT.md`
- `GUIDE.md`
- `docs/specs/`

## Parity notes (Augment Intent reference)

- Reference baseline: Augment Intent public product page + official changelog (`0.2.x` series)
- Notable reference capabilities to track:
  - task list / plan editing before run
  - while-running follow-up tasks (queue behavior)
  - explicit edits review/apply flow
  - state checkpoints and quick restore

## Improvements added in this session

- Conversation:
  - queue additional goals while current pipeline is running
  - auto-run queued goals when the current run completes/fails
  - basic `@` mention suggestions for agent names and project files
- Changes/PR:
  - PR creation success/error feedback in UI
  - open created PR URL from the app
  - safer `gh pr create` invocation via argument-based process execution
- Autonomous loop tooling:
  - `scripts/watchdog-gate.sh` for deterministic quality gates
  - `scripts/auto-loop.sh` for iterative worker + watchdog loop with file-based state
  - checklist docs under `docs/autonomy/`
- Spec parity (tasklist):
  - draft tasklist editing before approval via `agent:updateSpecDraft`
  - LivingSpec draft task replacement API with validation/normalization
  - parity spec doc added at `docs/specs/09-intent-parity-technical-spec.md`
- Checkpoint/restore (quick):
  - save checkpoint snapshot to `.intent-ide/checkpoints`
  - restore latest checkpoint from Agent sidebar
- Checkpoint manager (basic):
  - list checkpoints in Agent sidebar
  - restore/delete a selected checkpoint
- Checkpoint manager (advanced):
  - rename checkpoint snapshots
  - preview detailed restore diff (goal/status/spec/task/event/conversation deltas) before restore
- Edit management (initial):
  - file-level stage/unstage in Changes tab
  - file-level revert (discard) in Changes tab
- Edit management (extended):
  - hunk-level stage from unified diff
  - hunk-level revert from unified diff
- Edit management (selection range):
  - select change range inside a hunk and stage only that range
  - select change range inside a hunk and revert only that range
- Edit management (drag + undo):
  - drag across hunk change lines to set selection range
  - undo stack for selection stage/revert actions
- Edit management (batch + redo):
  - file-level stage/unstage/revert actions are now part of undo/redo history
  - multi-hunk batch selection with per-hunk range, `Stage Batch`, `Revert Batch`
  - redo support plus IPC additions (`fs:unstageHunk`, `fs:applyHunk`) for reversible patch flows
- Edit management (multi-file batch):
  - file list supports checkbox-based batch selection
  - batch stage/unstage/revert actions across selected files with history integration
- Edit management (stability + persistence):
  - transactional execution for batch actions with automatic rollback when a middle step fails
  - edit history/redo stacks persist per project and restore after app restart
- Edit management (history panel + diagnostics):
  - in-panel undo/redo stack browser with multi-step replay from any listed item
  - execution error messages now include failed operation target (file/patch) when available
- Edit management (history diff preview):
  - history panel now shows per-operation patch preview snippets for selected history items
  - history panel supports query-based filtering and context-line toggle for preview snippets
