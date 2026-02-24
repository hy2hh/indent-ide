import type { AgentMessage, AgentStatus } from '@intent-ide/core';

export interface AgentEvent {
  id: string;
  agentId: string;
  role: string;
  status: AgentStatus;
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * 에이전트 활동 이벤트 로그
 */
export class EventLog {
  private events: AgentEvent[] = [];
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  add(event: Omit<AgentEvent, 'id'>): AgentEvent {
    const fullEvent: AgentEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...event,
    };

    this.events.push(fullEvent);
    if (this.events.length > this.maxSize) {
      this.events.shift();
    }

    return fullEvent;
  }

  fromMessage(message: AgentMessage): void {
    this.add({
      agentId: message.from,
      role: 'unknown',
      status: 'running',
      message: `[${message.type}] ${JSON.stringify(message.payload).slice(0, 200)}`,
      timestamp: message.timestamp,
      metadata: message.payload,
    });
  }

  getAll(): AgentEvent[] {
    return [...this.events];
  }

  getByAgent(agentId: string): AgentEvent[] {
    return this.events.filter((e) => e.agentId === agentId);
  }

  getByStatus(status: AgentStatus): AgentEvent[] {
    return this.events.filter((e) => e.status === status);
  }

  getRecent(count: number): AgentEvent[] {
    return this.events.slice(-count);
  }

  clear(): void {
    this.events = [];
  }

  toMarkdown(): string {
    return this.events
      .map((e) => `[${new Date(e.timestamp).toISOString()}] [${e.agentId}] ${e.message}`)
      .join('\n');
  }
}
