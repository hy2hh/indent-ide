# 03 — Conversation Panel (대화 패널)

## 역할

에이전트와의 대화 피드. 목표 입력 → 에이전트 진행 상황 실시간 스트리밍 표시.

## 탭 바

- 탭마다 색상 점 (상태 표시)
- Coordinator 탭 (기본), 에이전트별 탭, git 커밋 탭
- **현재**: Coordinator + 에이전트별 동적 탭 생성 (기본 구현)

## 대화 아이템 타입 & 표시 방식

| 타입 | 표시 | 상태 |
|------|------|------|
| `goal` | 초록 배경 박스 (`#0c1c0c` border `#1e4a1e`) | ✓ |
| `response` | 일반 텍스트 (`#c4c4cc`) | ✓ |
| `agent-started` | 🟢 pulse + "agentId — taskId" | ✓ |
| `agent-progress` | 코드 스니펫 카드 (stream chunk 기반) | ✓ |
| `agent-completed` | 요약 + 파일 배지 (파란 mono) | ✓ |
| `agent-failed` | 빨간 테두리 카드 | ✓ |
| `verify-pass` | 초록 박스 + coverage % | ✓ |
| `verify-fail` | 노란 박스 + 재시도 안내 | ✓ |
| `pipeline-completed` | 완료 박스 | ✓ |
| `pipeline-failed` | 실패 박스 | ✓ |

## 입력창

- **위치**: 패널 하단
- **형태**: textarea (여러 줄)
- **전송**: `⌘↵` 또는 Run 버튼
- **실행 중 동작**: Run 버튼이 Queue 모드로 전환
- **플레이스홀더**: 상태별로 다름
  - idle: "Describe what you want to build or change..."
  - running: "Agent is working... Add another goal to queue."
- **Stop 버튼**: 실행 중일 때 breadcrumb 우측에 표시
- **목표 큐**: 실행 중 입력한 goal을 순차 큐잉, 현재 run 종료 후 자동 실행

## @ 멘션

레퍼런스: `@` 입력 시 드롭다운
- 현재 구현:
  - `@에이전트명`/`@파일경로` 기본 자동완성 드롭다운
  - 선택 시 입력창에 멘션 토큰 삽입
- 다음 단계:
  - 에이전트 직접 위임 semantics
  - 터미널 세션/심볼 단위 멘션

## 스트리밍 (TODO — 우선순위 높음)

- 현재: `agent:progress` 이벤트 단위로 표시
- 목표: 토큰 단위 스트리밍 → 카드 내 텍스트가 실시간으로 타이핑되듯 표시
- 구현 방법: `llm-orchestrator`의 `cli.stream()` → IPC로 청크 전송

## 에이전트 개입 (TODO)

- 에이전트 응답 중 **새 메시지 전송** 가능 (현재 Interrupt)
- Stop → 새 지시 입력 → Resume

## 현재 구현 상태

| 항목 | 상태 |
|------|------|
| 대화 아이템 렌더링 | ✓ |
| 빈 상태 안내 | ✓ |
| 입력 → 파이프라인 실행 | ✓ |
| Stop 버튼 | ✓ |
| 목표 큐(실행 중 follow-up) | ✓ |
| stream chunk 표시 | ✓ |
| @ 멘션 (기본) | ✓ |
| 에이전트별 탭 | ✓ (기본) |
| 대화 중 개입 | ❌ |
