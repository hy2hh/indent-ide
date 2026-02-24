import React, { useCallback } from 'react';
import { useAgentStore } from '../../stores/agentStore.js';
import type { LivingSpecData, SpecTask } from '@intent-ide/core';

export const SpecPanel = React.memo(function SpecPanel() {
  const { currentSpec, approveSpec, pipelineStatus } = useAgentStore();

  const handleApprove = useCallback(async () => {
    await approveSpec();
  }, [approveSpec]);

  const isDraft = currentSpec?.status === 'draft';
  const isWaiting = pipelineStatus === 'running' && isDraft;

  return (
    <div className='flex flex-col h-full overflow-hidden font-sans'>
      {/* Header */}
      <div className='flex items-center h-9 border-b border-[#2a2a33] flex-shrink-0 px-4 justify-between'>
        <span className='text-xs text-[#888892]'>Spec</span>
        {isDraft && (
          <span className='text-[10px] text-[#f59e0b] bg-[#1c150c] border border-[#4a3a1e] px-1.5 py-0.5 rounded'>
            draft
          </span>
        )}
      </div>

      {/* Breadcrumb */}
      <div className='px-4 py-2 flex-shrink-0 border-b border-[#2a2a33]'>
        <p className='text-[10px] tracking-widest text-[#505060] uppercase'>LIVING SPEC</p>
      </div>

      {/* Approve 배너 */}
      {isWaiting && (
        <div className='flex-shrink-0 px-4 py-3 border-b border-[#2a2a33] bg-[#1c150c]'>
          <p className='text-xs text-[#f59e0b] mb-2 leading-relaxed'>
            Coordinator가 계획을 세웠습니다. 검토 후 승인하면 에이전트들이 구현을 시작합니다.
          </p>
          <button
            onClick={() => void handleApprove()}
            className='w-full py-1.5 bg-[#9333ea] hover:bg-[#7e22ce] text-white text-xs font-medium rounded transition-colors'
          >
            ✓ Approve Plan — Start Implementation
          </button>
        </div>
      )}

      {/* Content */}
      <div className='flex-1 overflow-y-auto px-4 py-4 min-h-0'>
        {currentSpec === null ? (
          <div className='flex flex-col items-center justify-center h-full gap-2'>
            <p className='text-sm text-[#505060]'>No spec yet</p>
            <p className='text-xs text-[#383840] text-center leading-relaxed'>
              Coordinator가 목표를 분석하면<br />여기에 Living Spec이 생성됩니다.
            </p>
          </div>
        ) : (
          <SpecContent spec={currentSpec} />
        )}
      </div>
    </div>
  );
});

function SpecContent({ spec }: { spec: LivingSpecData }) {
  const done = spec.tasks.filter((t) => t.status === 'completed').length;
  const total = spec.tasks.length;

  return (
    <div className='space-y-5'>
      {/* Title + status */}
      <div>
        <div className='flex items-center justify-between mb-1'>
          <h2 className='text-sm font-bold text-[#e4e4eb] leading-snug'>{spec.goal}</h2>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            spec.status === 'completed' ? 'bg-[#14532d] text-[#4ade80]' :
            spec.status === 'in_progress' ? 'bg-[#1e3a5f] text-[#60a5fa]' :
            spec.status === 'failed' ? 'bg-[#450a0a] text-[#f87171]' :
            'bg-[#1c1c22] text-[#888892]'
          }`}>
            {spec.status.replace('_', ' ')}
          </span>
        </div>
        {total > 0 && (
          <div className='flex items-center gap-2 mt-2'>
            <div className='flex-1 h-1 bg-[#2a2a33] rounded-full overflow-hidden'>
              <div
                className='h-full bg-[#22c55e] rounded-full transition-all duration-500'
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
            <span className='text-[10px] text-[#666672]'>{done}/{total}</span>
          </div>
        )}
      </div>

      {/* Constraints */}
      {spec.constraints.length > 0 && (
        <div className='space-y-1.5'>
          <h3 className='text-xs font-bold text-[#e4e4eb]'>Constraints</h3>
          <ul className='space-y-1'>
            {spec.constraints.map((c, i) => (
              <li key={i} className='flex items-start gap-1.5 text-xs text-[#c4c4cc]'>
                <span className='text-[#666672] mt-0.5 flex-shrink-0'>•</span>
                <span className='leading-relaxed'>{c.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tasks */}
      {spec.tasks.length > 0 && (
        <div className='space-y-1.5'>
          <h3 className='text-xs font-bold text-[#e4e4eb]'>Tasks</h3>
          <div className='space-y-1'>
            {spec.tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Context */}
      {spec.context !== undefined && (
        <div className='space-y-1.5'>
          <h3 className='text-xs font-bold text-[#e4e4eb]'>Context</h3>
          <p className='text-xs text-[#c4c4cc] leading-relaxed'>{spec.context}</p>
        </div>
      )}

      <div className='text-[10px] text-[#383840] pt-2 border-t border-[#2a2a33]'>
        v{spec.version} · updated {new Date(spec.updatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}

function TaskItem({ task }: { task: SpecTask }) {
  const icon =
    task.status === 'completed' ? '✓' :
    task.status === 'in_progress' ? '→' :
    task.status === 'failed' ? '✗' : '○';

  const color =
    task.status === 'completed' ? 'text-[#4ade80]' :
    task.status === 'in_progress' ? 'text-[#60a5fa]' :
    task.status === 'failed' ? 'text-[#f87171]' : 'text-[#505060]';

  return (
    <div className='flex items-start gap-2 py-1'>
      <span className={`text-xs flex-shrink-0 mt-0.5 font-mono ${color} ${task.status === 'in_progress' ? 'animate-pulse' : ''}`}>
        {icon}
      </span>
      <div className='flex-1 min-w-0'>
        <p className='text-xs text-[#c4c4cc] leading-relaxed'>{task.description}</p>
        {task.files.length > 0 && (
          <div className='flex flex-wrap gap-1 mt-1'>
            {task.files.map((f, i) => (
              <span key={i} className='text-[10px] font-mono text-[#6b8fd4] bg-[#111115] border border-[#2a2a33] px-1 py-0.5 rounded'>
                {f.split('/').pop()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
