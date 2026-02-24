# Intent IDE 사용 가이드

Intent IDE는 AI 에이전트가 병렬로 코드를 작성하고, 명세(Spec)를 기반으로 개발 작업을 조율하는 멀티 에이전트 오케스트레이션 플랫폼입니다.

---

## 빠른 시작

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행 (Electron 앱)
cd apps/desktop && pnpm dev

# 전체 빌드
pnpm exec turbo build
```

---

## UI 구조

```
┌─────────────────┬──────────────────────────┬──────────────────┐
│   Agent Sidebar │   Conversation Panel     │   Spec Panel     │
│   (좌측 패널)    │   (중앙 패널)             │   (우측 패널)     │
│                 │                          │                  │
│ • 프로젝트 정보  │ • 에이전트 탭 바          │ • NOTES / SPEC   │
│ • 에이전트 목록  │ • 대화 히스토리            │ • 명세 내용       │
│ • 백그라운드     │ • 서브에이전트 카드        │ • 현재 작업 상태  │
│   에이전트 그룹  │ • 메시지 입력창           │ • 터미널 출력     │
└─────────────────┴──────────────────────────┴──────────────────┘
```

---

## 사용 방법

### 1단계: 프로젝트 열기

왼쪽 사이드바 상단의 외부 링크 아이콘(↗)을 클릭하거나, `Agents` 탭 하단의 `+ Create new agent` 버튼을 통해 프로젝트를 시작합니다.

> **TIP**: 프로젝트 경로가 설정되어야 에이전트 파이프라인이 작동합니다.

---

### 2단계: 에이전트에게 작업 지시하기

중앙 패널 하단의 입력창에 작업 내용을 자연어로 입력합니다.

```
예시:
"로그인 페이지를 만들어줘. 이메일/비밀번호 입력 폼과 OAuth 버튼이 필요해."
"navbar 컴포넌트를 모바일 반응형으로 리팩토링해줘."
"API 응답 캐싱 로직을 추가해줘."
```

- **단축키**: `Cmd/Ctrl + Enter` → 즉시 전송
- 입력창 우측 아이콘:
  - 📎 첨부파일
  - 🔗 링크 참조
  - ➤ 전송

---

### 3단계: 에이전트 파이프라인 작동 방식

```
입력한 작업 지시
      ↓
Coordinator (claude opus)
  → 작업 분해 (Task Decomposition)
  → Living Spec 생성
      ↓
병렬 Implementors (git worktree 격리 실행)
  → Wave 단위로 의존성 순서 처리
  → 각 에이전트가 독립적으로 코드 작성
      ↓
Verifier (codex)
  → 완료 검증, 테스트 실행
  → 실패 시 자동 재시도 (최대 2회)
```

---

### 4단계: 에이전트 상태 확인

**왼쪽 사이드바 — Agents 탭**

| 색상 | 의미 |
|------|------|
| 🟢 녹색 점 | 실행 중 (Running) |
| ⬜ 회색 점 | 대기 중 (Idle) |
| 🟣 보라 사각형 | Coordinator 에이전트 |
| 🔴 빨간 사각형 | Code Review 에이전트 |
| 🔵 파란 사각형 | Design Review 에이전트 |

**중앙 패널 — 대화 뷰**

- 🟩 **초록 박스**: 사용자가 입력한 작업 지시
- 📄 **일반 텍스트**: 에이전트 응답
- **서브에이전트 카드**: 하위 에이전트 실행 상태와 결과 요약

---

### 5단계: Spec 패널 활용

오른쪽 패널은 Living Spec (실시간 명세)을 표시합니다.

- **Overview**: 프로젝트/작업 개요
- **Product Information**: 에이전트가 수집한 조사 내용
- **Core Messaging**: 핵심 메시지와 요구사항
- **Current Tasks**: 현재 실행 중인 작업과 터미널 출력

---

## 에이전트 탭 시스템

중앙 패널 상단의 탭으로 여러 에이전트 대화를 전환할 수 있습니다:

```
● Coordinator ×    ● hero-section... ×    ● 807245d: Fix... ×
```

- **녹색 점**: 활성/실행 중인 에이전트
- **주황 점**: 브랜치 또는 진행 중인 PR/커밋
- `×` 버튼으로 탭 닫기

---

## 고급 사용법

### LLM CLI 연동

Intent IDE는 로컬에 설치된 CLI 도구를 사용합니다 (API 키 불필요):

```bash
# 지원 CLI 확인
which claude    # Anthropic Claude Code CLI
which codex     # OpenAI Codex CLI
which gemini    # Google Gemini CLI
```

### Git Worktree 격리

각 구현 에이전트는 독립적인 git worktree에서 실행됩니다:
- 에이전트 간 코드 충돌 없음
- 성공 시 자동 병합
- 실패 시 worktree 자동 정리

### Context Engine

프로젝트 인덱싱으로 에이전트가 코드베이스를 이해합니다:
- Tree-sitter 기반 코드 파싱
- Vector store를 통한 시맨틱 검색
- MCP 서버로 컨텍스트 제공

---

## 패키지 구조

```
apps/
  desktop/              ← Electron 앱 (메인 UI)
packages/
  core/                 ← 타입 + 상수
  diff-engine/          ← Myers diff 알고리즘
  intent-parser/        ← 의도 분류, 액션 계획
  llm-orchestrator/     ← Claude/Codex/Gemini CLI 래퍼
  context-engine/       ← 파일 스캐너, 파서, 벡터 스토어
  agent-orchestrator/   ← AgentPipeline, LivingSpec, WorktreeManager
```

---

## 문제 해결

| 증상 | 해결 방법 |
|------|-----------|
| 에이전트가 시작되지 않음 | `which claude` 로 CLI 설치 확인 |
| 빌드 오류 | `pnpm exec turbo build` 재실행 |
| 컨텍스트 인덱싱 실패 | 프로젝트 경로 권한 확인 |
| Worktree 충돌 | `git worktree list` 로 잔여 worktree 확인 후 수동 삭제 |

---

## 개발 명령어

```bash
# 전체 빌드
pnpm exec turbo build

# 전체 테스트
pnpm exec turbo test

# 린트 + 자동 수정
pnpm exec turbo lint:fix

# 빌드 아티팩트 정리
pnpm exec turbo clean

# 데스크탑 앱 개발 서버
cd apps/desktop && pnpm dev

# 특정 패키지 테스트
cd packages/agent-orchestrator && pnpm test
```
