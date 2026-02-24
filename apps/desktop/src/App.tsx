import React, { useEffect } from 'react';
import { useProjectStore } from './stores/projectStore.js';
import { useAgentStore } from './stores/agentStore.js';
import { AgentSidebar } from './components/sidebar/AgentSidebar.js';
import { ConversationPanel } from './components/conversation/ConversationPanel.js';
import { SpecPanel } from './components/spec/SpecPanel.js';
import { TerminalPanel } from './components/terminal/TerminalPanel.js';
import { WelcomeScreen } from './components/welcome/WelcomeScreen.js';

export default React.memo(function App() {
  const { projectPath } = useProjectStore();
  const { detectCLIs } = useAgentStore();

  // 앱 시작 시 CLI 감지 + 세션 복원
  useEffect(() => {
    void detectCLIs();

    // 세션 복원: 마지막 프로젝트 경로 복원
    const lastPath = localStorage.getItem('intent-ide:lastProjectPath');
    if (lastPath && !projectPath) {
      // projectPath를 직접 set (openProject는 dialog를 열므로 store를 직접 업데이트)
      useProjectStore.setState({ projectPath: lastPath });
      void useProjectStore.getState().refreshFileTree();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 프로젝트 경로 변경 시 localStorage에 저장
  useEffect(() => {
    if (projectPath) {
      localStorage.setItem('intent-ide:lastProjectPath', projectPath);
    }
  }, [projectPath]);

  return (
    <div className='flex flex-col h-screen w-screen overflow-hidden bg-[#18181c] text-[#e4e4eb] font-sans text-sm select-none'>
      {/* Title Bar */}
      <div
        className='flex items-center justify-center flex-shrink-0 bg-[#141418] border-b border-[#2a2a33]'
        style={{ height: '40px', WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className='absolute left-0 w-20 h-full' style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} />
        <div
          className='flex items-center gap-2 bg-[#1c1c24] border border-[#2a2a33] rounded-md px-3 py-1.5 text-xs text-[#888892]'
          style={{ WebkitAppRegion: 'no-drag', minWidth: '280px' } as React.CSSProperties}
        >
          <svg width='12' height='12' viewBox='0 0 12 12' fill='none' className='flex-shrink-0'>
            <circle cx='5' cy='5' r='4' stroke='#666672' strokeWidth='1.2' />
            <path d='M8.5 8.5L11 11' stroke='#666672' strokeWidth='1.2' strokeLinecap='round' />
          </svg>
          <span className='flex-1 text-center'>
            {projectPath ? projectPath.split('/').pop() : 'Open a project to start'}
          </span>
          <kbd className='text-[9px] text-[#505060] bg-[#141418] border border-[#2a2a33] rounded px-1 py-0.5'>⌘K</kbd>
        </div>
      </div>

      {!projectPath ? (
        <WelcomeScreen />
      ) : (
        <div className='flex flex-1 min-h-0'>
          {/* 좌측: Agent Sidebar */}
          <aside className='w-[288px] flex-shrink-0 border-r border-[#2a2a33] flex flex-col bg-[#1c1c22]'>
            <AgentSidebar />
          </aside>

          {/* 가운데: Conversation */}
          <div className='flex-1 flex flex-col min-w-0 border-r border-[#2a2a33]'>
            <ConversationPanel />
          </div>

          {/* 우측: Spec + Terminal */}
          <aside className='w-[380px] flex-shrink-0 flex flex-col bg-[#1c1c22]'>
            {/* Spec Panel - flex-1로 나머지 공간 차지 */}
            <div className='flex-1 flex flex-col min-h-0'>
              <SpecPanel />
            </div>
            {/* Terminal Panel - 하단 고정 200px */}
            <div className='flex-shrink-0 h-[200px] border-t border-[#2a2a33]'>
              <TerminalPanel projectPath={projectPath} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
});
