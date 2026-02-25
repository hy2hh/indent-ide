import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LivingSpecData } from '@intent-ide/core';
import { useProjectStore } from './stores/projectStore.js';
import {
  useAgentStore,
  type AgentEvent,
  type ConversationItemType,
  type PipelineStatus,
} from './stores/agentStore.js';
import { useUiStore } from './stores/uiStore.js';
import { AgentSidebar } from './components/sidebar/AgentSidebar.js';
import { ConversationPanel } from './components/conversation/ConversationPanel.js';
import { SpecPanel } from './components/spec/SpecPanel.js';
import { TerminalPanel } from './components/terminal/TerminalPanel.js';
import { WelcomeScreen } from './components/welcome/WelcomeScreen.js';
import { BrowserPanel } from './components/browser/BrowserPanel.js';
import { CommandPalette } from './components/palette/CommandPalette.js';

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
    currentLayoutId,
    savedLayouts,
    applyBuiltinLayout,
    applySavedLayout,
    removeSavedLayout,
    saveLayout,
    setRightPanelMode,
    openBrowserUrl,
    updateLayout,
  } = useUiStore();
  const [selectedSavedLayout, setSelectedSavedLayout] = useState('');
  const savedLayoutNames = useMemo(() => Object.keys(savedLayouts).sort(), [savedLayouts]);
  const resizeModeRef = useRef<ResizeMode | null>(null);

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

  const handleSaveLayout = () => {
    const value = window.prompt('Save current layout as:');
    if (!value) {
      return;
    }
    const ok = saveLayout(value);
    if (!ok) {
      return;
    }
    const normalized = value.trim().slice(0, 32);
    setSelectedSavedLayout(normalized);
  };

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
    <div className='flex h-screen w-screen flex-col overflow-hidden bg-[#0f1116] text-[#eef2ff] text-sm select-none'>
      <div
        className='relative flex h-[44px] flex-shrink-0 items-center border-b border-[#262d3d] bg-[#0b0d12]/95 px-3'
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className='flex items-center gap-2' style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <span className='h-2.5 w-2.5 rounded-full bg-[#ff5f57]' />
          <span className='h-2.5 w-2.5 rounded-full bg-[#febc2e]' />
          <span className='h-2.5 w-2.5 rounded-full bg-[#28c840]' />
          <span className='ml-3 text-[11px] tracking-wide text-[#a1acc5]'>Intent IDE</span>
        </div>

        <div className='pointer-events-none absolute inset-x-0 flex justify-center px-24'>
          <div
            className='pointer-events-auto flex min-w-[320px] max-w-[640px] flex-1 items-center gap-2 rounded-md border border-[#262d3d] bg-[#131722]/90 px-3 py-1.5 text-xs text-[#a1acc5]'
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <svg width='12' height='12' viewBox='0 0 12 12' fill='none' className='flex-shrink-0'>
              <circle cx='5' cy='5' r='4' stroke='#7f8aa3' strokeWidth='1.2' />
              <path d='M8.5 8.5L11 11' stroke='#7f8aa3' strokeWidth='1.2' strokeLinecap='round' />
            </svg>
            <span className='truncate'>
              {projectPath ?? 'Open a project to begin'}
            </span>
          </div>
        </div>

        <div className='ml-auto flex items-center gap-2' style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <select
            value={currentLayoutId === 'custom' ? 'default' : currentLayoutId}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'default' || value === 'focus' || value === 'review') {
                applyBuiltinLayout(value);
              }
            }}
            className='h-6 rounded border border-[#262d3d] bg-[#131722] px-2 text-[10px] text-[#a1acc5] focus:outline-none focus:border-[#4f8cff]'
            title='Built-in workspace layouts'
          >
            <option value='default'>Layout: Default</option>
            <option value='focus'>Layout: Focus</option>
            <option value='review'>Layout: Review</option>
          </select>
          {savedLayoutNames.length > 0 && (
            <select
              value={selectedSavedLayout}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedSavedLayout(value);
                if (value) {
                  applySavedLayout(value);
                }
              }}
              className='h-6 rounded border border-[#262d3d] bg-[#131722] px-2 text-[10px] text-[#a1acc5] focus:outline-none focus:border-[#4f8cff]'
              title='Saved workspace layouts'
            >
              <option value=''>Saved Layouts</option>
              {savedLayoutNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleSaveLayout}
            className='h-6 rounded border border-[#33405a] bg-[#142343] px-2 text-[10px] text-[#8bb8ff] hover:bg-[#1b315e] transition-colors'
            title='Save current layout'
          >
            Save
          </button>
          {selectedSavedLayout && (
            <button
              onClick={() => {
                removeSavedLayout(selectedSavedLayout);
                setSelectedSavedLayout('');
              }}
              className='h-6 rounded border border-[#3e2a34] bg-[#1a1118] px-2 text-[10px] text-[#f2a8bf] hover:bg-[#241722] transition-colors'
              title='Delete selected saved layout'
            >
              Delete
            </button>
          )}
          <button
            onClick={() => openBrowserUrl('http://localhost:3000')}
            className='h-6 rounded border border-[#33405a] bg-[#0f1f3b] px-2 text-[10px] text-[#8bb8ff] hover:bg-[#1a315d] transition-colors'
            title='Open local preview'
          >
            Localhost
          </button>
          <span className='rounded border border-[#33405a] bg-[#131722] px-1.5 py-0.5 text-[10px] text-[#8bb8ff]'>
            {projectPath ? projectPath.split('/').pop() : 'No Project'}
          </span>
          <kbd className='rounded border border-[#262d3d] bg-[#131722] px-1.5 py-0.5 text-[10px] text-[#667085]'>⌘K</kbd>
        </div>
      </div>

      {!projectPath ? (
        <WelcomeScreen />
      ) : (
        <div className='flex min-h-0 flex-1'>
          <aside
            className='flex flex-shrink-0 flex-col border-r border-[#262d3d] bg-[#131722]/90'
            style={{ width: `${layout.leftWidth}px` }}
          >
            <AgentSidebar />
          </aside>
          <div
            className='w-1 cursor-col-resize bg-transparent hover:bg-[#33405a]/55 transition-colors'
            onMouseDown={() => handleStartResize('left')}
            role='separator'
            aria-orientation='vertical'
            title='Resize sidebar'
          />

          <div className='flex min-w-0 flex-1 flex-col bg-[#10141d]/80'>
            <ConversationPanel />
          </div>
          <div
            className='w-1 cursor-col-resize bg-transparent hover:bg-[#33405a]/55 transition-colors'
            onMouseDown={() => handleStartResize('right')}
            role='separator'
            aria-orientation='vertical'
            title='Resize right panel'
          />

          <aside
            className='flex flex-shrink-0 flex-col bg-[#131722]/90'
            style={{ width: `${layout.rightWidth}px` }}
          >
            <div className='flex h-9 flex-shrink-0 items-center justify-between border-b border-[#262d3d] px-3'>
              <div className='flex items-center gap-1'>
                <button
                  onClick={() => setRightPanelMode('spec')}
                  className={`rounded px-2 py-1 text-[10px] transition-colors ${
                    rightPanelMode === 'spec'
                      ? 'bg-[#1b315e] text-[#cfe0ff]'
                      : 'text-[#8c97b1] hover:bg-[#1a2030] hover:text-[#d6def2]'
                  }`}
                >
                  Spec
                </button>
                <button
                  onClick={() => setRightPanelMode('browser')}
                  className={`rounded px-2 py-1 text-[10px] transition-colors ${
                    rightPanelMode === 'browser'
                      ? 'bg-[#1b315e] text-[#cfe0ff]'
                      : 'text-[#8c97b1] hover:bg-[#1a2030] hover:text-[#d6def2]'
                  }`}
                >
                  Browser
                </button>
              </div>
              <span className='text-[10px] uppercase tracking-wider text-[#667085]'>
                {rightPanelMode === 'spec' ? 'Intent Notes' : 'Embedded Browser'}
              </span>
            </div>
            <div className='flex min-h-0 flex-1 flex-col'>
              {rightPanelMode === 'spec' ? <SpecPanel /> : <BrowserPanel />}
            </div>
            <div
              className='h-1 cursor-row-resize bg-transparent hover:bg-[#33405a]/55 transition-colors'
              onMouseDown={() => handleStartResize('terminal')}
              role='separator'
              aria-orientation='horizontal'
              title='Resize terminal'
            />
            <div
              className='flex-shrink-0 border-t border-[#262d3d]'
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
