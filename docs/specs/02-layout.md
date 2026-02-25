# 02 — 레이아웃 & 타이틀바

## 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│  [●●●]  🔍  프로젝트명 / 현재 작업              ⌘K   │  40px 타이틀바
├────────────────┬──────────────────────┬─────────────────────┤
│ Agent Sidebar  │  Conversation Panel  │    Spec Panel       │
│   288px 고정   │     flex-1 가변       │    380px 고정       │
└────────────────┴──────────────────────┴─────────────────────┘
```

## 타이틀바

- **높이**: 40px
- **배경**: `#141418`
- **드래그 영역**: 전체 (`WebkitAppRegion: drag`)
- **좌측**: macOS 트래픽 라이트 공간 (80px no-drag 영역)
- **중앙 검색바** (no-drag):
  - 🔍 아이콘 + 현재 컨텍스트 텍스트 + ⌘K 배지
  - 프로젝트 미선택: "Open a project to start"
  - 프로젝트 선택 후: "{projectName}"
  - ⌘K: TODO — 커맨드 팔레트

## Agent Sidebar (좌측, 288px)

탭: `Agents` | `Changes` | `Files`

### Agents 탭
- 실행 중인 에이전트 목록 (실시간)
- 에이전트 미실행 시: 안내 메시지
- 에이전트 상태: 🟢 pulse=Running / ✓ 초록=Done / ✗ 빨강=Failed
- currentSpec.tasks 요약 (태스크 진행 상황)
- 파이프라인 완료/실패 시: "+ New session" 버튼

### Changes 탭 → [06-changes-tab.md](./06-changes-tab.md)
### Files 탭 → [File Explorer] (기본 구현)

## Spec Panel (우측, 380px)

→ [04-spec-panel.md](./04-spec-panel.md)

## 현재 구현 상태

| 항목 | 상태 |
|------|------|
| 타이틀바 + 드래그 | ✓ |
| 3패널 레이아웃 | ✓ |
| Welcome → 3패널 전환 | ✓ |
| Agent Sidebar Agents 탭 | ✓ |
| Changes 탭 | ✓ (기본 구현) |
| Files 탭 | ✓ (기본 구현) |
| ⌘K 커맨드 팔레트 | ❌ |
