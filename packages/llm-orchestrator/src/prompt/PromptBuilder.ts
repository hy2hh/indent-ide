import type { AgentRole, LivingSpecData, ContextWindow } from '@intent-ide/core';

export interface BuiltPrompt {
  system: string;
  user: string;
  estimatedTokens: number;
}

export interface PromptContext {
  role: AgentRole;
  goal: string;
  spec?: LivingSpecData;
  contextWindow?: ContextWindow;
  taskId?: string;
  projectRules?: string;
  outputSchema?: Record<string, unknown>;
}

/**
 * 역할별 프롬프트 빌더
 */
export class PromptBuilder {
  build(context: PromptContext): BuiltPrompt {
    const system = this.buildSystem(context);
    const user = this.buildUser(context);

    return {
      system,
      user,
      estimatedTokens: Math.ceil((system.length + user.length) / 4),
    };
  }

  private buildSystem(context: PromptContext): string {
    const base = SYSTEM_TEMPLATES[context.role];

    const parts = [base];

    if (context.projectRules) {
      parts.push(`\n## 프로젝트 규칙\n${context.projectRules}`);
    }

    if (context.outputSchema) {
      parts.push(`\n## 출력 형식\n다음 JSON 스키마로 응답하세요:\n\`\`\`json\n${JSON.stringify(context.outputSchema, null, 2)}\n\`\`\``);
    }

    return parts.join('\n');
  }

  private buildUser(context: PromptContext): string {
    const parts: string[] = [];

    if (context.spec) {
      parts.push(`## Living Spec\n\`\`\`json\n${JSON.stringify(context.spec, null, 2)}\n\`\`\``);
    }

    if (context.contextWindow && context.contextWindow.chunks.length > 0) {
      const contextParts = context.contextWindow.chunks.map((r) =>
        `### ${r.chunk.filePath} (lines ${r.chunk.startLine}-${r.chunk.endLine})\n\`\`\`${r.chunk.language}\n${r.chunk.content}\n\`\`\``
      );
      parts.push(`## 관련 코드\n${contextParts.join('\n\n')}`);
    }

    parts.push(`## 작업 목표\n${context.goal}`);

    if (context.taskId) {
      parts.push(`현재 담당 Task ID: ${context.taskId}`);
    }

    return parts.join('\n\n');
  }
}

const SYSTEM_TEMPLATES: Record<AgentRole, string> = {
  coordinator: `당신은 소프트웨어 개발 프로젝트의 코디네이터 에이전트입니다.

역할:
1. 사용자의 요청을 분석하고 구체적인 구현 계획(Living Spec)을 작성합니다.
2. 작업을 독립적인 서브태스크로 분해합니다.
3. 각 서브태스크의 의존성을 분석하여 병렬/순차 실행 순서를 결정합니다.
4. 코드베이스 컨텍스트를 활용하여 기존 패턴과 일관성을 유지합니다.

응답 방식:
- 항상 구조화된 JSON 형식으로 Living Spec을 반환합니다.
- 각 Task에는 명확한 설명, 파일 경로, 의존성을 포함합니다.
- 기존 코드에서 재활용 가능한 패턴을 발견하면 명시합니다.`,

  implementor: `당신은 소프트웨어 개발 프로젝트의 구현 에이전트입니다.

역할:
1. 할당된 Task의 코드를 정확하고 효율적으로 구현합니다.
2. Living Spec의 제약조건과 프로젝트 컨벤션을 준수합니다.
3. 구현 중 발견사항(기존 패턴, 재사용 가능한 코드)을 보고합니다.
4. 변경사항을 명확하게 설명합니다.

응답 방식:
- 생성/수정한 파일 목록을 반환합니다.
- 내린 결정사항과 이유를 설명합니다.
- 발견한 잠재적 문제나 개선점을 보고합니다.`,

  verifier: `당신은 소프트웨어 개발 프로젝트의 검증 에이전트입니다.

역할:
1. Living Spec과 실제 구현 코드를 대조하여 완성도를 검증합니다.
2. 코드 품질과 프로젝트 컨벤션 준수 여부를 확인합니다.
3. 역번역 검증: 구현 코드를 자연어로 설명하고 Spec과 비교합니다.
4. 실패 시 구체적인 피드백을 제공합니다.

응답 방식:
- passed: boolean (검증 통과 여부)
- issues: 발견된 문제 목록
- feedback: 개선이 필요한 사항
- suggestions: 선택적 개선 제안`,
};
