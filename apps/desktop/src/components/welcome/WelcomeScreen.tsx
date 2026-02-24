import React, { useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore.js';
import { useAgentStore } from '../../stores/agentStore.js';

export const WelcomeScreen = React.memo(function WelcomeScreen() {
  const { openProject } = useProjectStore();
  const { detectedCLIs } = useAgentStore();

  const availableCLIs = Object.entries(detectedCLIs)
    .filter(([, ok]) => ok)
    .map(([name]) => name);

  const handleOpen = useCallback(async () => {
    await openProject();
  }, [openProject]);

  return (
    <div className='flex-1 flex flex-col items-center justify-center gap-8 bg-[#18181c]'>
      {/* Logo / Title */}
      <div className='text-center space-y-2'>
        <div className='flex items-center justify-center gap-2 mb-4'>
          <div className='w-8 h-8 rounded-lg bg-[#9333ea] flex items-center justify-center'>
            <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
              <path d='M3 8h10M8 3l5 5-5 5' stroke='white' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </div>
          <h1 className='text-xl font-semibold text-[#e4e4eb]'>Intent IDE</h1>
        </div>
        <p className='text-sm text-[#666672] max-w-md leading-relaxed'>
          AI 에이전트가 코드를 작성합니다. 목표를 설명하면 Coordinator가 태스크를 분해하고,
          여러 에이전트가 병렬로 구현합니다.
        </p>
      </div>

      {/* Open Project Button */}
      <button
        onClick={() => void handleOpen()}
        className='flex items-center gap-3 px-6 py-3 bg-[#9333ea] hover:bg-[#7e22ce] text-white rounded-lg text-sm font-medium transition-colors'
      >
        <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
          <path d='M2 4h5l2 2h5v8H2V4z' stroke='white' strokeWidth='1.2' strokeLinecap='round' strokeLinejoin='round' />
        </svg>
        Open Project
      </button>

      {/* CLI Status */}
      <div className='flex items-center gap-4'>
        {['claude', 'codex', 'gemini'].map((cli) => (
          <div key={cli} className='flex items-center gap-1.5 text-xs'>
            <div className={`w-1.5 h-1.5 rounded-full ${availableCLIs.includes(cli) ? 'bg-[#22c55e]' : 'bg-[#505060]'}`} />
            <span className={availableCLIs.includes(cli) ? 'text-[#888892]' : 'text-[#505060]'}>{cli}</span>
          </div>
        ))}
      </div>

      {availableCLIs.length === 0 && (
        <p className='text-xs text-[#505060]'>
          CLI 도구가 감지되지 않았습니다. claude, codex, gemini 중 하나를 설치해주세요.
        </p>
      )}
    </div>
  );
});
