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
| **Draft tasklist 편집 (승인 전)** | ✓ | SpecPanel.tsx + `agent:updateSpecDraft` IPC |
| **실제 스트리밍** | ✓ | CoordinatorAgent.ts |
| **실제 PTY 터미널** | ✓ | TerminalPanel.tsx + terminal.ts IPC |
| **세션 복원** | ✓ | App.tsx (localStorage) |
| Coordinator 에이전트 | ✓ | CoordinatorAgent.ts |
| Implementor 병렬 실행 | ✓ | AgentPipeline.ts |
| Verifier 에이전트 | ✓ | VerifierAgent.ts |
| Git Worktree 관리 | ✓ | WorktreeManager.ts |
| IPC 브릿지 전체 | ✓ | electron/ipc/ |
| 실시간 이벤트 → UI | ✓ | agentStore.ts |
| @ 멘션 (기본) | ✓ | ConversationPanel.tsx |
| PR 실제 생성 (gh CLI) | ✓ | file-system.ts + ChangesPanel.tsx |
| Checkpoint/restore (quick) | ✓ | agentStore + AgentSidebar |
| Checkpoint list/restore/delete | ✓ | AgentSidebar + fs IPC |
| Checkpoint rename + preview diff | ✓ | AgentSidebar + agentStore + fs IPC |
| Edit-management UX (file+selection+undo/redo+batch) | ✓ | ChangesPanel file/multi-file/selection stage-revert + drag range + multi-hunk batch + undo/redo |
| 다중 에이전트 탭 | ❌ | 저우선순위 |

## 남은 TODO (저우선순위)

1. **다중 에이전트 탭 고도화** — 탭 pin/close/검색 UX
2. **Edit-management UX 고도화** — 선택 필터(폴더/확장자) + 히스토리 검색/컨텍스트 프리뷰
