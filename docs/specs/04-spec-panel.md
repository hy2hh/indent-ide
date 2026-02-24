# 04 — Spec Panel (Living Spec)

## 역할

Coordinator가 생성하는 자기유지(self-maintaining) 명세 문서.
에이전트가 작업할 때마다 자동 업데이트.

## 상태별 표시

### spec 없음 (파이프라인 미실행)
```
No spec yet
Coordinator가 목표를 분석하면 여기에 Living Spec이 생성됩니다.
```

### spec 있음 (SpecContent)

```
[목표 제목]                              [상태 배지: draft|in_progress|completed|failed]

[████████░░░░] 3/7                       ← 진행률 바

Constraints
• TypeScript strict mode
• No breaking changes

Tasks
✓ Create auth middleware          auth.ts
→ Implement JWT rotation          (animate-pulse)
○ Add refresh token endpoint
✗ Write integration tests

Context
(Coordinator가 발견한 코드베이스 컨텍스트)

v3 · updated 21:34:12
```

## Spec 생성 플로우

1. 사용자 목표 입력 → `startPipeline(goal, projectPath)`
2. Coordinator 에이전트 실행
3. `spec:updated` 이벤트 발생 → IPC → renderer → `updateSpec(spec)`
4. Spec 패널 자동 업데이트

## Approve 플로우 (TODO — 핵심 기능)

레퍼런스 동작:
1. Coordinator가 Spec 초안(draft) 생성
2. 패널 상단에 **"Approve Plan" 버튼** 표시
3. 사용자가 Spec 내용 검토 (직접 편집 가능)
4. Approve 클릭 → Coordinator가 Implementor들에게 fan-out

### 구현 방법
- `spec.status === 'draft'` 일 때 Approve 버튼 표시
- 클릭 → `agent:approveSpec` IPC → `LivingSpec.approve()`
- 현재: 자동 approve (`spec.approve('auto')`) → 사용자 개입 없음

## Spec 직접 편집 (TODO)

- Spec 텍스트를 클릭하면 인라인 편집 모드
- 수정 후 저장 → 에이전트에게 업데이트 전파

## 현재 구현 상태

| 항목 | 상태 |
|------|------|
| spec 없음 시 빈 화면 | ✓ |
| 목표 + 상태 배지 | ✓ |
| 진행률 바 | ✓ |
| Tasks 목록 (✓→○) | ✓ |
| Constraints | ✓ |
| 버전/업데이트 시각 | ✓ |
| **Approve 버튼** | ❌ 핵심 미구현 |
| Spec 직접 편집 | ❌ |
| 코드 블록 복사 버튼 | ❌ |
