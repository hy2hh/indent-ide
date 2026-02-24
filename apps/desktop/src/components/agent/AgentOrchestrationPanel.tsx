import React from 'react';
import { useAgentStore } from '../../stores/agentStore.js';
import { AgentTimeline } from './AgentTimeline.js';
import { SpecEditor } from './SpecEditor.js';
import { AgentStatusCard } from './AgentStatusCard.js';

export const AgentOrchestrationPanel = React.memo(function AgentOrchestrationPanel() {
  const { pipelineStatus, currentSpec, events, agentStates } = useAgentStore();

  return (
    <div className='flex flex-col h-full overflow-hidden'>
      {/* Header */}
      <div className='flex items-center justify-between px-3 py-2 border-b border-[#313244] flex-shrink-0'>
        <span className='text-xs font-semibold uppercase text-[#6c7086]'>
          Agent Pipeline
        </span>
        <StatusBadge status={pipelineStatus} />
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto'>
        {/* Living Spec */}
        {currentSpec && (
          <div className='border-b border-[#313244]'>
            <SpecEditor spec={currentSpec} />
          </div>
        )}

        {/* Agent Status Cards */}
        {Object.values(agentStates).length > 0 && (
          <div className='p-3 space-y-2 border-b border-[#313244]'>
            <p className='text-xs text-[#6c7086] uppercase font-semibold mb-2'>Agents</p>
            {Object.values(agentStates).map((state) => (
              <AgentStatusCard key={state.id} agentState={state} />
            ))}
          </div>
        )}

        {/* Timeline */}
        {events.length > 0 && (
          <div className='p-3'>
            <p className='text-xs text-[#6c7086] uppercase font-semibold mb-2'>Timeline</p>
            <AgentTimeline events={events} />
          </div>
        )}

        {pipelineStatus === 'idle' && !currentSpec && (
          <div className='p-4 text-xs text-[#6c7086] text-center'>
            Use the Composer to start the agent pipeline
          </div>
        )}
      </div>
    </div>
  );
});

const StatusBadge = React.memo(function StatusBadge({
  status,
}: {
  status: string;
}) {
  const colors: Record<string, string> = {
    idle: 'bg-[#313244] text-[#6c7086]',
    running: 'bg-[#1e3a5f] text-[#89b4fa] animate-pulse',
    completed: 'bg-[#1e3a2a] text-[#a6e3a1]',
    failed: 'bg-[#3a1e1e] text-[#f38ba8]',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[status] ?? colors['idle']}`}>
      {status}
    </span>
  );
});
