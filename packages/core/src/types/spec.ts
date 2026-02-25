/**
 * Living Spec 타입 정의
 * 에이전트 간 공유되는 명세서 구조
 */

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface SpecTask {
  id: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies: string[];
  assignedTo?: string;
  files: string[];
  discoveries: string[];
  feedback: string[];
  startedAt?: number;
  completedAt?: number;
}

export interface DraftSpecTaskInput {
  id?: string;
  description: string;
  priority?: TaskPriority;
  dependencies?: string[];
  files?: string[];
}

export interface SpecConstraint {
  type: 'convention' | 'dependency' | 'compatibility' | 'performance';
  description: string;
  source?: string;
}

export interface LivingSpecData {
  id: string;
  sessionId: string;
  goal: string;
  context: string;
  tasks: SpecTask[];
  constraints: SpecConstraint[];
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'failed';
  approvedAt?: number;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface SpecUpdateEvent {
  specId: string;
  taskId?: string;
  field: string;
  previousValue: unknown;
  newValue: unknown;
  updatedBy: string;
  timestamp: number;
}
