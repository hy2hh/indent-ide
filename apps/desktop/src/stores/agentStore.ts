import { create } from 'zustand';
import type { AgentState, LivingSpecData } from '@intent-ide/core';
import type { MessageChannel } from '@intent-ide/agent-orchestrator';

export type PipelineStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface AgentEvent {
  channel: MessageChannel;
  message: { from: string; to: string; type: string; payload: Record<string, unknown>; timestamp: number };
}

// UI에 표시할 대화 아이템
export type ConversationItemType =
  | { type: 'goal'; content: string }
  | { type: 'response'; content: string }
  | { type: 'agent-started'; agentId: string; role: string; taskId?: string }
  | { type: 'agent-progress'; agentId: string; content: string }
  | { type: 'agent-completed'; agentId: string; summary: string; files: string[] }
  | { type: 'agent-failed'; agentId: string; error: string }
  | { type: 'verify-pass'; coverage: number; summary: string }
  | { type: 'verify-fail'; issues: string[]; feedback: string[] }
  | { type: 'pipeline-completed'; summary: string }
  | { type: 'pipeline-failed'; error: string };

interface AgentStoreState {
  pipelineStatus: PipelineStatus;
  currentSessionId: string | null;
  currentSpec: LivingSpecData | null;
  agentStates: Record<string, AgentState>;
  events: AgentEvent[];
  conversationItems: ConversationItemType[];
  detectedCLIs: Record<string, boolean>;
  startPipeline: (goal: string, projectPath: string) => Promise<void>;
  approveSpec: () => Promise<void>;
  cancelPipeline: () => Promise<void>;
  detectCLIs: () => Promise<void>;
  addEvent: (event: AgentEvent) => void;
  updateSpec: (spec: LivingSpecData) => void;
  reset: () => void;
}

function eventToConversationItem(event: AgentEvent): ConversationItemType | null {
  const { channel, message } = event;
  const payload = message.payload;

  switch (channel) {
    case 'agent:started': {
      const item: ConversationItemType = {
        type: 'agent-started',
        agentId: message.from,
        role: (payload['role'] as string) ?? message.from,
      };
      const taskId = payload['taskId'];
      if (typeof taskId === 'string') {
        (item as { type: 'agent-started'; agentId: string; role: string; taskId?: string }).taskId = taskId;
      }
      return item;
    }
    case 'agent:progress':
      return {
        type: 'agent-progress',
        agentId: message.from,
        content: (payload['content'] as string) ?? (payload['message'] as string) ?? JSON.stringify(payload),
      };
    case 'agent:completed':
      return {
        type: 'agent-completed',
        agentId: message.from,
        summary: (payload['summary'] as string) ?? 'Completed',
        files: ([...(payload['filesCreated'] as string[] ?? []), ...(payload['filesModified'] as string[] ?? [])]),
      };
    case 'agent:failed':
      return {
        type: 'agent-failed',
        agentId: message.from,
        error: (payload['error'] as string) ?? 'Unknown error',
      };
    case 'verify:pass':
      return {
        type: 'verify-pass',
        coverage: (payload['specCoverage'] as number) ?? 1,
        summary: (payload['reverseTranslation'] as string) ?? 'Verification passed',
      };
    case 'verify:fail':
      return {
        type: 'verify-fail',
        issues: (payload['issues'] as { description: string }[])?.map((i) => i.description) ?? [],
        feedback: (payload['feedback'] as string[]) ?? [],
      };
    case 'pipeline:completed':
      return {
        type: 'pipeline-completed',
        summary: (payload['summary'] as string) ?? 'Pipeline completed successfully',
      };
    case 'pipeline:failed':
      return {
        type: 'pipeline-failed',
        error: (payload['error'] as string) ?? 'Pipeline failed',
      };
    default:
      return null;
  }
}

let eventUnsubscribe: (() => void) | null = null;
let specUnsubscribe: (() => void) | null = null;

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  pipelineStatus: 'idle',
  currentSessionId: null,
  currentSpec: null,
  agentStates: {},
  events: [],
  conversationItems: [],
  detectedCLIs: {},

  startPipeline: async (goal: string, projectPath: string) => {
    // 이전 구독 정리
    eventUnsubscribe?.();
    specUnsubscribe?.();

    set({
      pipelineStatus: 'running',
      events: [],
      conversationItems: [{ type: 'goal', content: goal }],
      currentSpec: null,
    });

    // agent:event 구독
    eventUnsubscribe = window.intentIde.agent.onAgentEvent((raw: unknown) => {
      const event = raw as AgentEvent;
      get().addEvent(event);

      const item = eventToConversationItem(event);
      if (item) {
        set((state) => ({ conversationItems: [...state.conversationItems, item] }));
      }

      // 파이프라인 완료/실패 처리
      if (event.channel === 'pipeline:completed') {
        set({ pipelineStatus: 'completed' });
      } else if (event.channel === 'pipeline:failed') {
        set({ pipelineStatus: 'failed' });
      }
    });

    // spec:updated 구독
    specUnsubscribe = window.intentIde.agent.onSpecUpdated((raw: unknown) => {
      const spec = raw as LivingSpecData;
      get().updateSpec(spec);
    });

    try {
      const result = await window.intentIde.agent.startPipeline(goal, projectPath) as { sessionId: string };
      set({ currentSessionId: result.sessionId });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      set((state) => ({
        pipelineStatus: 'failed',
        conversationItems: [...state.conversationItems, { type: 'pipeline-failed', error }],
      }));
      eventUnsubscribe?.();
      specUnsubscribe?.();
    }
  },

  approveSpec: async () => {
    const { currentSpec } = get();
    if (!currentSpec) {return;}
    await window.intentIde.agent.approveSpec(currentSpec.id);
  },

  cancelPipeline: async () => {
    const { currentSessionId } = get();
    if (!currentSessionId) {return;}
    await window.intentIde.agent.cancelPipeline(currentSessionId);
    set({ pipelineStatus: 'idle' });
    eventUnsubscribe?.();
    specUnsubscribe?.();
  },

  detectCLIs: async () => {
    if (typeof window === 'undefined' || !window.intentIde) {return;}
    const clis = await window.intentIde.agent.getDetectedCLIs() as Record<string, boolean>;
    set({ detectedCLIs: clis });
  },

  addEvent: (event: AgentEvent) => {
    set((state) => ({
      events: [...state.events.slice(-99), event],
    }));
  },

  updateSpec: (spec: LivingSpecData) => {
    set({ currentSpec: spec });
  },

  reset: () => {
    eventUnsubscribe?.();
    specUnsubscribe?.();
    set({
      pipelineStatus: 'idle',
      currentSessionId: null,
      currentSpec: null,
      agentStates: {},
      events: [],
      conversationItems: [],
    });
  },
}));
