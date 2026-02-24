# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build all packages
pnpm exec turbo build

# Run all tests
pnpm exec turbo test

# Lint
pnpm exec turbo lint
pnpm exec turbo lint:fix   # auto-fix

# Clean build artifacts
pnpm exec turbo clean

# Desktop app dev server
cd apps/desktop && pnpm dev

# Run tests for a single package
cd packages/<name> && pnpm test
```

## Architecture

**Intent IDE** is a multi-agent orchestration platform: an Electron desktop app backed by a 7-package pnpm monorepo coordinated by Turborepo.

### Agent Pipeline Pattern

```
Coordinator (claude opus) → plans task decomposition
    ↓
Implementors (parallel, in git worktrees) → execute tasks in dependency-aware waves
    ↓
Verifier (codex) → validates completion, runs tests → auto-retry up to 2x
```

### Package Dependency Tree

```
@intent-ide/core               ← types + constants, no deps
    ↑
@intent-ide/diff-engine        ← Myers diff, patch gen/apply
@intent-ide/intent-parser      ← classify intent, plan actions
@intent-ide/llm-orchestrator   ← CLI wrappers (claude/codex/gemini via child_process)
@intent-ide/context-engine     ← file scanner, tree-sitter parser, vector store, MCP server
    ↑ (all of the above)
@intent-ide/agent-orchestrator ← AgentPipeline, LivingSpec, MessageBus, WorktreeManager
    ↑
apps/desktop                   ← Electron main + React renderer (IPC bridge)
```

### LLM Integration

No API keys. Invokes locally installed CLI tools (`claude`, `codex`, `gemini`) via `child_process` with streaming output parsing. See `packages/llm-orchestrator/src/cli/`.

### Key Patterns

- **LivingSpec**: EventEmitter-based shared mutable state between agents (`packages/agent-orchestrator/src/spec/LivingSpec.ts`)
- **Wave parallelization**: `TaskDecomposer` builds topological waves; implementors run in parallel within a wave
- **Git worktrees**: Each implementor gets an isolated worktree, merged on success via `WorktreeManager`
- **Context compaction**: Hot/Cold compression in `ContextCompactor.ts` with `TokenBudget` enforcing per-request limits

### Desktop IPC Channels

Electron main ↔ renderer communicate via IPC: `file-system`, `context-engine`, `agent`, `terminal`. `contextIsolation: true`, `nodeIntegration: false`.

## TypeScript Config

`tsconfig.base.json` uses the strictest settings:
- `exactOptionalPropertyTypes: true` — don't assign `undefined` to optional props; use `...(val !== undefined ? { prop: val } : {})`
- `noUncheckedIndexedAccess: true` — array/object index access returns `T | undefined`

## Tailwind v4

- Plugin: `@tailwindcss/vite` (not postcss)
- Import: `@import "tailwindcss";` in `src/index.css`
- `postcss.config.js`: only `autoprefixer`

## simple-git Import

```typescript
import { simpleGit } from 'simple-git';  // named import only
```
