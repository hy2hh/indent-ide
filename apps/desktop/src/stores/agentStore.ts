import { create } from 'zustand';
import type { AgentState, LivingSpecData } from '@intent-ide/core';
import type { MessageChannel } from '@intent-ide/agent-orchestrator';

export type PipelineStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface AgentEvent {
  channel: MessageChannel;
  message: { from: string; type: string; payload: Record<string, unknown>; timestamp: number };
}

interface AgentStoreState {
  pipelineStatus: PipelineStatus;
  currentSessionId: string | null;
  currentSpec: LivingSpecData | null;
  agentStates: Record<string, AgentState>;
  events: AgentEvent[];
  detectedCLIs: Record<string, boolean>;
  startPipeline: (goal: string, projectPath: string) => Promise<void>;
  approveSpec: () => Promise<void>;
  cancelPipeline: () => Promise<void>;
  detectCLIs: () => Promise<void>;
  addEvent: (event: AgentEvent) => void;
  updateSpec: (spec: LivingSpecData) => void;
}

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  pipelineStatus: 'idle',
  currentSessionId: null,
  currentSpec: null,
  agentStates: {},
  events: [],
  detectedCLIs: {},

  startPipeline: async (goal: string, projectPath: string) => {
    set({ pipelineStatus: 'running', events: [] });

    // Subscribe to agent events
    const unsubscribe = window.intentIde.agent.onAgentEvent((event: unknown) => {
      get().addEvent(event as AgentEvent);
    });

    const unsubscribeSpec = window.intentIde.agent.onSpecUpdated((spec: unknown) => {
      get().updateSpec(spec as LivingSpecData);
    });

    try {
      const { sessionId } = await window.intentIde.agent.startPipeline(goal, projectPath) as { sessionId: string };
      set({ currentSessionId: sessionId });
    } catch {
      set({ pipelineStatus: 'failed' });
      unsubscribe();
      unsubscribeSpec();
    }
  },

  approveSpec: async () => {
    const { currentSpec } = get();
    if (!currentSpec) {
      return;
    }
    await window.intentIde.agent.approveSpec(currentSpec.id);
  },

  cancelPipeline: async () => {
    const { currentSessionId } = get();
    if (!currentSessionId) {
      return;
    }
    await window.intentIde.agent.cancelPipeline(currentSessionId);
    set({ pipelineStatus: 'idle' });
  },

  detectCLIs: async () => {
    const clis = await window.intentIde.agent.getDetectedCLIs() as Record<string, boolean>;
    set({ detectedCLIs: clis });
  },

  addEvent: (event: AgentEvent) => {
    set((state) => ({
      events: [...state.events.slice(-99), event], // Keep last 100 events
    }));
  },

  updateSpec: (spec: LivingSpecData) => {
    set({ currentSpec: spec });
  },
}));
