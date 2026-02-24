# Intent IDE — 기능 명세 인덱스

레퍼런스: Augment Code Intent (v0.2.8, 2026-02-22 기준)

## 파일 목록

| 파일 | 내용 |
|------|------|
| [01-onboarding.md](./01-onboarding.md) | 온보딩, Space 개념, 앱 초기 상태 |
| [02-layout.md](./02-layout.md) | 3패널 레이아웃, 타이틀바, 전체 UI 구조 |
| [03-conversation.md](./03-conversation.md) | 대화 패널, 스트리밍, @ 멘션, 입력창 |
| [04-spec-panel.md](./04-spec-panel.md) | Living Spec, Approve 플로우, 실시간 업데이트 |
| [05-agent-system.md](./05-agent-system.md) | 에이전트 아키텍처, 6가지 역할, 위임 계층 |
| [06-changes-tab.md](./06-changes-tab.md) | diff 뷰, PR 생성, 스테이징, 병합 |
| [07-terminal.md](./07-terminal.md) | 내장 터미널, 단축키, 에이전트 명령 실행 |
| [08-implementation-status.md](./08-implementation-status.md) | 현재 구현 현황 및 우선순위 |

## 핵심 패러다임

**Spec-Driven Development (SDD)**:
목표 입력 → Spec 자동 생성 → 사용자 승인 → 에이전트 병렬 구현 → 검증 → PR
