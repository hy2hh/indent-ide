# 05 — 에이전트 시스템

## 파이프라인 아키텍처

```
Coordinator (claude opus)
  ├── Context Engine으로 코드베이스 분석
  ├── Living Spec 초안 생성
  └── 태스크 분해 + 의존성 Wave 구성
        ↓ 사용자 Approve
Implementor × N (각각 git worktree에서 독립 실행)
  ├── Wave 1: 독립 태스크 병렬
  └── Wave 2: Wave 1 완료 후 의존 태스크
        ↓
Verifier
  ├── Spec vs 구현 대조
  ├── 실패 → Implementor에 피드백 + 재시도 (max 2회)
  └── 성공 → pipeline:completed
```

## 6가지 Specialist 역할

| 역할 | 담당 |
|------|------|
| **Coordinator** | 목표 분석, Spec 생성, 태스크 분해, 에이전트 위임 |
| **Implementor** | 코드 작성 (git worktree 내 독립 실행) |
| **Verifier** | Spec 충족 검증, 불일치 플래그 |
| **Investigator** | 코드베이스 탐색, 가능성 평가, 의존성 분석 |
| **Critic** | Spec 실현 가능성 검토, 잠재적 문제 지적 |
| **Developer** | Plan + Implement + Verify 원샷 처리 (빠른 작업용) |

> **현재 구현**: Coordinator / Implementor / Verifier 3종만 구현됨

## 에이전트 위임 계층 (TODO)

레퍼런스: Coordinator → Specialist 위임 시 대화 패널에 중첩 트리로 표시

```
● Coordinator
  ├── ● Hero Mockup Agent (Implementor)
  │     └── 코드 스니펫 스트리밍...
  └── ● Mobile View Agent (Implementor)
        └── 코드 스니펫 스트리밍...
```

## @ 멘션으로 에이전트 호출

- `@Investigator` → 특정 역할 에이전트 직접 호출
- `@파일명` → 파일을 컨텍스트로 첨부
- 드롭다운 메뉴에 사용 가능한 에이전트 목록 + 활동 표시기

## 모델 매핑 (현재 구현)

| 역할 | CLI | 모델 |
|------|-----|------|
| coordinator | claude | opus |
| implementor | codex / gemini | 기본값 |
| verifier | claude | sonnet |

## Background Agents (TODO)

- 특정 이벤트(PR 변경 등)를 기다리며 백그라운드 실행
- PR Shepherd: PR 리뷰 사이클 자동화

## Git Worktree 전략

- Implementor마다 `WorktreeManager`가 독립 worktree 생성
- 완료 시 `git merge --no-ff`로 메인 브랜치에 병합
- 실패 시 worktree 정리

## 현재 구현 상태

| 항목 | 상태 |
|------|------|
| Coordinator / Implementor / Verifier | ✓ |
| Wave 병렬 실행 | ✓ |
| Git Worktree 관리 | ✓ |
| 재시도 (max 2회) | ✓ |
| Investigator / Critic / Developer | ❌ |
| @ 멘션 에이전트 호출 | ❌ |
| 위임 계층 트리 표시 | ❌ |
| Background Agents | ❌ |
