/**
 * Manus 구조화된 출력 스키마
 * Coordinator가 각 Implementor에 출력 스키마 지정
 * Implementor는 스키마에 맞게 JSON 반환
 */

export interface ImplementorOutput {
  filesCreated: string[];
  filesModified: string[];
  dependencies: string[];
  decisions: string[];
  discoveries: string[];
  testsPassed: boolean;
  summary: string;
}

export interface VerifierOutput {
  passed: boolean;
  issues: VerifierIssue[];
  feedback: string[];
  suggestions: string[];
  reverseTranslation: string;
  specCoverage: number;
}

export interface VerifierIssue {
  type: 'missing_feature' | 'convention_violation' | 'logic_error' | 'incomplete';
  taskId: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  location?: string;
}

export interface CoordinatorOutput {
  specId: string;
  goal: string;
  tasks: CoordinatorTask[];
  constraints: string[];
  dependencies: Record<string, string[]>;
  waveOrder: string[][];
}

export interface CoordinatorTask {
  id: string;
  description: string;
  targetFiles: string[];
  requiredContext: string[];
  expectedOutputs: string[];
  priority: 'high' | 'medium' | 'low';
}

// JSON 스키마 형식으로 출력 스키마 정의
export const IMPLEMENTOR_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    filesCreated: { type: 'array', items: { type: 'string' }, description: '생성한 파일 경로' },
    filesModified: { type: 'array', items: { type: 'string' }, description: '수정한 파일 경로' },
    dependencies: { type: 'array', items: { type: 'string' }, description: '추가한 의존성' },
    decisions: { type: 'array', items: { type: 'string' }, description: '내린 결정사항' },
    discoveries: { type: 'array', items: { type: 'string' }, description: '발견사항' },
    testsPassed: { type: 'boolean', description: '테스트 통과 여부' },
    summary: { type: 'string', description: '작업 요약 (1-2문장)' },
  },
  required: ['filesCreated', 'filesModified', 'decisions', 'testsPassed', 'summary'],
} as const;

export const VERIFIER_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    passed: { type: 'boolean', description: '검증 통과 여부' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          taskId: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string' },
        },
      },
    },
    feedback: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } },
    reverseTranslation: { type: 'string', description: '구현을 자연어로 설명' },
    specCoverage: { type: 'number', description: 'Spec 충족률 (0-1)' },
  },
  required: ['passed', 'issues', 'feedback', 'reverseTranslation', 'specCoverage'],
} as const;
