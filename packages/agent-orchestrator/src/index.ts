// Agents
export { BaseAgent } from './agents/BaseAgent.js';
export { CoordinatorAgent } from './agents/CoordinatorAgent.js';
export { ImplementorAgent } from './agents/ImplementorAgent.js';
export { VerifierAgent } from './agents/VerifierAgent.js';
export type { BaseAgentOptions } from './agents/BaseAgent.js';

// Spec
export { LivingSpec } from './spec/LivingSpec.js';
export { SpecDiff } from './spec/SpecDiff.js';
export type { SpecChange } from './spec/SpecDiff.js';

// Pipeline
export { AgentPipeline } from './pipeline/AgentPipeline.js';
export { TaskDecomposer } from './pipeline/TaskDecomposer.js';
export type { PipelineOptions, PipelineResult } from './pipeline/AgentPipeline.js';
export type { TaskWave } from './pipeline/TaskDecomposer.js';

// Communication
export { MessageBus, createAgentMessage } from './communication/MessageBus.js';
export { EventLog } from './communication/EventLog.js';
export type { MessageChannel, MessageHandler } from './communication/MessageBus.js';
export type {
  ImplementorOutput,
  VerifierOutput,
  CoordinatorOutput,
  VerifierIssue,
} from './communication/OutputSchema.js';
export {
  IMPLEMENTOR_OUTPUT_SCHEMA,
  VERIFIER_OUTPUT_SCHEMA,
} from './communication/OutputSchema.js';

// Workspace
export { WorktreeManager } from './workspace/WorktreeManager.js';
export type { WorktreeInfo } from './workspace/WorktreeManager.js';

// Model Config
export { ModelProfile } from './model-config/ModelProfile.js';
export { ModelAssigner } from './model-config/ModelAssigner.js';
