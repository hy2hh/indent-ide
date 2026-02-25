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
[Stage/Unstage] [Revert File] [Create PR]
```

## 기능 명세

### Diff 뷰
- 현재: unified diff 뷰 (라인 타입별 색상)
- 다음 단계:
  - side-by-side 비교
  - 라인 번호/문법 하이라이팅
  - 스크롤 위치 고정 개선

### PR 생성
- 현재:
  - 제목 입력 후 `gh pr create` 실행
  - 결과 성공/실패 배너 표시
  - 생성된 URL 열기(Open PR)
- 다음 단계:
  - Spec goal/태스크 기반 제목/본문 자동 생성 고도화
  - 브랜치 정책 표준화 (`intent/{sessionId}`)

### 스테이징
- 현재:
  - 선택 파일 기준 `Stage` / `Unstage` 토글
  - 파일 목록 체크박스로 multi-file 배치 선택 후 `Stage Files` / `Unstage Files`
  - 선택 hunk 내 change range 기준 `Stage Selection`
  - change 라인 목록 드래그로 range 선택
  - 다중 hunk 배치 선택 후 `Stage Batch` 일괄 적용
  - staged 파일 배지 표시
- 다음 단계:
  - 선택 파일 자동 그룹핑(폴더/확장자 단위 선택)

### 되돌리기
- 현재:
  - 선택 파일 기준 `Revert File`
  - 파일 목록 체크박스로 multi-file 배치 선택 후 `Revert Files`
  - 선택 hunk 내 change range 기준 `Revert Selection`
  - selection/file stage/revert에 대한 Undo/Redo 히스토리
  - 편집 히스토리 세션 영속화(localStorage 복원)
  - 배치 액션 실패 시 자동 롤백(가능한 작업 범위 내)
  - 실패 시 연산 단위 상세 메시지(파일/패치 대상) 표시
  - 다중 hunk 배치 선택 후 `Revert Batch` 일괄 적용
- 다음 단계:
  - 히스토리 diff preview에 context 라인 토글 추가

### 병합
- 미구현

### 커밋 패널
- 이전 커밋 이력 표시
- 커밋별 diff 조회

## 현재 구현 상태

| 항목 | 상태 |
|------|------|
| Changes 탭 UI | ✓ |
| Diff 뷰어 | ✓ (unified) |
| 파일 목록 | ✓ |
| PR 생성 | ✓ (`gh pr create`) |
| 파일 단위 스테이징 | ✓ |
| 파일 단위 되돌리기 | ✓ |
| multi-file 배치 편집 | ✓ |
| 선택 범위 단위 편집 제어 | ✓ |
| 다중 hunk 배치 선택 | ✓ |
| Undo/Redo 히스토리 (file + selection) | ✓ |
| 병합 | ❌ |

## 구현 방법 (IPC)

```typescript
// 변경 파일 목록: simple-git status + diff --stat
// Diff: simple-git diff
// 파일 단위 제어: stage/unstage/restore (simple-git + git restore)
// selection 단위 제어: git apply (--cached / --reverse) with generated patch
// undo/redo 확장: git apply --cached --reverse, git apply(forward) IPC 추가
// PR 생성: gh CLI
```

## 우선순위: 높음

파이프라인이 완료된 후 결과를 확인하고 적용하는 핵심 단계.
이게 없으면 에이전트가 만든 코드를 볼 방법이 없음.
