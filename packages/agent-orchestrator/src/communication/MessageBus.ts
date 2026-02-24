import { EventEmitter } from 'node:events';
import type { AgentMessage } from '@intent-ide/core';

export type MessageChannel =
  | 'spec:updated'
  | 'agent:started'
  | 'agent:progress'
  | 'agent:discovery'
  | 'agent:completed'
  | 'agent:failed'
  | 'verify:pass'
  | 'verify:fail'
  | 'pipeline:started'
  | 'pipeline:completed'
  | 'pipeline:failed';

export type MessageHandler = (message: AgentMessage) => void;

/**
 * 에이전트 간 통신 버스
 * EventEmitter 기반으로 채널별 메시지 발행/구독
 */
export class MessageBus extends EventEmitter {
  private messageLog: AgentMessage[] = [];
  private maxLogSize: number;

  constructor(maxLogSize = 500) {
    super();
    this.setMaxListeners(50);
    this.maxLogSize = maxLogSize;
  }

  publish(channel: MessageChannel, message: AgentMessage): void {
    this.messageLog.push(message);
    if (this.messageLog.length > this.maxLogSize) {
      this.messageLog.shift();
    }
    this.emit(channel, message);
    this.emit('*', channel, message); // Wildcard listener
  }

  subscribe(channel: MessageChannel, handler: MessageHandler): () => void {
    this.on(channel, handler);
    return () => this.off(channel, handler);
  }

  subscribeAll(handler: (channel: MessageChannel, message: AgentMessage) => void): () => void {
    const wrapper = (channel: MessageChannel, message: AgentMessage) => {
      handler(channel, message);
    };
    this.on('*', wrapper);
    return () => this.off('*', wrapper);
  }

  getLog(): AgentMessage[] {
    return [...this.messageLog];
  }

  getLogByAgent(agentId: string): AgentMessage[] {
    return this.messageLog.filter(
      (m) => m.from === agentId || m.to === agentId || m.to === 'broadcast'
    );
  }

  clear(): void {
    this.messageLog = [];
  }
}

export function createAgentMessage(
  from: string,
  to: string,
  type: AgentMessage['type'],
  payload: Record<string, unknown>
): AgentMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    from,
    to,
    type,
    payload,
    timestamp: Date.now(),
  };
}
