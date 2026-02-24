import type { ClassifiedIntent } from './IntentClassifier.js';

export interface PlannedAction {
  type: 'create_file' | 'modify_file' | 'delete_file' | 'run_command' | 'search_code';
  target?: string;
  description: string;
  priority: number;
}

export interface ActionPlan {
  intent: ClassifiedIntent;
  actions: PlannedAction[];
  requiresMultipleAgents: boolean;
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export class ActionPlanner {
  plan(intent: ClassifiedIntent): ActionPlan {
    const actions: PlannedAction[] = [];
    const requiresMultipleAgents =
      intent.type === 'complex_edit' || intent.type === 'new_feature';

    actions.push({
      type: 'search_code',
      description: `관련 코드 검색: ${intent.rawText}`,
      priority: 1,
    });

    if (intent.type !== 'question') {
      actions.push({
        type: 'modify_file',
        description: '요청된 변경사항 적용',
        priority: 2,
      });
    }

    const complexity: 'low' | 'medium' | 'high' =
      intent.type === 'simple_edit' || intent.type === 'question'
        ? 'low'
        : intent.type === 'new_feature' || intent.type === 'complex_edit'
          ? 'high'
          : 'medium';

    return {
      intent,
      actions,
      requiresMultipleAgents,
      estimatedComplexity: complexity,
    };
  }
}
