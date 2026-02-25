import type { IpcMain } from 'electron';
import { AgentPipeline, MessageBus, WorktreeManager, ModelProfile, ModelAssigner, createAgentMessage } from '@intent-ide/agent-orchestrator';
import { LivingSpec } from '@intent-ide/agent-orchestrator';
import { CliRegistry, PromptBuilder, ModelRouter } from '@intent-ide/llm-orchestrator';
import { ContextWindowManager, ContextRetriever, VectorStore, EmbeddingService } from '@intent-ide/context-engine';
import { CoordinatorAgent } from '@intent-ide/agent-orchestrator';
import { ImplementorAgent } from '@intent-ide/agent-orchestrator';
import { VerifierAgent } from '@intent-ide/agent-orchestrator';
import type { CliModelProfile, DraftSpecTaskInput, LivingSpecData } from '@intent-ide/core';

interface AgentServices {
  pipeline?: AgentPipeline;
  messageBus?: MessageBus;
  worktreeManager?: WorktreeManager;
  currentSpec?: LivingSpec;
  unwatchSpec?: () => void;
}

interface UpdateDraftSpecPayload {
  tasks: DraftSpecTaskInput[];
}

const services: AgentServices = {};
let cliRegistry: CliRegistry | null = null;
let detectedCLIs: Map<string, boolean> | null = null;

export function setupAgentIpc(ipcMain: IpcMain): void {
  ipcMain.handle('agent:getDetectedCLIs', async () => {
    if (!cliRegistry) {
      cliRegistry = new CliRegistry();
    }
    detectedCLIs = await cliRegistry.detectInstalled();
    return Object.fromEntries(detectedCLIs);
  });

  ipcMain.handle(
    'agent:startPipeline',
    async (event, goal: string, projectPath: string) => {
      services.unwatchSpec?.();
      services.unwatchSpec = undefined;
      services.currentSpec = undefined;

      const registry = cliRegistry ?? new CliRegistry();
      if (!detectedCLIs) {
        detectedCLIs = await registry.detectInstalled();
      }

      const modelProfile = new ModelProfile();
      void new ModelAssigner(modelProfile, registry);
      const modelRouter = new ModelRouter(registry);
      const promptBuilder = new PromptBuilder();
      const messageBus = new MessageBus();
      const worktreeManager = new WorktreeManager(projectPath);
      await worktreeManager.initialize();

      const vectorStore = new VectorStore({ storagePath: `${projectPath}/.intent-ide/vectors` });
      await vectorStore.initialize();
      const embeddingService = new EmbeddingService({ provider: 'hash' });
      const contextRetriever = new ContextRetriever(vectorStore, embeddingService);
      const contextWindowManager = new ContextWindowManager(contextRetriever);

      // 모든 에이전트 이벤트를 renderer로 전달
      messageBus.subscribeAll((channel, message) => {
        event.sender.send('agent:event', { channel, message });

        // spec:updated → renderer에 spec 데이터 별도 전달
        if (channel === 'spec:updated' && message.payload['spec']) {
          event.sender.send('agent:specUpdated', message.payload['spec']);
        }
      });

      const coordinator = new CoordinatorAgent({
        id: 'coordinator',
        role: 'coordinator',
        messageBus,
        promptBuilder,
        modelRouter,
        contextWindowManager,
      });

      const verifier = new VerifierAgent({
        id: 'verifier',
        role: 'verifier',
        messageBus,
        promptBuilder,
        modelRouter,
        contextWindowManager,
      });

      const sessionId = `session-${Date.now()}`;

      const pipeline = new AgentPipeline({
        coordinator,
        verifier,
        worktreeManager,
        messageBus,
        maxRetries: 2,
        createImplementor: (taskId) =>
          new ImplementorAgent({
            id: `implementor-${taskId}`,
            role: 'implementor',
            messageBus,
            promptBuilder,
            modelRouter,
            contextWindowManager,
            worktreeManager,
            taskId,
          }),
        onSpecCreated: (spec) => {
          services.unwatchSpec?.();
          services.currentSpec = spec;

          const handleSpecUpdated = (specData: LivingSpecData) => {
            messageBus.publish(
              'spec:updated',
              createAgentMessage('spec', 'broadcast', 'status', { spec: specData })
            );
          };

          spec.on('spec:updated', handleSpecUpdated);
          services.unwatchSpec = () => {
            spec.off('spec:updated', handleSpecUpdated);
          };

          handleSpecUpdated(spec.getData());
        },
      });

      services.pipeline = pipeline;
      services.messageBus = messageBus;
      services.worktreeManager = worktreeManager;

      pipeline.run(sessionId, goal, projectPath).then((result) => {
        event.sender.send('agent:pipelineComplete', result);
      }).catch((err: Error) => {
        event.sender.send('agent:pipelineError', { error: err.message });
      });

      return { sessionId };
    }
  );

  ipcMain.handle('agent:cancelPipeline', async () => {
    // TODO: cancellation
    return true;
  });

  ipcMain.handle('agent:approveSpec', async () => {
    if (services.currentSpec) {
      services.currentSpec.approve('user');
    }
    return { approved: true };
  });

  ipcMain.handle('agent:updateSpecDraft', async (_, payload: UpdateDraftSpecPayload) => {
    const spec = services.currentSpec;
    if (!spec) {
      return { success: false, error: 'No active spec to edit.' };
    }

    const specData = spec.getData();
    if (specData.status !== 'draft') {
      return { success: false, error: 'Spec is no longer editable.' };
    }

    const existingById = new Map(specData.tasks.map((task) => [task.id, task]));
    const nextTasks = (payload.tasks ?? []).map((task, index): DraftSpecTaskInput => {
      const existing = task.id ? existingById.get(task.id) : undefined;
      const fallbackId = existing?.id ?? `task-${index + 1}`;

      return {
        id: task.id ?? fallbackId,
        description: task.description,
        priority: task.priority ?? existing?.priority ?? 'medium',
        dependencies: task.dependencies ?? existing?.dependencies ?? [],
        files: task.files ?? existing?.files ?? [],
      };
    });

    const updated = spec.setDraftTasks(nextTasks, 'user');
    if (!updated) {
      return { success: false, error: 'Failed to update draft tasks.' };
    }

    return { success: true, spec: spec.getData() };
  });

  ipcMain.handle(
    'agent:updateModelProfile',
    async (_, role: string, profile: CliModelProfile) => {
      return { role, profile };
    }
  );
}
