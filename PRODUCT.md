# Intent IDE — 제품 기획서

> 레퍼런스: Augment Code의 [Intent](https://www.augmentcode.com/product/intent) (2026년 Public Beta)
> 목표: AI 에이전트가 코드를 직접 작성하는 멀티 에이전트 개발 환경

---

## 1. 제품 개요

**Intent IDE**는 자연어 목표를 입력하면 여러 AI 에이전트가 병렬로 코드를 작성하는 macOS 데스크탑 앱이다.

- **핵심 패러다임**: Spec-Driven Development (SDD) — 구현 전에 명세(Spec)를 먼저 생성하고, 에이전트가 Spec을 따라 구현
- **기술 스택**: Electron + Vite, React + Tailwind v4, pnpm monorepo
- **LLM 연동**: API 키 없음. 로컬에 설치된 `claude` / `codex` / `gemini` CLI를 직접 호출

---

## 2. 사용 흐름

```
1. 앱 실행 → Welcome 화면 (빈 상태)
       ↓
2. Open Project → 작업할 git 레포지토리 선택
       ↓
3. 목표 입력 (예: "Add dark mode toggle to the settings page")
       ↓
4. Coordinator 에이전트 실행
   - 코드베이스 컨텍스트 분석
   - Living Spec 초안 자동 생성 (Overview / Tasks / Constraints)
       ↓
5. [TODO] 사용자가 Spec 검토 → "Approve" 클릭
       ↓
6. Implementor 에이전트들이 병렬 실행 (각각 git worktree에서 독립 작업)
   - 각 에이전트의 진행 상황이 가운데 패널에 실시간 스트리밍
   - 우측 Spec 패널의 Tasks가 실시간 업데이트 (○ → → → ✓)
       ↓
7. Verifier 에이전트가 구현 결과 검증
   - Spec 충족률 (%) 계산
   - 실패 시 자동 재시도 (최대 2회)
       ↓
8. 완료 → Changes 탭에서 diff 검토 → PR 생성 (TODO)
```

---

## 3. UI 구조 (3-패널 레이아웃)

```
┌─────────────────────────────────────────────────────────────┐
│  [●●●]  🔍  Coordinator — Intent Product Page         ⌘K   │  ← 타이틀바 (드래그 가능)
├────────────────┬──────────────────────┬─────────────────────┤
│  Agent Sidebar │  Conversation Panel  │    Spec Panel       │
│  (288px 고정)  │  (가변, flex-1)      │  (380px 고정)       │
│                │                      │                     │
│  [에이전트 목록]│  [대화 피드]         │  [Living Spec]      │
│  - coordinator │  goal → response →   │  Overview           │
│  - implementor │  agent 카드들        │  Tasks (진행률 바)  │
│  - verifier    │                      │  Constraints        │
│                │  [입력창]            │                     │
│  [태스크 요약] │                      │                     │
└────────────────┴──────────────────────┴─────────────────────┘
```

### 3.1 좌측 — Agent Sidebar

| 탭 | 현재 상태 | TODO |
|----|----------|------|
| Agents | 실행 중인 에이전트 목록 실시간 표시 | ✓ 구현됨 |
| Changes | - | diff 뷰 + PR 생성 |
| Files | - | 파일 트리 |

**에이전트 상태 표시**:
- 🟢 pulse → Running
- ✓ 초록 → Completed
- ✗ 빨강 → Failed

### 3.2 가운데 — Conversation Panel

탭 바: 각 에이전트/브랜치별 독립 탭 (색상 점으로 상태 구분)

**대화 아이템 타입**:
| 타입 | 표시 방식 |
|------|----------|
| `goal` | 초록 배경 박스 |
| `response` | 일반 텍스트 |
| `agent-started` | 녹색 펄스 점 + 에이전트명 |
| `agent-progress` | 코드 스니펫 카드 (실시간 스트리밍) |
| `agent-completed` | 요약 + 변경 파일 배지 |
| `agent-failed` | 빨간 테두리 카드 + 에러 |
| `verify-pass` | 초록 박스 + coverage % |
| `verify-fail` | 노란 박스 + 재시도 안내 |
| `pipeline-completed` | 완료 박스 |
| `pipeline-failed` | 실패 박스 |

### 3.3 우측 — Spec Panel (Living Spec)

`currentSpec === null` → "No spec yet" 빈 화면
spec 생성 후:
- **제목**: spec.goal
- **상태 배지**: draft / in_progress / completed / failed
- **진행률 바**: 완료된 tasks / 전체 tasks
- **Tasks 목록**: ○ pending / → in_progress / ✓ completed / ✗ failed
- **Constraints**: Coordinator가 발견한 제약사항
- **버전 정보**: v{n} · updated HH:MM:SS

---

## 4. 에이전트 파이프라인

```
Coordinator (claude opus)
  ├── 코드베이스 분석 (Context Engine)
  ├── Living Spec 생성
  └── 태스크 분해 + Wave 구성
        ↓ (의존성 그래프 기반 병렬화)
Implementor × N (codex / gemini — 각 worktree에서 독립 실행)
  ├── Wave 1: 독립 태스크들 병렬 실행
  └── Wave 2: Wave 1 완료 후 의존 태스크 실행
        ↓
Verifier (claude)
  ├── Spec vs 구현 대조
  ├── 실패 시 Implementor에 피드백 + 재시도 (max 2회)
  └── 성공 시 파이프라인 완료
```

**Git Worktree 전략**: 각 Implementor는 별도 worktree에서 작업 → 병합 시 `git merge --no-ff`

---

## 5. 구현 현황

### 완성된 것 ✓
- [x] 3패널 레이아웃 + macOS 커스텀 타이틀바
- [x] Welcome 화면 (프로젝트 미선택 시)
- [x] 더미 데이터 제거 → 실제 파이프라인 이벤트 기반 UI
- [x] AgentPipeline (Coordinator → Implementor 병렬 → Verifier)
- [x] LivingSpec (EventEmitter 기반 실시간 업데이트)
- [x] IPC 브릿지 (Electron main ↔ renderer)
- [x] claude / codex / gemini CLI 래퍼
- [x] Git Worktree 관리
- [x] 실시간 이벤트 → 대화 아이템 변환

### 미구현 / TODO
- [ ] **Spec 승인 UI**: Coordinator가 Spec 초안을 만들면 사용자가 검토 후 "Approve" 클릭
- [ ] **Changes 탭**: 에이전트가 수정한 파일들의 diff 뷰 + PR 생성
- [ ] **Files 탭**: 프로젝트 파일 트리
- [ ] **내장 터미널**: 실제 pty 기반 터미널 (현재는 정적 표시)
- [ ] **실시간 스트리밍**: 에이전트 출력을 토큰 단위로 스트리밍
- [ ] **에이전트별 탭**: 각 Implementor가 별도 탭으로 표시
- [ ] **임베딩 서비스**: 현재 해시 기반 → 실제 벡터 임베딩으로 교체
- [ ] **세션 저장**: 앱 재시작 시 이전 세션 복원

---

## 6. 레퍼런스 제품 (Augment Intent) 대비 차이점

| 기능 | Augment Intent | 현재 구현 |
|------|---------------|----------|
| CLI 연동 | auggie CLI | claude/codex/gemini CLI |
| Spec 승인 | 사용자 직접 편집 + Approve | 자동 approve (TODO) |
| 에이전트 탭 | 에이전트별 독립 탭 | 단일 Coordinator 탭 |
| Changes 탭 | diff 뷰 + PR 생성 | stub |
| 내장 터미널 | 실제 터미널 | 정적 표시 |
| 온보딩 | Space 이름/설명 입력 | Open Project 바로 |

---

## 7. 다음 우선순위

1. **Spec 승인 UI** — Coordinator 결과를 사용자가 검토하고 승인하는 흐름
2. **실시간 스트리밍** — agent:progress 이벤트가 실제로 흐르도록
3. **Changes 탭** — diff 뷰 (에이전트 작업 결과 검토)
4. **내장 터미널** — node-pty 기반 실제 터미널
