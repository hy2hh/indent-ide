import React, { useEffect, useRef } from 'react';
import type { LivingSpecData } from '@intent-ide/core';
import { useProjectStore } from './stores/projectStore.js';
import {
  useAgentStore,
  type AgentEvent,
  type ConversationItemType,
  type PipelineStatus,
} from './stores/agentStore.js';
import { useUiStore } from './stores/uiStore.js';
import { useEditorStore } from './stores/editorStore.js';
import { AgentSidebar } from './components/sidebar/AgentSidebar.js';
import { ConversationPanel } from './components/conversation/ConversationPanel.js';
import { SpecPanel } from './components/spec/SpecPanel.js';
import { TerminalPanel } from './components/terminal/TerminalPanel.js';
import { WelcomeScreen } from './components/welcome/WelcomeScreen.js';
import { BrowserPanel } from './components/browser/BrowserPanel.js';
import { CommandPalette } from './components/palette/CommandPalette.js';
import { CodeEditor } from './components/editor/CodeEditor.js';
import { EditorTabs } from './components/editor/EditorTabs.js';

const PROJECT_STORAGE_KEY = 'intent-ide:lastProjectPath';
const SESSION_STORAGE_KEY = 'intent-ide:lastSessionState:v1';

interface PersistedSessionState {
  pipelineStatus: PipelineStatus;
  activeProjectPath: string | null;
  currentSessionId: string | null;
  currentSpec: LivingSpecData | null;
  events: AgentEvent[];
  conversationItems: ConversationItemType[];
  queuedGoals: string[];
  isQueuePaused: boolean;
}

function normalizePipelineStatus(value: unknown): PipelineStatus {
  if (value === 'running' || value === 'completed' || value === 'failed') {
    return value;
  }
  return 'idle';
}

function parsePersistedSession(raw: string | null): PersistedSessionState | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedSessionState>;
    const pipelineStatus = normalizePipelineStatus(parsed.pipelineStatus);
    return {
      pipelineStatus,
      activeProjectPath: typeof parsed.activeProjectPath === 'string' ? parsed.activeProjectPath : null,
      currentSessionId: typeof parsed.currentSessionId === 'string' ? parsed.currentSessionId : null,
      currentSpec: (parsed.currentSpec ?? null) as LivingSpecData | null,
      events: Array.isArray(parsed.events) ? (parsed.events as AgentEvent[]).slice(-200) : [],
      conversationItems: Array.isArray(parsed.conversationItems)
        ? (parsed.conversationItems as ConversationItemType[]).slice(-500)
        : [],
      queuedGoals: Array.isArray(parsed.queuedGoals)
        ? parsed.queuedGoals.filter((goal): goal is string => typeof goal === 'string').slice(0, 30)
        : [],
      isQueuePaused: parsed.isQueuePaused === true,
    };
  } catch {
    return null;
  }
}

type ResizeMode = 'left' | 'right' | 'terminal';

export default React.memo(function App() {
  const { projectPath } = useProjectStore();
  const {
    detectCLIs,
    pipelineStatus,
    activeProjectPath,
    currentSessionId,
    currentSpec,
    events,
    conversationItems,
    queuedGoals,
    isQueuePaused,
  } = useAgentStore();
  const {
    initialize: initializeUi,
    layout,
    rightPanelMode,
    centerPanelMode,
    currentLayoutId,
    applyBuiltinLayout,
    setRightPanelMode,
    setCenterPanelMode,
    openBrowserUrl,
    updateLayout,
  } = useUiStore();
  const { activeTabId } = useEditorStore();
  const resizeModeRef = useRef<ResizeMode | null>(null);

  // 자동 모드 전환: 파일이 열리면 에디터로, 파이프라인이 시작되면 컨버세이션으로
  useEffect(() => {
    if (activeTabId && centerPanelMode === 'conversation') {
      setCenterPanelMode('editor');
    }
  }, [activeTabId, centerPanelMode, setCenterPanelMode]);

  useEffect(() => {
    if (pipelineStatus === 'running' && centerPanelMode === 'editor') {
      setCenterPanelMode('split');
    }
  }, [pipelineStatus, centerPanelMode, setCenterPanelMode]);

  // 앱 시작 시 초기화 + 세션 복원
  useEffect(() => {
    void detectCLIs();
    initializeUi();

    const lastPath = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (lastPath && !useProjectStore.getState().projectPath) {
      useProjectStore.setState({ projectPath: lastPath });
      void useProjectStore.getState().refreshFileTree();
    }

    const restoredSession = parsePersistedSession(localStorage.getItem(SESSION_STORAGE_KEY));
    if (restoredSession && useAgentStore.getState().conversationItems.length === 0) {
      const resumedFromRunning = restoredSession.pipelineStatus === 'running';
      useAgentStore.setState({
        pipelineStatus: resumedFromRunning ? 'idle' : restoredSession.pipelineStatus,
        activeProjectPath: restoredSession.activeProjectPath,
        currentSessionId: resumedFromRunning ? null : restoredSession.currentSessionId,
        currentSpec: restoredSession.currentSpec,
        events: restoredSession.events,
        queuedGoals: restoredSession.queuedGoals,
        isQueuePaused: restoredSession.isQueuePaused,
        conversationItems: resumedFromRunning
          ? [
              ...restoredSession.conversationItems,
              {
                type: 'response',
                content:
                  'Previous session was interrupted when the app closed. State was restored in idle mode.',
              },
            ]
          : restoredSession.conversationItems,
      });
    }
  }, [detectCLIs, initializeUi]);

  useEffect(() => {
    if (projectPath) {
      localStorage.setItem(PROJECT_STORAGE_KEY, projectPath);
    }
  }, [projectPath]);

  useEffect(() => {
    const snapshot: PersistedSessionState = {
      pipelineStatus,
      activeProjectPath,
      currentSessionId,
      currentSpec,
      events: events.slice(-200),
      conversationItems: conversationItems.slice(-500),
      queuedGoals: queuedGoals.slice(0, 30),
      isQueuePaused,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    pipelineStatus,
    activeProjectPath,
    currentSessionId,
    currentSpec,
    events,
    conversationItems,
    queuedGoals,
    isQueuePaused,
  ]);

  const handleStartResize = (mode: ResizeMode) => {
    resizeModeRef.current = mode;
    document.body.style.cursor = mode === 'terminal' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const mode = resizeModeRef.current;
      if (!mode) {
        return;
      }

      if (mode === 'left') {
        updateLayout({ leftWidth: event.clientX });
        return;
      }

      if (mode === 'right') {
        updateLayout({ rightWidth: window.innerWidth - event.clientX });
        return;
      }

      updateLayout({ terminalHeight: window.innerHeight - event.clientY });
    };

    const handleMouseUp = () => {
      if (!resizeModeRef.current) {
        return;
      }
      resizeModeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [updateLayout]);

  return (
    <div className='flex h-screen w-screen flex-col overflow-hidden bg-[#0b0d12] text-[#e4e4eb] text-sm select-none'>
      {/* Title Bar */}
      <div
        className='relative flex h-[40px] flex-shrink-0 items-center border-b border-[#1c222d] bg-[#0b0d12]/95 px-4'
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Left Side: Traffic Lights & Branding */}
        <div className='flex items-center gap-2.5 mr-6' style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className='flex items-center gap-2'>
            <span className='h-3 w-3 rounded-full bg-[#ff5f57]' />
            <span className='h-3 w-3 rounded-full bg-[#febc2e]' />
            <span className='h-3 w-3 rounded-full bg-[#28c840]' />
          </div>
          <span className='ml-2 text-[10px] font-black tracking-[0.2em] text-[#505060] uppercase'>Intent IDE</span>
        </div>

        {/* Center: Project Path / Search */}
        <div className='flex-1 flex justify-center min-w-0' style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className='flex max-w-[580px] w-full items-center gap-2.5 rounded-lg border border-[#1c222d] bg-[#131722]/80 px-3 py-1.5 text-[11px] text-[#a1acc5] transition-all hover:bg-[#131722] hover:border-[#262d3d]'>
            <svg width='11' height='11' viewBox='0 0 12 12' fill='none' className='flex-shrink-0 opacity-40'>
              <circle cx='5' cy='5' r='4' stroke='#7f8aa3' strokeWidth='1.5' />
              <path d='M8.5 8.5L11 11' stroke='#7f8aa3' strokeWidth='1.5' strokeLinecap='round' />
            </svg>
            <span className='truncate font-mono opacity-60'>
              {projectPath ?? 'Open a project to begin...'}
            </span>
          </div>
        </div>

        {/* Right Side: Controls */}
        <div className='flex items-center gap-4 ml-6' style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className='flex items-center bg-[#131722] rounded-md border border-[#1c222d] p-0.5 shadow-inner'>
            <button
              onClick={() => setCenterPanelMode('conversation')}
              className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                centerPanelMode === 'conversation' ? 'bg-[#1b315e] text-[#cfe0ff] shadow-sm' : 'text-[#505060] hover:text-[#a1acc5]'
              }`}
            >
              CHAT
            </button>
            <button
              onClick={() => setCenterPanelMode('editor')}
              className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                centerPanelMode === 'editor' ? 'bg-[#1b315e] text-[#cfe0ff] shadow-sm' : 'text-[#505060] hover:text-[#a1acc5]'
              }`}
            >
              CODE
            </button>
            <button
              onClick={() => setCenterPanelMode('split')}
              className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                centerPanelMode === 'split' ? 'bg-[#1b315e] text-[#cfe0ff] shadow-sm' : 'text-[#505060] hover:text-[#a1acc5]'
              }`}
            >
              SPLIT
            </button>
          </div>

          <div className='h-4 w-px bg-[#1c222d]' />

          <div className='flex items-center gap-2'>
            <select
              value={currentLayoutId === 'custom' ? 'default' : currentLayoutId}
              onChange={(event) => {
                const value = event.target.value;
                if (value === 'default' || value === 'focus' || value === 'review') {
                  applyBuiltinLayout(value);
                }
              }}
              className='h-7 rounded-md border border-[#1c222d] bg-[#131722] px-2.5 text-[10px] text-[#a1acc5] focus:outline-none focus:border-[#4f8cff]/40 transition-colors cursor-pointer'
            >
              <option value='default'>Layout: Default</option>
              <option value='focus'>Layout: Focus</option>
              <option value='review'>Layout: Review</option>
            </select>
            
            <button
              onClick={() => openBrowserUrl('http://localhost:3000')}
              className='h-7 rounded-md border border-[#33405a] bg-[#0f1f3b] px-3 text-[10px] font-bold text-[#8bb8ff] hover:bg-[#1a315d] hover:border-[#4f8cff]/30 transition-all'
            >
              LOCALHOST
            </button>
          </div>
          
          <kbd className='hidden lg:flex rounded border border-[#1c222d] bg-[#131722] px-2 py-0.5 text-[9px] font-bold text-[#383840] shadow-sm'>⌘K</kbd>
        </div>
      </div>

      {!projectPath ? (
        <WelcomeScreen />
      ) : (
        <div className='flex min-h-0 flex-1 overflow-hidden'>
          {/* Left Sidebar */}
          <aside
            className='flex flex-shrink-0 flex-col border-r border-[#1c222d] bg-[#0b0d12]'
            style={{ width: `${layout.leftWidth}px` }}
          >
            <AgentSidebar />
          </aside>
          
          {/* Left Resizer */}
          <div
            className='w-[2px] -ml-[1px] cursor-col-resize bg-transparent hover:bg-[#4f8cff]/40 transition-all z-20 group relative'
            onMouseDown={() => handleStartResize('left')}
          >
            <div className='absolute inset-y-0 -inset-x-1.5' /> {/* Expand hit area */}
          </div>

          {/* Main Area */}
          <main className='flex min-w-0 flex-1 flex-col bg-[#0b0d12] relative'>
            {centerPanelMode === 'conversation' && (
              <ConversationPanel />
            )}
            {centerPanelMode === 'editor' && (
              <div className='flex flex-col h-full'>
                <EditorTabs />
                <div className='flex-1 overflow-hidden'>
                  <CodeEditor />
                </div>
              </div>
            )}
            {centerPanelMode === 'split' && (
              <div className='flex flex-col h-full'>
                <div className='flex-1 flex min-h-0'>
                  <div className='flex-1 flex flex-col border-r border-[#1c222d]'>
                    <ConversationPanel />
                  </div>
                  <div className='flex-1 flex flex-col'>
                    <EditorTabs />
                    <div className='flex-1 overflow-hidden'>
                      <CodeEditor />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Right Panel Resizer */}
          <div
            className='w-[2px] -mr-[1px] cursor-col-resize bg-transparent hover:bg-[#4f8cff]/40 transition-all z-20 group relative'
            onMouseDown={() => handleStartResize('right')}
          >
            <div className='absolute inset-y-0 -inset-x-1.5' /> {/* Expand hit area */}
          </div>

          {/* Right Panel */}
          <aside
            className='flex flex-shrink-0 flex-col bg-[#0b0d12] border-l border-[#1c222d]'
            style={{ width: `${layout.rightWidth}px` }}
          >
            <div className='flex h-[40px] flex-shrink-0 items-center justify-between border-b border-[#1c222d] px-4 bg-[#0b0d12] shadow-sm'>
              <div className='flex items-center gap-1.5'>
                <button
                  onClick={() => setRightPanelMode('spec')}
                  className={`rounded-md px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all ${
                    rightPanelMode === 'spec'
                      ? 'bg-[#1b315e] text-[#cfe0ff] shadow-sm'
                      : 'text-[#505060] hover:text-[#a1acc5] hover:bg-[#131722]'
                  }`}
                >
                  SPEC
                </button>
                <button
                  onClick={() => setRightPanelMode('browser')}
                  className={`rounded-md px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all ${
                    rightPanelMode === 'browser'
                      ? 'bg-[#1b315e] text-[#cfe0ff] shadow-sm'
                      : 'text-[#505060] hover:text-[#a1acc5] hover:bg-[#131722]'
                  }`}
                >
                  BROWSER
                </button>
              </div>
              <span className='text-[9px] uppercase tracking-[0.2em] text-[#383840] font-black'>
                {rightPanelMode === 'spec' ? 'Intent Notes' : 'Live Preview'}
              </span>
            </div>
            
            <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
              {rightPanelMode === 'spec' ? <SpecPanel /> : <BrowserPanel />}
            </div>

            {/* Terminal Resizer */}
            <div
              className='h-[2px] -mt-[1px] cursor-row-resize bg-transparent hover:bg-[#4f8cff]/40 transition-all z-20 group relative'
              onMouseDown={() => handleStartResize('terminal')}
            >
              <div className='absolute inset-x-0 -inset-y-1.5' /> {/* Expand hit area */}
            </div>
            <div
              className='flex-shrink-0 border-t border-[#1c222d] bg-[#0b0d12]'
              style={{ height: `${layout.terminalHeight}px` }}
            >
              <TerminalPanel projectPath={projectPath} />
            </div>
          </aside>
        </div>
      )}
      <CommandPalette />
    </div>
  );
});
