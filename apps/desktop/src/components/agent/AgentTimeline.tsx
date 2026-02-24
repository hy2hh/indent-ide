import React from 'react';
import type { AgentEvent } from '../../stores/agentStore.js';

interface AgentTimelineProps {
  events: AgentEvent[];
}

const CHANNEL_ICONS: Record<string, string> = {
  'spec:updated': '📋',
  'agent:started': '▶',
  'agent:progress': '⟳',
  'agent:discovery': '💡',
  'agent:completed': '✓',
  'agent:failed': '✗',
  'verify:pass': '✅',
  'verify:fail': '❌',
  'pipeline:started': '🚀',
  'pipeline:completed': '🎉',
  'pipeline:failed': '💥',
};

export const AgentTimeline = React.memo(function AgentTimeline({
  events,
}: AgentTimelineProps) {
  return (
    <div className='space-y-1 max-h-48 overflow-y-auto'>
      {events.slice(-20).map((event, idx) => (
        <div
          key={idx}
          className='flex items-start gap-2 text-xs'
        >
          <span className='flex-shrink-0 w-4 text-center'>
            {CHANNEL_ICONS[event.channel] ?? '·'}
          </span>
          <span className='text-[#6c7086] flex-shrink-0'>
            {new Date(event.message.timestamp).toLocaleTimeString()}
          </span>
          <span className='text-[#cdd6f4] truncate'>
            {event.message.from}: {event.channel}
          </span>
        </div>
      ))}
    </div>
  );
});
