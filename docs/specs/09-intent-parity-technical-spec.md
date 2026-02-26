# 09 — Intent Parity Technical Spec (2026-02-25)

## 목적

Augment Intent 최신 공개 기능(`v0.2.x`)을 기준으로, Intent IDE의 기능 동등성을 달성하기 위한 기술 스펙을 명확히 정의한다.

## 리서치 근거 (공식 소스)

- Product: https://www.augmentcode.com/product/intent
- Changelog index (`0.2.x`): https://www.augmentcode.com/changelog
- Intent feature docs: https://docs.augmentcode.com/features/intent
- Tasklist docs: https://docs.augmentcode.com/features/tasklists
- Agent usage docs (checkpoints/changes): https://docs.augmentcode.com/using-augment/using-the-augment-agent
- Release notes:
  - https://www.augmentcode.com/changelog/0.2.9
  - https://www.augmentcode.com/changelog/0.2.8
  - https://www.augmentcode.com/changelog/0.2.7
  - https://www.augmentcode.com/changelog/0.2.6
  - https://www.augmentcode.com/changelog/0.2.5
  - https://www.augmentcode.com/changelog/0.2.3

## 패리티 범위

### P0 (현재 사이클)

1. **Spec draft editable tasklist**
   - 승인 전 사용자가 태스크를 추가/삭제/수정할 수 있어야 함
   - 저장 즉시 Living Spec 버전이 증가하고 UI에 반영되어야 함
2. **Running session follow-up queue**
   - 실행 중 새 목표 입력 시 큐잉
   - 현재 런 완료(성공/실패) 직후 다음 목표 자동 시작
3. **Changes → PR path**
   - 변경 파일 검토, PR 생성 결과 피드백, PR 링크 열기

### P1 (다음 사이클)

1. **Edit-management UX**
   - 적용/미적용 단위의 변경 제어

## 기술 설계

### 1) Draft tasklist 편집 계약

- IPC channel: `agent:updateSpecDraft`
- Request:

```ts
{
  tasks: Array<{
    id?: string;
    description: string;
    priority?: "high" | "medium" | "low";
    dependencies?: string[];
    files?: string[];
  }>;
}
```

- Response:

```ts
{ success: true; spec: LivingSpecData }
// or
{ success: false; error: string }
```

- 제약:
  - `spec.status === "draft"`에서만 편집 가능
  - 빈 description 태스크는 저장 시 제외
  - 중복 task id는 내부에서 유니크하게 정규화

### 2) 이벤트 전파 규칙

- LivingSpec 변경 발생 시 `spec:updated`를 메시지버스로 publish
- Renderer는 `agent:specUpdated`로 최신 스냅샷을 수신

### 3) 승인 게이트

- draft 편집 중에는 Approve 비활성화
- Save 성공 후에만 Approve 가능

### 4) Checkpoint Manager 고도화 계약

- IPC 채널
  - `fs:renameFile(fromPath, toPath)` 추가
- Store 계약
  - `renameCheckpoint(projectPath, filePath, name)`
  - `getCheckpointPreview(projectPath, filePath)`
- Preview 비교 항목
  - goal 변경 여부
  - pipeline status 변경
  - spec status/version 차이
  - task count 차이 + task별 added/removed/updated 목록
  - events/conversation count 차이
- 안전 제약
  - checkpoint 파일 경로는 `projectPath/.intent-ide/checkpoints` 하위만 허용
  - rename 시 payload의 `name`과 파일명 slug를 모두 정규화
  - restore는 preview와 분리된 명시 동작(사용자 확인 흐름 유지)

### 5) Edit-management (파일 단위) 계약

- IPC 채널
  - `fs:stageFile(projectPath, filePath)`
  - `fs:unstageFile(projectPath, filePath)`
  - `fs:discardFileChanges(projectPath, filePath)`
  - `fs:stageHunk(projectPath, patch)`
  - `fs:discardHunk(projectPath, patch)`
  - `fs:unstageHunk(projectPath, patch)` (undo for staged patch)
  - `fs:applyHunk(projectPath, patch)` (redo/restore for reverted patch)
- UI 동작
  - 선택 파일 기준 Stage/Unstage 토글
  - 파일 목록 체크박스로 multi-file 선택 후 Stage/Unstage/Revert batch 적용
  - 선택 파일 Revert(discard) 실행
  - 선택 hunk 내 change range 기준 Stage/Revert
  - hunk change 목록 드래그로 range 선택
  - 복수 hunk range를 batch로 선택해 Stage/Revert 일괄 적용
  - file + selection 기반 편집 Undo/Redo 스택 제공
  - 편집 히스토리 세션 영속화(localStorage) 및 재시작 후 복원
  - batch 처리 실패 시 자동 롤백(역연산 가능 항목 우선)
  - 히스토리 패널에서 스택 항목 탐색 및 N-step undo/redo 실행
  - 실패 시 연산 대상(파일/패치) 포함 상세 에러 메시지
  - 히스토리 패널에서 항목별 patch diff preview 표시
  - 히스토리 검색 및 context 포함 preview 토글
  - 파일 리스트에 staged 배지 표시
- 향후 확장
  - 히스토리 preview 라인 확장/축소 및 고정 비교

## 수용 기준 (Acceptance Criteria)

1. 사용자가 draft 상태에서 task description/priority/dependencies/files를 수정 후 저장하면 즉시 Spec 패널에 반영된다.
2. 저장 후 `spec.version`이 증가한다.
3. draft가 아닌 상태에서 편집 요청 시 실패 응답을 반환한다.
4. 런타임/빌드 품질 게이트(`lint`, `typecheck`, `build`, `test`)가 모두 통과한다.

## 구현 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| Draft tasklist 편집 | ✅ | SpecPanel + IPC + LivingSpec 반영 |
| Running queue | ✅ | ConversationPanel 큐잉/자동실행 |
| PR path | ✅ | gh CLI 기반 생성 + 피드백 + 링크 열기 |
| Checkpoint/restore (quick) | ✅ | Save + Restore Latest |
| Checkpoint list/restore/delete | ✅ | 리스트 표시 + 선택 복원 + 삭제 |
| Checkpoint rename + preview diff | ✅ | 인라인 rename + 복원 전 상세 비교 |
| Yolo Mode (Auto-Approve) | ✅ | Spec 생성 시 사용자 개입 없이 즉시 구현 착수 |
| Inline Ask Agent (⌘K) | ✅ | 에디터 내 맥락 기반 자연어 명령 기능 |
| Premium UI/UX Polish | ✅ | Deep Dark (#0b0d12) 테마 및 고도화된 레이아웃 |
| Edit-management UX | ◑ | 파일/multi-file/selection stage-revert + drag range + multi-hunk batch + undo/redo + history 영속화 + 실패 롤백 + 히스토리 탐색/재적용 + 상세 에러 + diff preview + context 토글/검색 완료, preview 상호작용 고도화는 미완 |
