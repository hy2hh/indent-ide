import React from 'react';
import { useProjectStore } from './stores/projectStore.js';
import { FileExplorer } from './components/sidebar/FileExplorer.js';
import { EditorTabs } from './components/editor/EditorTabs.js';
import { CodeEditor } from './components/editor/CodeEditor.js';
import { ComposerPanel } from './components/composer/ComposerPanel.js';
import { AgentOrchestrationPanel } from './components/agent/AgentOrchestrationPanel.js';
import { ChatPanel } from './components/chat/ChatPanel.js';
import { TerminalPanel } from './components/terminal/TerminalPanel.js';

export default React.memo(function App() {
  const { projectPath } = useProjectStore();

  return (
    <div className='flex h-screen w-screen overflow-hidden bg-[#1e1e2e] text-[#cdd6f4] font-mono text-sm'>
      {/* Sidebar */}
      <aside className='w-60 flex-shrink-0 border-r border-[#313244] flex flex-col'>
        <FileExplorer />
      </aside>

      {/* Main Area */}
      <div className='flex-1 flex flex-col min-w-0'>
        {/* Editor Area */}
        <div className='flex-1 flex flex-col min-h-0'>
          <EditorTabs />
          <div className='flex-1 min-h-0'>
            <CodeEditor />
          </div>
        </div>

        {/* Bottom Panel */}
        <div className='h-48 border-t border-[#313244] flex-shrink-0'>
          <TerminalPanel projectPath={projectPath ?? ''} />
        </div>
      </div>

      {/* Right Panel */}
      <aside className='w-96 flex-shrink-0 border-l border-[#313244] flex flex-col'>
        {/* Composer */}
        <div className='flex-shrink-0 border-b border-[#313244]'>
          <ComposerPanel />
        </div>

        {/* Agent Orchestration Panel */}
        <div className='flex-1 overflow-hidden'>
          <AgentOrchestrationPanel />
        </div>

        {/* Chat */}
        <div className='h-64 border-t border-[#313244] flex-shrink-0'>
          <ChatPanel />
        </div>
      </aside>
    </div>
  );
});
