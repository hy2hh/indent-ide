import { create } from 'zustand';
import type { AgentState, DraftSpecTaskInput, FileTreeNode, LivingSpecData } from '@intent-ide/core';
import type { MessageChannel } from '@intent-ide/agent-orchestrator';

export type PipelineStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface AgentEvent {
  channel: MessageChannel;
  message: { from: string; to: string; type: string; payload: Record<string, unknown>; timestamp: number };
}

interface CheckpointPayload {
  version: 1;
  createdAt: number;
  name?: string;
  pipelineStatus: PipelineStatus;
  currentSessionId: string | null;
  currentSpec: LivingSpecData | null;
  events: AgentEvent[];
  conversationItems: ConversationItemType[];
}

export interface CheckpointSummary {
  filePath: string;
  fileName: string;
  name: string;
  createdAt: number;
  pipelineStatus: PipelineStatus;
  goal: string;
  taskCount: number;
}

export interface CheckpointResult {
  success: boolean;
  filePath?: string;
  message?: string;
  error?: string;
}

interface CheckpointComparableState {
  pipelineStatus: PipelineStatus;
  goal: string;
  specStatus: LivingSpecData['status'] | null;
  specVersion: number | null;
  taskCount: number;
  eventCount: number;
  conversationCount: number;
}

export interface CheckpointTaskChange {
  id: string;
  description: string;
  change: 'added' | 'removed' | 'updated';
  fields: string[];
}

export interface CheckpointPreview {
  filePath: string;
  fileName: string;
  name: string;
  createdAt: number;
  current: CheckpointComparableState;
  checkpoint: CheckpointComparableState;
  diff: {
    goalChanged: boolean;
    pipelineStatusChanged: boolean;
    specStatusChanged: boolean;
    specVersionDelta: number;
    taskCountDelta: number;
    eventCountDelta: number;
    conversationCountDelta: number;
    changedTaskCount: number;
    taskChanges: CheckpointTaskChange[];
  };
}

export interface CheckpointPreviewResult {
  success: boolean;
  preview?: CheckpointPreview;
  error?: string;
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
  activeProjectPath: string | null;
  currentSessionId: string | null;
  currentSpec: LivingSpecData | null;
  checkpoints: CheckpointSummary[];
  agentStates: Record<string, AgentState>;
  events: AgentEvent[];
  conversationItems: ConversationItemType[];
  queuedGoals: string[];
  isQueuePaused: boolean;
  detectedCLIs: Record<string, boolean>;
  enqueueGoal: (goal: string) => void;
  removeQueuedGoal: (index: number) => void;
  clearQueuedGoals: () => void;
  setQueuePaused: (paused: boolean) => void;
  toggleQueuePaused: () => void;
  startPipeline: (goal: string, projectPath: string) => Promise<void>;
  approveSpec: () => Promise<void>;
  updateSpecDraft: (tasks: DraftSpecTaskInput[]) => Promise<boolean>;
  createCheckpoint: (projectPath: string, label?: string) => Promise<CheckpointResult>;
  loadCheckpoints: (projectPath: string) => Promise<CheckpointResult>;
  renameCheckpoint: (projectPath: string, filePath: string, name: string) => Promise<CheckpointResult>;
  getCheckpointPreview: (projectPath: string, filePath: string) => Promise<CheckpointPreviewResult>;
  restoreCheckpoint: (projectPath: string, filePath: string) => Promise<CheckpointResult>;
  restoreLatestCheckpoint: (projectPath: string) => Promise<CheckpointResult>;
  deleteCheckpoint: (projectPath: string, filePath: string) => Promise<CheckpointResult>;
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

function sanitizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/g, '');
}

function isPathInside(targetPath: string, basePath: string): boolean {
  const normalizedTarget = normalizePath(targetPath);
  const normalizedBase = normalizePath(basePath);
  return normalizedTarget === normalizedBase || normalizedTarget.startsWith(`${normalizedBase}/`);
}

function normalizeCheckpointName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 80) : null;
}

function buildCheckpointFileName(createdAt: number, name: string, attempt: number): string {
  const timestamp = new Date(createdAt).toISOString().replace(/[:.]/g, '-');
  const slug = sanitizeLabel(name) || 'snapshot';
  const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
  return `checkpoint-${timestamp}-${slug}${suffix}.json`;
}

function getCheckpointFiles(nodes: FileTreeNode[]): string[] {
  return nodes
    .filter((node) => node.type === 'file' && node.path.endsWith('.json'))
    .map((node) => node.path);
}

function normalizePipelineStatus(value: unknown): PipelineStatus {
  if (value === 'running' || value === 'completed' || value === 'failed') {
    return value;
  }
  return 'idle';
}

function getGoalFromConversation(items: unknown[]): string | null {
  for (const item of items) {
    if (
      item &&
      typeof item === 'object' &&
      (item as { type?: string }).type === 'goal' &&
      typeof (item as { content?: unknown }).content === 'string'
    ) {
      return (item as { content: string }).content;
    }
  }
  return null;
}

function getCheckpointGoal(payload: Partial<CheckpointPayload>): string {
  const specGoal = payload.currentSpec?.goal;
  const goalFromItems =
    Array.isArray(payload.conversationItems) ? getGoalFromConversation(payload.conversationItems) : null;
  return (typeof specGoal === 'string' && specGoal.trim()) || goalFromItems || '(no goal)';
}

function getCheckpointTaskCount(payload: Partial<CheckpointPayload>): number {
  return payload.currentSpec && Array.isArray(payload.currentSpec.tasks) ? payload.currentSpec.tasks.length : 0;
}

function toComparableState(payload: Partial<CheckpointPayload>): CheckpointComparableState {
  return {
    pipelineStatus: normalizePipelineStatus(payload.pipelineStatus),
    goal: getCheckpointGoal(payload),
    specStatus: payload.currentSpec?.status ?? null,
    specVersion: typeof payload.currentSpec?.version === 'number' ? payload.currentSpec.version : null,
    taskCount: getCheckpointTaskCount(payload),
    eventCount: Array.isArray(payload.events) ? payload.events.length : 0,
    conversationCount: Array.isArray(payload.conversationItems) ? payload.conversationItems.length : 0,
  };
}

function collectTaskChanges(
  currentSpec: LivingSpecData | null | undefined,
  checkpointSpec: LivingSpecData | null | undefined,
): CheckpointTaskChange[] {
  const currentById = new Map((currentSpec?.tasks ?? []).map((task) => [task.id, task]));
  const checkpointById = new Map((checkpointSpec?.tasks ?? []).map((task) => [task.id, task]));

  const allIds = new Set<string>([...currentById.keys(), ...checkpointById.keys()]);
  const changes: CheckpointTaskChange[] = [];

  for (const id of [...allIds].sort()) {
    const currentTask = currentById.get(id);
    const checkpointTask = checkpointById.get(id);

    if (!currentTask && checkpointTask) {
      changes.push({
        id,
        description: checkpointTask.description,
        change: 'added',
        fields: ['new task'],
      });
      continue;
    }

    if (currentTask && !checkpointTask) {
      changes.push({
        id,
        description: currentTask.description,
        change: 'removed',
        fields: ['removed task'],
      });
      continue;
    }

    if (!currentTask || !checkpointTask) {
      continue;
    }

    const fields: string[] = [];
    if (currentTask.description !== checkpointTask.description) {
      fields.push('description');
    }
    if (currentTask.status !== checkpointTask.status) {
      fields.push('status');
    }
    if (currentTask.priority !== checkpointTask.priority) {
      fields.push('priority');
    }
    if ((currentTask.dependencies ?? []).join('|') !== (checkpointTask.dependencies ?? []).join('|')) {
      fields.push('dependencies');
    }
    if ((currentTask.files ?? []).join('|') !== (checkpointTask.files ?? []).join('|')) {
      fields.push('files');
    }

    if (fields.length > 0) {
      changes.push({
        id,
        description: checkpointTask.description,
        change: 'updated',
        fields,
      });
    }
  }

  return changes;
}

function toCheckpointSummary(filePath: string, payload: Partial<CheckpointPayload>): CheckpointSummary {
  const fallbackCreatedAt = Date.now();
  const createdAt = typeof payload.createdAt === 'number' ? payload.createdAt : fallbackCreatedAt;
  const pipelineStatus = normalizePipelineStatus(payload.pipelineStatus);
  const goal = getCheckpointGoal(payload);
  const taskCount = getCheckpointTaskCount(payload);
  const name = normalizeCheckpointName(payload.name) ?? goal;

  return {
    filePath,
    fileName: filePath.split('/').pop() ?? filePath,
    name,
    createdAt,
    pipelineStatus,
    goal,
    taskCount,
  };
}

export const useAgentStore = create<AgentStoreState>((set, get) => {
  const getCheckpointDir = (projectPath: string) => `${projectPath}/.intent-ide/checkpoints`;

  const toCheckpointPayload = (state: Pick<AgentStoreState,
    'pipelineStatus' | 'currentSessionId' | 'currentSpec' | 'events' | 'conversationItems'>, createdAt: number, name?: string,
  ): CheckpointPayload => ({
    version: 1,
    createdAt,
    name: normalizeCheckpointName(name) ?? undefined,
    pipelineStatus: state.pipelineStatus,
    currentSessionId: state.currentSessionId,
    currentSpec: state.currentSpec,
    events: state.events,
    conversationItems: state.conversationItems,
  });

  const validateCheckpointFilePath = (projectPath: string, filePath: string):
  | { success: true; checkpointDir: string; normalizedFilePath: string }
  | { success: false; error: string } => {
    const checkpointDir = getCheckpointDir(projectPath);
    if (!isPathInside(filePath, checkpointDir)) {
      return { success: false, error: 'Invalid checkpoint file path.' };
    }
    return {
      success: true,
      checkpointDir,
      normalizedFilePath: normalizePath(filePath),
    };
  };

  const readCheckpointPayload = async (filePath: string): Promise<Partial<CheckpointPayload>> => {
    const content = await window.intentIde.fs.readFile(filePath) as string;
    return JSON.parse(content) as Partial<CheckpointPayload>;
  };

  const loadCheckpointSummaries = async (projectPath: string): Promise<CheckpointSummary[]> => {
    const checkpointDir = getCheckpointDir(projectPath);
    await window.intentIde.fs.ensureDir(checkpointDir);

    const tree = await window.intentIde.fs.readDir(checkpointDir) as FileTreeNode[];
    const files = getCheckpointFiles(tree);
    const summaries: CheckpointSummary[] = [];

    for (const filePath of files) {
      try {
        const payload = await readCheckpointPayload(filePath);
        summaries.push(toCheckpointSummary(filePath, payload));
      } catch {
        // Skip unreadable or invalid checkpoint files
      }
    }

    return summaries.sort((a, b) => {
      if (a.createdAt !== b.createdAt) {
        return b.createdAt - a.createdAt;
      }
      return b.fileName.localeCompare(a.fileName);
    });
  };

  const restoreFromCheckpointFile = async (filePath: string): Promise<CheckpointResult> => {
    try {
      const payload = await readCheckpointPayload(filePath);
      if (!Array.isArray(payload.conversationItems) || !Array.isArray(payload.events)) {
        return { success: false, error: 'Invalid checkpoint format.' };
      }

      eventUnsubscribe?.();
      specUnsubscribe?.();

      const restoredPipelineStatus =
        payload.pipelineStatus === 'running'
          ? 'idle'
          : normalizePipelineStatus(payload.pipelineStatus);

      set({
        pipelineStatus: restoredPipelineStatus,
        currentSessionId: payload.currentSessionId ?? null,
        currentSpec: payload.currentSpec ?? null,
        events: payload.events.slice(-100),
        conversationItems: payload.conversationItems,
      });

      return { success: true, filePath, message: 'Checkpoint restored.' };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  };

  return ({
  pipelineStatus: 'idle',
  activeProjectPath: null,
  currentSessionId: null,
  currentSpec: null,
  checkpoints: [],
  agentStates: {},
  events: [],
  conversationItems: [],
  queuedGoals: [],
  isQueuePaused: false,
  detectedCLIs: {},

  enqueueGoal: (goal: string) => {
    const normalizedGoal = goal.trim();
    if (!normalizedGoal) {
      return;
    }
    set((state) => ({
      queuedGoals: [...state.queuedGoals, normalizedGoal].slice(0, 30),
    }));
  },

  removeQueuedGoal: (index: number) => {
    set((state) => ({
      queuedGoals: state.queuedGoals.filter((_, idx) => idx !== index),
    }));
  },

  clearQueuedGoals: () => {
    set({ queuedGoals: [] });
  },

  setQueuePaused: (paused: boolean) => {
    set({ isQueuePaused: paused });
  },

  toggleQueuePaused: () => {
    set((state) => ({ isQueuePaused: !state.isQueuePaused }));
  },

  startPipeline: async (goal: string, projectPath: string) => {
    const normalizedGoal = goal.trim();
    if (!normalizedGoal) {
      return;
    }

    const snapshot = get();
    if (snapshot.pipelineStatus === 'running') {
      snapshot.enqueueGoal(normalizedGoal);
      return;
    }

    // 이전 구독 정리
    eventUnsubscribe?.();
    specUnsubscribe?.();

    set({
      pipelineStatus: 'running',
      activeProjectPath: projectPath,
      events: [],
      conversationItems: [{ type: 'goal', content: normalizedGoal }],
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
      let shouldStartQueuedGoal = false;
      if (event.channel === 'pipeline:completed') {
        set({ pipelineStatus: 'completed' });
        shouldStartQueuedGoal = true;
      } else if (event.channel === 'pipeline:failed') {
        set({ pipelineStatus: 'failed' });
        shouldStartQueuedGoal = true;
      }

      if (shouldStartQueuedGoal) {
        const latest = get();
        if (!latest.isQueuePaused && latest.queuedGoals.length > 0 && latest.activeProjectPath) {
          const [nextGoal, ...rest] = latest.queuedGoals;
          if (nextGoal) {
            set({ queuedGoals: rest });
            window.setTimeout(() => {
              void get().startPipeline(nextGoal, latest.activeProjectPath as string);
            }, 0);
          }
        }
      }
    });

    // spec:updated 구독
    specUnsubscribe = window.intentIde.agent.onSpecUpdated((raw: unknown) => {
      const spec = raw as LivingSpecData;
      get().updateSpec(spec);
    });

    try {
      const result = await window.intentIde.agent.startPipeline(normalizedGoal, projectPath) as { sessionId: string };
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

  updateSpecDraft: async (tasks) => {
    const result = await window.intentIde.agent.updateSpecDraft({ tasks }) as {
      success: boolean;
      error?: string;
      spec?: LivingSpecData;
    };

    if (result.success && result.spec) {
      set({ currentSpec: result.spec });
      return true;
    }

    return false;
  },

  createCheckpoint: async (projectPath, label) => {
    if (!projectPath) {
      return { success: false, error: 'Project path is required.' };
    }

    try {
      const checkpointDir = getCheckpointDir(projectPath);
      await window.intentIde.fs.ensureDir(checkpointDir);

      const snapshot = get();
      const normalizedLabel = normalizeCheckpointName(label) ?? 'session';
      const createdAt = Date.now();
      const payload = toCheckpointPayload(snapshot, createdAt, normalizedLabel);

      const fileName = buildCheckpointFileName(createdAt, normalizedLabel, 0);
      const filePath = `${checkpointDir}/${fileName}`;
      await window.intentIde.fs.writeFile(filePath, JSON.stringify(payload, null, 2));

      await get().loadCheckpoints(projectPath);
      return { success: true, filePath, message: 'Checkpoint saved.' };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  },

  loadCheckpoints: async (projectPath) => {
    if (!projectPath) {
      return { success: false, error: 'Project path is required.' };
    }

    try {
      const checkpoints = await loadCheckpointSummaries(projectPath);
      set({ checkpoints });
      return { success: true, message: `Loaded ${checkpoints.length} checkpoint(s).` };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  },

  renameCheckpoint: async (projectPath, filePath, name) => {
    if (!projectPath || !filePath) {
      return { success: false, error: 'Project path and checkpoint file are required.' };
    }

    const normalizedName = normalizeCheckpointName(name);
    if (!normalizedName) {
      return { success: false, error: 'Checkpoint name is required.' };
    }

    const validated = validateCheckpointFilePath(projectPath, filePath);
    if (!validated.success) {
      return validated;
    }

    try {
      const payload = await readCheckpointPayload(filePath);
      const createdAt = typeof payload.createdAt === 'number' ? payload.createdAt : Date.now();
      payload.name = normalizedName;

      let renamedPath = filePath;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const candidatePath = `${validated.checkpointDir}/${buildCheckpointFileName(createdAt, normalizedName, attempt)}`;
        if (normalizePath(candidatePath) === validated.normalizedFilePath) {
          renamedPath = filePath;
          break;
        }

        try {
          await window.intentIde.fs.readFile(candidatePath);
        } catch {
          await window.intentIde.fs.renameFile(filePath, candidatePath);
          renamedPath = candidatePath;
          break;
        }
      }

      await window.intentIde.fs.writeFile(renamedPath, JSON.stringify(payload, null, 2));
      await get().loadCheckpoints(projectPath);
      return { success: true, filePath: renamedPath, message: 'Checkpoint renamed.' };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  },

  getCheckpointPreview: async (projectPath, filePath) => {
    if (!projectPath || !filePath) {
      return { success: false, error: 'Project path and checkpoint file are required.' };
    }

    const validated = validateCheckpointFilePath(projectPath, filePath);
    if (!validated.success) {
      return validated;
    }

    try {
      const payload = await readCheckpointPayload(filePath);
      const summary = toCheckpointSummary(filePath, payload);
      const currentSnapshot = get();
      const currentPayload = toCheckpointPayload(currentSnapshot, Date.now());
      const currentState = toComparableState(currentPayload);
      const checkpointState = toComparableState(payload);
      const taskChanges = collectTaskChanges(currentSnapshot.currentSpec, payload.currentSpec);

      const preview: CheckpointPreview = {
        filePath,
        fileName: summary.fileName,
        name: summary.name,
        createdAt: summary.createdAt,
        current: currentState,
        checkpoint: checkpointState,
        diff: {
          goalChanged: currentState.goal !== checkpointState.goal,
          pipelineStatusChanged: currentState.pipelineStatus !== checkpointState.pipelineStatus,
          specStatusChanged: currentState.specStatus !== checkpointState.specStatus,
          specVersionDelta: (checkpointState.specVersion ?? 0) - (currentState.specVersion ?? 0),
          taskCountDelta: checkpointState.taskCount - currentState.taskCount,
          eventCountDelta: checkpointState.eventCount - currentState.eventCount,
          conversationCountDelta: checkpointState.conversationCount - currentState.conversationCount,
          changedTaskCount: taskChanges.length,
          taskChanges: taskChanges.slice(0, 30),
        },
      };

      return { success: true, preview };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  },

  restoreCheckpoint: async (projectPath, filePath) => {
    if (!projectPath || !filePath) {
      return { success: false, error: 'Project path and checkpoint file are required.' };
    }

    const validated = validateCheckpointFilePath(projectPath, filePath);
    if (!validated.success) {
      return validated;
    }

    const result = await restoreFromCheckpointFile(filePath);
    if (result.success) {
      await get().loadCheckpoints(projectPath);
    }
    return result;
  },

  restoreLatestCheckpoint: async (projectPath) => {
    const loaded = await get().loadCheckpoints(projectPath);
    if (!loaded.success) {
      return loaded;
    }

    const latest = get().checkpoints[0];
    if (!latest) {
      return { success: false, error: 'No checkpoint found.' };
    }

    return get().restoreCheckpoint(projectPath, latest.filePath);
  },

  deleteCheckpoint: async (projectPath, filePath) => {
    if (!projectPath || !filePath) {
      return { success: false, error: 'Project path and checkpoint file are required.' };
    }

    const validated = validateCheckpointFilePath(projectPath, filePath);
    if (!validated.success) {
      return validated;
    }

    try {
      await window.intentIde.fs.deleteFile(filePath);
      await get().loadCheckpoints(projectPath);
      return { success: true, filePath, message: 'Checkpoint deleted.' };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  },

  cancelPipeline: async () => {
    const { currentSessionId } = get();
    if (!currentSessionId) {return;}
    await window.intentIde.agent.cancelPipeline(currentSessionId);
    set({ pipelineStatus: 'idle', currentSessionId: null });
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
      activeProjectPath: null,
      currentSessionId: null,
      currentSpec: null,
      agentStates: {},
      events: [],
      conversationItems: [],
      queuedGoals: [],
      isQueuePaused: false,
    });
  },
  });
});
