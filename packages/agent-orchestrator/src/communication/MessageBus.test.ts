import { describe, it, expect, vi } from 'vitest';
import { MessageBus, createAgentMessage } from './MessageBus.js';

describe('MessageBus', () => {
  it('should publish and subscribe to messages', () => {
    const bus = new MessageBus();
    const listener = vi.fn();

    bus.subscribe('agent:started', listener);

    const msg = createAgentMessage('coordinator', 'broadcast', 'status', { phase: 1 });
    bus.publish('agent:started', msg);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(msg);
  });

  it('should unsubscribe correctly', () => {
    const bus = new MessageBus();
    const listener = vi.fn();

    const unsubscribe = bus.subscribe('agent:started', listener);
    unsubscribe();

    const msg = createAgentMessage('coordinator', 'broadcast', 'status', {});
    bus.publish('agent:started', msg);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should create valid agent messages', () => {
    const msg = createAgentMessage('coordinator', 'implementor-a', 'discovery', { detail: 'found S3 util' });

    expect(msg.id).toBeTruthy();
    expect(msg.from).toBe('coordinator');
    expect(msg.to).toBe('implementor-a');
    expect(msg.type).toBe('discovery');
    expect(msg.payload).toEqual({ detail: 'found S3 util' });
    expect(msg.timestamp).toBeGreaterThan(0);
  });

  it('should track message history', () => {
    const bus = new MessageBus();

    const msg1 = createAgentMessage('coordinator', 'broadcast', 'status', {});
    const msg2 = createAgentMessage('implementor-a', 'broadcast', 'status', {});

    bus.publish('agent:started', msg1);
    bus.publish('agent:progress', msg2);

    const log = bus.getLog();
    expect(log).toHaveLength(2);
  });
});
