# 08 — 구현 현황 & 우선순위

## 전체 현황

| 기능 | 상태 | 파일 |
|------|------|------|
| Welcome 화면 | ✓ | WelcomeScreen.tsx |
| 3패널 레이아웃 | ✓ | App.tsx |
| macOS 타이틀바 | ✓ | App.tsx, main.ts |
| Agent Sidebar (Agents 탭) | ✓ | AgentSidebar.tsx |
| **Changes 탭 (diff 뷰)** | ✓ | ChangesPanel.tsx |
| **Files 탭 (파일 트리)** | ✓ | FileExplorer.tsx 연결됨 |
| 대화 패널 기본 | ✓ | ConversationPanel.tsx |
| Spec 패널 기본 | ✓ | SpecPanel.tsx |
| **Spec Approve UI** | ✓ | SpecPanel.tsx + AgentPipeline.ts |
| **실제 스트리밍** | ✓ | CoordinatorAgent.ts |
| **실제 PTY 터미널** | ✓ | TerminalPanel.tsx + terminal.ts IPC |
| **세션 복원** | ✓ | App.tsx (localStorage) |
| Coordinator 에이전트 | ✓ | CoordinatorAgent.ts |
| Implementor 병렬 실행 | ✓ | AgentPipeline.ts |
| Verifier 에이전트 | ✓ | VerifierAgent.ts |
| Git Worktree 관리 | ✓ | WorktreeManager.ts |
| IPC 브릿지 전체 | ✓ | electron/ipc/ |
| 실시간 이벤트 → UI | ✓ | agentStore.ts |
| @ 멘션 | ❌ | 저우선순위 |
| PR 실제 생성 (gh CLI) | ❌ | ChangesPanel PR 폼 stub |
| 다중 에이전트 탭 | ❌ | 저우선순위 |

## 남은 TODO (저우선순위)

1. **@ 멘션** — `@파일`, `@에이전트` 드롭다운 입력
2. **PR 실제 생성** — `gh pr create` CLI 연동
3. **다중 에이전트 탭** — Implementor마다 별도 탭
