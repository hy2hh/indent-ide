import React from 'react';
import { AgentSidebar } from './components/sidebar/AgentSidebar.js';
import { ConversationPanel } from './components/conversation/ConversationPanel.js';
import { SpecPanel } from './components/spec/SpecPanel.js';

export default React.memo(function App() {
  return (
    <div className='flex h-screen w-screen overflow-hidden bg-[#18181c] text-[#e4e4eb] font-mono text-sm select-none'>
      {/* Left: Agent Sidebar */}
      <aside className='w-64 flex-shrink-0 border-r border-[#2a2a33] flex flex-col bg-[#1c1c22]'>
        <AgentSidebar />
      </aside>

      {/* Center: Conversation */}
      <div className='flex-1 flex flex-col min-w-0 border-r border-[#2a2a33]'>
        <ConversationPanel />
      </div>

      {/* Right: Spec Panel */}
      <aside className='w-80 flex-shrink-0 flex flex-col bg-[#1c1c22]'>
        <SpecPanel />
      </aside>
    </div>
  );
});
