import React, { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore.js';
import { useAgentStore } from '../../stores/agentStore.js';
import { useUiStore } from '../../stores/uiStore.js';

interface PaletteAction {
  id: string;
  label: string;
  description: string;
  run: () => void | Promise<void>;
}

export const CommandPalette = React.memo(function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');

  const { projectPath, openProject, createProject } = useProjectStore();
  const { queuedGoals, isQueuePaused, clearQueuedGoals, toggleQueuePaused, startPipeline } = useAgentStore();
  const {
    setRightPanelMode,
    openBrowserUrl,
    applyBuiltinLayout,
    saveLayout,
  } = useUiStore();

  const actions = useMemo<PaletteAction[]>(() => {
    const baseActions: PaletteAction[] = [
      {
        id: 'panel-spec',
        label: 'Show Spec Panel',
        description: 'Switch right panel to spec/notes mode',
        run: () => setRightPanelMode('spec'),
      },
      {
        id: 'panel-browser',
        label: 'Show Browser Panel',
        description: 'Switch right panel to embedded browser mode',
        run: () => setRightPanelMode('browser'),
      },
      {
        id: 'browser-intent',
        label: 'Open Intent Product Page',
        description: 'Open augmentcode.com/product/intent in browser panel',
        run: () => openBrowserUrl('https://www.augmentcode.com/product/intent'),
      },
      {
        id: 'browser-docs',
        label: 'Open Intent Docs',
        description: 'Open docs.augmentcode.com/features/intent',
        run: () => openBrowserUrl('https://docs.augmentcode.com/features/intent'),
      },
      {
        id: 'browser-localhost',
        label: 'Open localhost:3000',
        description: 'Open local development app in browser panel',
        run: () => openBrowserUrl('http://localhost:3000'),
      },
      {
        id: 'layout-default',
        label: 'Apply Layout: Default',
        description: 'Balanced panel widths and terminal size',
        run: () => applyBuiltinLayout('default'),
      },
      {
        id: 'layout-focus',
        label: 'Apply Layout: Focus',
        description: 'Smaller side panes to focus on conversation',
        run: () => applyBuiltinLayout('focus'),
      },
      {
        id: 'layout-review',
        label: 'Apply Layout: Review',
        description: 'Wider side panes for spec and diff review',
        run: () => applyBuiltinLayout('review'),
      },
      {
        id: 'layout-save',
        label: 'Save Current Layout',
        description: 'Persist current pane sizes as a reusable preset',
        run: () => {
          const name = window.prompt('Layout name');
          if (!name) {
            return;
          }
          saveLayout(name);
        },
      },
      {
        id: 'project-open',
        label: 'Open Project Folder',
        description: 'Choose another repository folder',
        run: async () => {
          await openProject();
        },
      },
      {
        id: 'project-create',
        label: 'Create New Project',
        description: 'Create a new project from the welcome workflow',
        run: async () => {
          await createProject();
        },
      },
      {
        id: 'queue-toggle',
        label: isQueuePaused ? 'Resume Background Queue' : 'Pause Background Queue',
        description: 'Toggle auto-run for queued goals',
        run: () => toggleQueuePaused(),
      },
      {
        id: 'queue-clear',
        label: 'Clear Background Queue',
        description: 'Remove all queued goals',
        run: () => clearQueuedGoals(),
      },
    ];

    if (projectPath) {
      baseActions.push({
        id: 'goal-run',
        label: 'Run Goal Prompt',
        description: 'Enter a quick goal and start/queue it immediately',
        run: async () => {
          const goal = window.prompt('Goal to run');
          if (!goal) {
            return;
          }
          await startPipeline(goal, projectPath);
        },
      });
    }

    return baseActions;
  }, [
    applyBuiltinLayout,
    clearQueuedGoals,
    createProject,
    isQueuePaused,
    openBrowserUrl,
    openProject,
    projectPath,
    saveLayout,
    setRightPanelMode,
    startPipeline,
    toggleQueuePaused,
  ]);

  const filteredActions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return actions;
    }
    return actions.filter((action) =>
      action.label.toLowerCase().includes(normalizedQuery) ||
      action.description.toLowerCase().includes(normalizedQuery)
    );
  }, [actions, query]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const metaOrCtrl = event.metaKey || event.ctrlKey;
      if (metaOrCtrl && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
        return;
      }

      if (!open) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(filteredActions.length - 1, 0)));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const selected = filteredActions[selectedIndex];
        if (selected) {
          void selected.run();
          setOpen(false);
          setQuery('');
          setSelectedIndex(0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredActions, open, selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  if (!open) {
    return null;
  }

  return (
    <div
      className='fixed inset-0 z-[120] flex items-start justify-center bg-[#05070b]/70 pt-20'
      onClick={() => setOpen(false)}
    >
      <div
        className='w-[min(760px,92vw)] overflow-hidden rounded-xl border border-[#2b3550] bg-[#101621] shadow-[0_24px_80px_rgba(0,0,0,0.55)]'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='border-b border-[#262d3d] px-4 py-3'>
          <input
            autoFocus
            value={inputValue}
            onChange={(event) => {
              const value = event.target.value;
              setInputValue(value);
              setQuery(value);
            }}
            placeholder='Search commands (layout, browser, queue, project...)'
            className='h-9 w-full rounded-md border border-[#33405a] bg-[#0d111a] px-3 text-sm text-[#d4ddf6] placeholder-[#667085] focus:outline-none focus:border-[#4f8cff]'
          />
          <p className='mt-2 text-[10px] text-[#7f8aa3]'>
            {queuedGoals.length > 0
              ? `${queuedGoals.length} queued goal${queuedGoals.length === 1 ? '' : 's'}`
              : 'No queued goals'} · {isQueuePaused ? 'Queue paused' : 'Queue active'}
          </p>
        </div>
        <div className='max-h-[420px] overflow-y-auto py-1'>
          {filteredActions.length === 0 ? (
            <p className='px-4 py-5 text-xs text-[#7f8aa3]'>No command matches your query.</p>
          ) : (
            filteredActions.map((action, index) => (
              <button
                key={action.id}
                onClick={() => {
                  void action.run();
                  setOpen(false);
                  setQuery('');
                  setSelectedIndex(0);
                }}
                className={`w-full px-4 py-2.5 text-left transition-colors ${
                  index === selectedIndex ? 'bg-[#1a2740]' : 'hover:bg-[#151d2d]'
                }`}
              >
                <p className='text-sm text-[#e5ebff]'>{action.label}</p>
                <p className='mt-0.5 text-[11px] text-[#8b97b3]'>{action.description}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
});
