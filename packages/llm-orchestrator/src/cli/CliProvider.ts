import type { CliOptions, CliResponse, StreamChunk, CliProviderName } from '@intent-ide/core';

/**
 * CLI 프로바이더 공통 인터페이스
 * 새로운 CLI 도구 추가 시 이 인터페이스를 구현
 */
export interface CliProvider {
  /** 프로바이더 식별자 */
  readonly name: CliProviderName | string;
  /** CLI 실행 명령어 */
  readonly command: string;

  /**
   * CLI를 실행하고 전체 응답 반환
   */
  execute(prompt: string, options?: CliOptions): Promise<CliResponse>;

  /**
   * CLI를 실행하고 스트리밍 응답 반환
   */
  stream(prompt: string, options?: CliOptions): AsyncIterable<StreamChunk>;

  /**
   * CLI가 로컬에 설치되어 있는지 확인
   */
  isAvailable(): Promise<boolean>;
}
