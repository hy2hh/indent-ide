# Intent Parity Research (2026-02-25)

## Scope

Goal: identify features needed to approach functional parity with Augment Intent and map them to this repository.

## Primary sources

- Product page: https://www.augmentcode.com/product/intent
- Intent docs: https://docs.augmentcode.com/features/intent
- Using agent docs: https://docs.augmentcode.com/using-augment/using-the-augment-agent
- Changelog 0.2.8: https://www.augmentcode.com/changelog/0.2.8
- Changelog 0.2.7: https://www.augmentcode.com/changelog/0.2.7
- Changelog 0.2.5: https://www.augmentcode.com/changelog/0.2.5
- Changelog 0.2.3: https://www.augmentcode.com/changelog/0.2.3
- Changelog 0.2.9 (tasklist + changes review linkage): https://www.augmentcode.com/changelog/0.2.9

## Latest public feature snapshot (verified 2026-02-25)

From the product page and `0.2.x` changelog line:

- Multi-agent workflow with **Planner + Coding + Background agents**
- **Intent Notes** for plan context and collaboration state
- **In-app browser** for local app/docs/PR previews
- **Workspace layouts** that can be customized and reused
- **Session restore** after app restart/window reopen
- Richer `@` mention behavior with specialists and activity hints
- Links opening to the embedded browser by default in recent releases

Reference links:

- Product overview: https://www.augmentcode.com/product/intent
- Changelog index (`0.2.x`): https://www.augmentcode.com/changelog
- 0.2.6: https://www.augmentcode.com/changelog/0.2.6
- 0.2.7: https://www.augmentcode.com/changelog/0.2.7
- 0.2.8: https://www.augmentcode.com/changelog/0.2.8
- 0.2.9: https://www.augmentcode.com/changelog/0.2.9

## Parity-oriented feature checklist

- [x] Multi-agent orchestration pipeline with verifier/retry
- [x] Spec-first flow with explicit approval gate
- [x] Files + changes side panels
- [x] Embedded terminal
- [x] Task queue behavior while current run is active (added in this session)
- [~] PR flow (CLI-backed create is available; deeper review workflow can improve)
- [~] @mention UX (basic autocomplete added in this session; can be expanded)
- [~] Advanced edit-management UX (file+selection-range stage/revert + drag selection + selection undo done, file-level undo/redo pending)
- [x] Checkpoint/restore UX (list/rename/preview/restore/delete)
- [x] Embedded browser panel (right pane mode + URL/history/reload)
- [x] Workspace layout presets + user saved layout profiles
- [x] Workspace pane resize handles (left/right/terminal)
- [x] Session restore (project + conversation/spec/event snapshot)
- [x] Global queue state with pause/resume/clear controls
- [x] Command palette (`⌘K`) with workspace/browser/project/queue actions
- [x] PR link opens in embedded browser by default

## Gap notes

- Current UX still centers on a single linear conversation stream; richer multi-thread/agent workspace orchestration can be improved.
- Advanced background-agent lifecycle controls (pause/reassign/reprioritize) are still limited.
- Public docs/changelog cover major workflow concepts well, but some behavior details (exact preview granularity, UI micro-interactions) remain product-observation territory rather than strict API contracts.

## Improvements implemented in this cycle

- Conversation panel:
  - queue new goals during active execution
  - auto-start queued goals after completion/failure
  - basic `@` mention suggestions from agents/files
- Changes tab and PR flow:
  - visible success/error feedback
  - open created PR link inside IDE embedded browser
  - safer `gh pr create` invocation using argument-based process execution
- Intent-like workspace upgrades:
  - right-pane `Spec / Browser` mode switch
  - in-app browser with URL bar + back/forward/reload
  - built-in layout presets (`default`, `focus`, `review`)
  - save/load/delete user-defined layout profiles
  - pane resize handles for left, right, and terminal areas
  - global queue management (pause/resume/clear) shared across panels
  - command palette (`⌘K`) for high-frequency workspace actions
  - automatic session snapshot persistence and restore on app relaunch
