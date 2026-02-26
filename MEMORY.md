# Project Memory

Last updated: 2026-02-26

## What this project builds

This repository builds **Intent IDE**, a macOS desktop IDE where multiple AI agents collaborate to implement coding tasks from a natural-language goal.

## Core product idea & Philosophy

- **Philosophy**: "Users provide the Intent, Agents handle the Implementation." The IDE is designed so that users don't need to know how to code; they only need to define clear goals.
- **Workflow**: `goal input -> spec generation -> parallel implementation -> verification -> review/PR`
- **Spec-Driven Development (SDD)**: A living specification acts as the source of truth between human and agents.
- **Yolo Mode**: Fully automated flow where specs are auto-approved, minimizing human intervention.
- **Agentic UX**: Features like `⌘K` inside the editor allow for contextual, natural language instructions instead of manual editing.

## Current status snapshot

- **Core**: 3-panel UI, multi-agent pipeline (Coordinator/Implementor/Verifier), Git Worktree management.
- **Features**: Yolo Mode (Auto-Approve), Inline Ask Agent (⌘K), Multi-Intent history, Terminal, Browser, File Explorer.
- **Aesthetic**: Premium "Deep Dark" theme (#0b0d12) consistent with Augment Intent.

## Source of truth docs

- `PRODUCT.md` - Product vision and mottos.
- `GUIDE.md` - Development setup and conventions.
- `docs/specs/` - Detailed technical specifications.

## Improvements added in this session (2026-02-26)

- **Philosophy Realization**:
  - **Yolo Mode**: Added a toggle in SpecPanel to auto-approve plans, enabling zero-click implementation.
  - **Inline Ask Agent (⌘K)**: Implemented Cursor-style popup in CodeEditor to send contextual goals to agents.
- **UI/UX Refinement**:
  - **Premium Theme**: Rebranded to Deep Dark (#0b0d12) with refined borders and blue accents.
  - **Multi-Intent History**: New "Intents" sidebar tab for managing session history and checkpoints.
  - **Layout Modes**: Chat, Code, and Split modes with automatic switching based on activity.
- **Terminal & Editor**:
  - Re-styled TerminalPanel and EditorTabs to match the premium aesthetic.
  - Integrated Monaco Editor with auto-scroll and better status indicators.
- **Stability**:
  - Fixed lint errors across `llm-orchestrator` and `context-engine`.
  - Verified codebase with `pnpm lint` and build checks.
