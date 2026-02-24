import type { IpcMain } from 'electron';
import { AgentPipeline, MessageBus, WorktreeManager, ModelProfile, ModelAssigner } from '@intent-ide/agent-orchestrator';
import { CliRegistry, PromptBuilder, ModelRouter } from '@intent-ide/llm-orchestrator';
import { ContextWindowManager, ContextRetriever, VectorStore, EmbeddingService } from '@intent-ide/context-engine';
import { CoordinatorAgent } from '@intent-ide/agent-orchestrator';
import { ImplementorAgent } from '@intent-ide/agent-orchestrator';
import { VerifierAgent } from '@intent-ide/agent-orchestrator';
import type { CliModelProfile } from '@intent-ide/core';

interface AgentServices {
  pipeline?: AgentPipeline;
  messageBus?: MessageBus;
  worktreeManager?: WorktreeManager;
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
      // Initialize services
      const registry = cliRegistry ?? new CliRegistry();
      if (!detectedCLIs) {
        detectedCLIs = await registry.detectInstalled();
      }

      const modelProfile = new ModelProfile();
      const assigner = new ModelAssigner(modelProfile, registry);
      const modelRouter = new ModelRouter(registry);
      const promptBuilder = new PromptBuilder();
      const messageBus = new MessageBus();
      const worktreeManager = new WorktreeManager(projectPath);
      await worktreeManager.initialize();

      // Initialize context engine
      const vectorStore = new VectorStore({ storagePath: `${projectPath}/.intent-ide/vectors` });
      await vectorStore.initialize();
      const embeddingService = new EmbeddingService({ provider: 'hash' });
      const contextRetriever = new ContextRetriever(vectorStore, embeddingService);
      const contextWindowManager = new ContextWindowManager(contextRetriever);

      // Subscribe to agent events and forward to renderer
      messageBus.subscribeAll((channel, message) => {
        event.sender.send('agent:event', { channel, message });
      });

      // Create coordinator
      const coordinator = new CoordinatorAgent({
        id: 'coordinator',
        role: 'coordinator',
        messageBus,
        promptBuilder,
        modelRouter,
        contextWindowManager,
      });

      // Create verifier
      const verifier = new VerifierAgent({
        id: 'verifier',
        role: 'verifier',
        messageBus,
        promptBuilder,
        modelRouter,
        contextWindowManager,
      });

      const sessionId = `session-${Date.now()}`;

      // Create pipeline
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
      });

      services.pipeline = pipeline;
      services.messageBus = messageBus;
      services.worktreeManager = worktreeManager;

      // Run pipeline (non-blocking)
      pipeline.run(sessionId, goal, projectPath).then((result) => {
        event.sender.send('agent:pipelineComplete', result);
      }).catch((err: Error) => {
        event.sender.send('agent:pipelineError', { error: err.message });
      });

      return { sessionId };
    }
  );

  ipcMain.handle('agent:cancelPipeline', async () => {
    // TODO: Implement cancellation
    return true;
  });

  ipcMain.handle('agent:approveSpec', async (_, specId: string) => {
    // Spec approval is handled by the LivingSpec event system
    return { specId, approved: true };
  });

  ipcMain.handle(
    'agent:updateModelProfile',
    async (_, role: string, profile: CliModelProfile) => {
      // Update model profile for future runs
      return { role, profile };
    }
  );
}
