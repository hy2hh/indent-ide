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
});
