import React, { useState, useCallback } from 'react';
import { useAgentStore } from '../../stores/agentStore.js';
import { useProjectStore } from '../../stores/projectStore.js';

export const ComposerPanel = React.memo(function ComposerPanel() {
  const [input, setInput] = useState('');
  const { startPipeline, pipelineStatus, cancelPipeline } = useAgentStore();
  const { projectPath } = useProjectStore();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || !projectPath || pipelineStatus === 'running') {
        return;
      }
      await startPipeline(input.trim(), projectPath);
      setInput('');
    },
    [input, projectPath, pipelineStatus, startPipeline]
  );

  const handleCancel = useCallback(async () => {
    await cancelPipeline();
  }, [cancelPipeline]);

  const isRunning = pipelineStatus === 'running';

  return (
    <div className='p-3'>
      <p className='text-xs font-semibold uppercase text-[#6c7086] mb-2'>Composer</p>
      <form onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Describe what you want to build or change...'
          className='w-full bg-[#181825] border border-[#313244] rounded p-2 text-xs text-[#cdd6f4] placeholder-[#6c7086] resize-none h-20 focus:outline-none focus:border-[#89b4fa] transition-colors'
          disabled={isRunning}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              void handleSubmit(e);
            }
          }}
        />
        <div className='flex gap-2 mt-2'>
          <button
            type='submit'
            disabled={isRunning || !input.trim() || !projectPath}
            className='flex-1 py-1.5 text-xs rounded bg-[#89b4fa] text-[#1e1e2e] font-semibold hover:bg-[#b4befe] disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {isRunning ? 'Running...' : 'Run Agents'}
          </button>
          {isRunning && (
            <button
              type='button'
              onClick={handleCancel}
              className='px-3 py-1.5 text-xs rounded bg-[#313244] text-[#f38ba8] hover:bg-[#45475a] transition-colors'
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      {!projectPath && (
        <p className='text-xs text-[#6c7086] mt-2 text-center'>
          Open a project first
        </p>
      )}
    </div>
  );
});
