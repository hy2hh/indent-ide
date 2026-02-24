import React, { useCallback } from 'react';
import { useAgentStore } from '../../stores/agentStore.js';
import type { LivingSpecData } from '@intent-ide/core';

interface SpecEditorProps {
  spec: LivingSpecData;
}

export const SpecEditor = React.memo(function SpecEditor({ spec }: SpecEditorProps) {
  const { approveSpec, pipelineStatus } = useAgentStore();

  const handleApprove = useCallback(async () => {
    await approveSpec();
  }, [approveSpec]);

  return (
    <div className='p-3'>
      <div className='flex items-center justify-between mb-2'>
        <p className='text-xs font-semibold text-[#89b4fa]'>Living Spec</p>
        <span className={`text-xs px-2 py-0.5 rounded ${
          spec.status === 'approved' ? 'bg-[#1e3a2a] text-[#a6e3a1]' :
          spec.status === 'draft' ? 'bg-[#3a3a1e] text-[#f9e2af]' :
          'bg-[#313244] text-[#6c7086]'
        }`}>
          {spec.status}
        </span>
      </div>

      {/* Goal */}
      <p className='text-xs text-[#cdd6f4] mb-3'>{spec.goal}</p>

      {/* Tasks */}
      <div className='space-y-1.5'>
        {spec.tasks.map((task) => (
          <div
            key={task.id}
            className='flex items-start gap-2 p-2 rounded bg-[#181825]'
          >
            <TaskStatusIcon status={task.status} />
            <div className='flex-1 min-w-0'>
              <p className='text-xs text-[#cdd6f4] truncate'>{task.description}</p>
              {task.discoveries.length > 0 && (
                <p className='text-xs text-[#a6adc8] mt-0.5 truncate'>
                  💡 {task.discoveries[0]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Approve button */}
      {spec.status === 'draft' && pipelineStatus === 'running' && (
        <button
          onClick={handleApprove}
          className='mt-3 w-full py-1.5 text-xs rounded bg-[#89b4fa] text-[#1e1e2e] font-semibold hover:bg-[#b4befe] transition-colors'
        >
          Approve Plan
        </button>
      )}
    </div>
  );
});

const STATUS_ICONS: Record<string, string> = {
  pending: '○',
  in_progress: '◐',
  completed: '●',
  failed: '✗',
  skipped: '–',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-[#6c7086]',
  in_progress: 'text-[#89b4fa]',
  completed: 'text-[#a6e3a1]',
  failed: 'text-[#f38ba8]',
  skipped: 'text-[#6c7086]',
};

const TaskStatusIcon = React.memo(function TaskStatusIcon({ status }: { status: string }) {
  return (
    <span className={`text-xs flex-shrink-0 mt-0.5 ${STATUS_COLORS[status] ?? 'text-[#6c7086]'}`}>
      {STATUS_ICONS[status] ?? '○'}
    </span>
  );
});
