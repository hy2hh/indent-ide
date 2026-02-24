import type {
  AgentRole,
  AgentStatus,
  AgentState,
  AgentResult,
  AgentMessage,
} from '@intent-ide/core';
import type { MessageBus } from '../communication/MessageBus.js';
import type { LivingSpec } from '../spec/LivingSpec.js';
import { createAgentMessage } from '../communication/MessageBus.js';

export interface BaseAgentOptions {
  id: string;
  role: AgentRole;
  messageBus: MessageBus;
}

/**
 * 에이전트 공통 인터페이스
 */
export abstract class BaseAgent {
  readonly id: string;
  readonly role: AgentRole;
  protected messageBus: MessageBus;
  protected state: AgentState;

  constructor(options: BaseAgentOptions) {
    this.id = options.id;
    this.role = options.role;
    this.messageBus = options.messageBus;
    this.state = {
      id: options.id,
      role: options.role,
      status: 'idle',
      progress: 0,
      discoveries: [],
    };
  }

  abstract execute(spec: LivingSpec, taskId?: string): Promise<AgentResult>;

  getState(): AgentState {
    return { ...this.state };
  }

  protected setStatus(status: AgentStatus, message?: string): void {
    this.state.status = status;
    if (status === 'running' && !this.state.startedAt) {
      this.state.startedAt = Date.now();
    } else if (status === 'completed' || status === 'failed') {
      this.state.completedAt = Date.now();
    }
    if (message) {
      this.state.errorMessage = message;
    }

    const channel = status === 'running'
      ? 'agent:started'
      : status === 'completed'
        ? 'agent:completed'
        : status === 'failed'
          ? 'agent:failed'
          : 'agent:progress';

    this.messageBus.publish(channel, this.createMessage('status', { status, message }));
  }

  protected setProgress(progress: number): void {
    this.state.progress = Math.min(100, Math.max(0, progress));
    this.messageBus.publish(
      'agent:progress',
      this.createMessage('status', { progress: this.state.progress })
    );
  }

  protected reportDiscovery(discovery: string, spec: LivingSpec, taskId?: string): void {
    this.state.discoveries.push(discovery);

    if (taskId) {
      spec.addDiscovery(taskId, discovery, this.id);
    }

    this.messageBus.publish(
      'agent:discovery',
      this.createMessage('discovery', { discovery, taskId })
    );
  }

  protected createMessage(
    type: AgentMessage['type'],
    payload: Record<string, unknown>
  ): AgentMessage {
    return createAgentMessage(this.id, 'broadcast', type, {
      agentId: this.id,
      role: this.role,
      ...payload,
    });
  }

  cancel(): void {
    this.setStatus('cancelled');
  }
}
