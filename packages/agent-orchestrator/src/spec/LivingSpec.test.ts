import { describe, it, expect } from 'vitest';
import { LivingSpec } from './LivingSpec.js';

describe('LivingSpec', () => {
  it('should create a spec with correct initial state', () => {
    const spec = LivingSpec.create('session-1', 'Add avatar upload', 'project context');
    const data = spec.getData();

    expect(data.sessionId).toBe('session-1');
    expect(data.goal).toBe('Add avatar upload');
    expect(data.status).toBe('draft');
    expect(data.tasks).toHaveLength(0);
  });

  it('should add a task', () => {
    const spec = LivingSpec.create('session-1', 'Test goal', 'context');

    spec.addTask({
      id: 'task-1',
      description: 'Implement feature',
      status: 'pending',
      priority: 'high',
      dependencies: [],
      files: [],
      discoveries: [],
      feedback: [],
    }, 'coordinator');

    const data = spec.getData();
    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0]?.id).toBe('task-1');
  });

  it('should update task status', () => {
    const spec = LivingSpec.create('session-1', 'Test goal', 'context');

    spec.addTask({
      id: 'task-1',
      description: 'Test',
      status: 'pending',
      priority: 'high',
      dependencies: [],
      files: [],
      discoveries: [],
      feedback: [],
    }, 'coordinator');

    spec.updateTaskStatus('task-1', 'in_progress', 'implementor');
    const task = spec.getTask('task-1');
    expect(task?.status).toBe('in_progress');
  });

  it('should approve the spec', () => {
    const spec = LivingSpec.create('session-1', 'Test goal', 'context');
    expect(spec.isApproved()).toBe(false);

    spec.approve('user');
    expect(spec.isApproved()).toBe(true);
  });

  it('should add discoveries to a task', () => {
    const spec = LivingSpec.create('session-1', 'Test goal', 'context');

    spec.addTask({
      id: 'task-1',
      description: 'Test',
      status: 'pending',
      priority: 'high',
      dependencies: [],
      files: [],
      discoveries: [],
      feedback: [],
    }, 'coordinator');

    spec.addDiscovery('task-1', 'Found existing utility', 'implementor-a');
    const task = spec.getTask('task-1');
    expect(task?.discoveries).toContain('Found existing utility');
  });

  it('should emit events on updates', () => {
    const spec = LivingSpec.create('session-1', 'Test goal', 'context');
    let eventFired = false;

    spec.on('updated', () => {
      eventFired = true;
    });

    spec.addTask({
      id: 'task-1',
      description: 'Test',
      status: 'pending',
      priority: 'high',
      dependencies: [],
      files: [],
      discoveries: [],
      feedback: [],
    }, 'coordinator');

    expect(eventFired).toBe(true);
  });

  it('should replace draft tasks via setDraftTasks', () => {
    const spec = LivingSpec.create('session-1', 'Test goal', 'context');

    const updated = spec.setDraftTasks([
      { id: 'task-a', description: 'Implement API', files: ['src/api.ts'] },
      { id: 'task-a', description: 'Write tests', dependencies: ['task-a'] },
      { description: '  ' },
    ], 'user');

    expect(updated).toBe(true);
    const data = spec.getData();
    expect(data.tasks).toHaveLength(2);
    expect(data.tasks[0]?.id).toBe('task-a');
    expect(data.tasks[0]?.files).toEqual(['src/api.ts']);
    expect(data.tasks[1]?.id).toBe('task-a-2');
    expect(data.tasks[1]?.dependencies).toEqual(['task-a']);
  });

  it('should reject setDraftTasks once approved', () => {
    const spec = LivingSpec.create('session-1', 'Test goal', 'context');
    spec.approve('user');

    const updated = spec.setDraftTasks([{ description: 'Should fail' }], 'user');

    expect(updated).toBe(false);
    expect(spec.getData().tasks).toHaveLength(0);
  });
});
