# 06 — Changes 탭

## 역할

에이전트가 수정한 모든 파일의 diff를 검토하고 PR을 생성하는 공간.

## UI 구조

```
[Changes 탭] — 좌측 사이드바 또는 별도 패널

파일 목록 (변경된 파일들)
├── src/auth/middleware.ts        +42 -8
├── src/auth/jwt.service.ts       +120 -0
└── tests/auth.test.ts            +89 -0

[선택한 파일 diff 뷰 — side-by-side]
좌: 이전 코드 (빨강)
우: 새 코드 (초록)

─────────────────────────
[Stage Selected]  [Create PR]  [Merge]
```

## 기능 명세

### Diff 뷰
- side-by-side 비교 (좌: before, 우: after)
- 라인 번호 표시
- 문법 하이라이팅
- 스크롤 위치 유지 (에이전트 편집 중에도)

### PR 생성
- **자동 채워지는 정보**:
  - 제목: Spec의 goal에서 자동 생성
  - 본문: 에이전트가 완료한 태스크 목록 자동 작성
  - 브랜치명: `intent/{sessionId}` 형태
- 사용자가 제목/본문 편집 가능 후 Create PR

### 스테이징
- 파일별 선택적 스테이징 (체크박스)
- Stage All / Unstage All

### 병합
- PR을 통한 병합
- 로컬 직접 병합 (`git merge --no-ff`)
- 충돌 없으면 자동 리베이스

### 커밋 패널
- 이전 커밋 이력 표시
- 커밋별 diff 조회

## 현재 구현 상태

| 항목 | 상태 |
|------|------|
| Changes 탭 UI | ❌ stub ("coming soon") |
| Diff 뷰어 | ❌ |
| 파일 목록 | ❌ |
| PR 생성 | ❌ |
| 스테이징 | ❌ |
| 병합 | ❌ |

## 구현 방법 (IPC)

```typescript
// 변경 파일 목록: WorktreeManager.getChangedFiles()
// Diff: simple-git diff
// PR 생성: GitHub API or gh CLI
```

## 우선순위: 높음

파이프라인이 완료된 후 결과를 확인하고 적용하는 핵심 단계.
이게 없으면 에이전트가 만든 코드를 볼 방법이 없음.
