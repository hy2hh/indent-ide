import React from 'react';
import type { AgentState } from '@intent-ide/core';

interface AgentStatusCardProps {
  agentState: AgentState;
}

export const AgentStatusCard = React.memo(function AgentStatusCard({
  agentState,
}: AgentStatusCardProps) {
  const statusColor = {
    idle: 'text-[#6c7086]',
    running: 'text-[#89b4fa]',
    waiting: 'text-[#f9e2af]',
    completed: 'text-[#a6e3a1]',
    failed: 'text-[#f38ba8]',
    cancelled: 'text-[#6c7086]',
  }[agentState.status] ?? 'text-[#6c7086]';

  return (
    <div className='flex items-center gap-2 p-2 rounded bg-[#181825]'>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        agentState.status === 'running' ? 'animate-pulse bg-[#89b4fa]' :
        agentState.status === 'completed' ? 'bg-[#a6e3a1]' :
        agentState.status === 'failed' ? 'bg-[#f38ba8]' : 'bg-[#313244]'
      }`} />
      <div className='flex-1 min-w-0'>
        <div className='flex items-center justify-between'>
          <span className='text-xs text-[#cdd6f4] truncate'>{agentState.id}</span>
          <span className={`text-xs ${statusColor}`}>{agentState.status}</span>
        </div>
        {agentState.status === 'running' && (
          <div className='mt-1 h-1 bg-[#313244] rounded overflow-hidden'>
            <div
              className='h-full bg-[#89b4fa] transition-all duration-300'
              style={{ width: `${agentState.progress}%` }}
            />
          </div>
        )}
        {agentState.discoveries.length > 0 && (
          <p className='text-xs text-[#a6adc8] mt-0.5 truncate'>
            {agentState.discoveries[agentState.discoveries.length - 1]}
          </p>
        )}
      </div>
    </div>
  );
});
