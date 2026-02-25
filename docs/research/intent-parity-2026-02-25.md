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

## Gap notes

- Current UX still centers on a single linear conversation stream; richer per-edit and checkpoint affordances are still pending.
- More detailed pre-run task list editing can further close parity with recent Intent updates.
- Public docs/changelog cover major workflow concepts well, but some behavior details (exact preview granularity, UI micro-interactions) remain product-observation territory rather than strict API contracts.

## Improvements implemented in this cycle

- Conversation panel:
  - queue new goals during active execution
  - auto-start queued goals after completion/failure
  - basic `@` mention suggestions from agents/files
- Changes tab and PR flow:
  - visible success/error feedback
  - open created PR link
  - safer `gh pr create` invocation using argument-based process execution
