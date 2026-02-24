# 01 — 온보딩 & Space 개념

## 앱 최초 실행 순서

1. **스플래시 화면** — 로고 잠깐 표시
2. **인증** — OAuth 브라우저 로그인 (현재 구현: 생략, 로컬 CLI 직접 사용)
3. **Welcome 화면** — 중앙에 입력창 + "Open Project" 버튼
4. **CLI 상태 표시** — claude / codex / gemini 설치 여부 점으로 표시

## Space 개념

- **Space**: 작업(feature/bugfix) 단위의 독립 개발 환경
  - 전용 git branch + git worktree 자동 생성
  - 하나의 레포에 여러 Space 병렬 존재 가능
  - 메인 브랜치에 영향 없이 독립 실행
- **우리 구현**: Space = 세션 (projectPath + sessionId)

## Welcome 화면 명세

### 현재 구현 상태: ✓ 기본 구현됨

### UI 요소
- 로고 + 앱 이름 (중앙 배치)
- 한 줄 설명 텍스트
- **Open Project 버튼** → `fs:openProject` IPC → 폴더 선택 다이얼로그
- CLI 상태 표시 (claude ● / codex ● / gemini ●)
  - 초록 점: 설치됨
  - 회색 점: 미설치
- CLI 미감지 시 안내 메시지

### TODO
- [ ] 최근 프로젝트 목록 (reopening)
- [ ] 세션 복원 (앱 재시작 시 마지막 프로젝트 자동 열기)
