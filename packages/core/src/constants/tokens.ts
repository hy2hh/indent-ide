/**
 * 토큰 예산 상수
 */

export const TOKEN_BUDGETS = {
  /** Context Engine 검색 결과 최대 토큰 */
  SEARCH_RESULT: 8_000,
  /** Coordinator 컨텍스트 윈도우 */
  COORDINATOR: 40_000,
  /** Implementor 컨텍스트 윈도우 */
  IMPLEMENTOR: 20_000,
  /** Verifier 컨텍스트 윈도우 */
  VERIFIER: 16_000,
  /** Hot 결과 최대 토큰 */
  HOT_RESULT: 4_000,
  /** Cold 결과 요약 최대 토큰 */
  COLD_SUMMARY: 200,
  /** 궤적 요약 최대 토큰 */
  TRAJECTORY_SUMMARY: 400,
} as const;

export const CONTEXT_COMPACTION = {
  /** Hot → Cold 전환 기준 (경과 턴 수) */
  HOT_TURNS_THRESHOLD: 3,
  /** 강제 Cold 전환 기준 (컨텍스트 사용률) */
  FORCE_COLD_THRESHOLD: 0.7,
  /** 최대 Hot 결과 수 */
  MAX_HOT_RESULTS: 3,
} as const;

export const PROCESS_LIMITS = {
  /** 동시 실행 가능한 최대 CLI 프로세스 수 */
  MAX_CONCURRENT_CLI: 4,
  /** CLI 프로세스 기본 타임아웃 (ms) */
  CLI_TIMEOUT_MS: 120_000,
  /** Coordinator 타임아웃 (ms) */
  COORDINATOR_TIMEOUT_MS: 60_000,
  /** Implementor 타임아웃 (ms) */
  IMPLEMENTOR_TIMEOUT_MS: 90_000,
  /** Verifier 타임아웃 (ms) */
  VERIFIER_TIMEOUT_MS: 45_000,
} as const;
