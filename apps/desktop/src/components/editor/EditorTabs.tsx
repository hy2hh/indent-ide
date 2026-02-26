import React, { useCallback } from 'react';
import { useEditorStore } from '../../stores/editorStore.js';

export const EditorTabs = React.memo(function EditorTabs() {
  const { tabs, activeTabId, setActiveTab, closeTab, saveTab } = useEditorStore();

  const handleTabClick = useCallback(
    (tabId: string) => { setActiveTab(tabId); },
    [setActiveTab]
  );

  const handleClose = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      closeTab(tabId);
    },
    [closeTab]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && activeTabId) {
        e.preventDefault();
        saveTab(activeTabId);
      }
    },
    [activeTabId, saveTab]
  );

  if (tabs.length === 0) {
    return <div className='h-9 border-b border-[#1c222d] bg-[#0b0d12]' />;
  }

  return (
    <div
      className='flex h-9 border-b border-[#1c222d] bg-[#0b0d12] overflow-x-auto no-scrollbar'
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          className={`
            group flex items-center gap-2 px-4 h-full text-[11px] whitespace-nowrap border-r border-[#1c222d]
            transition-colors min-w-0 font-mono tracking-tight
            ${tab.id === activeTabId
              ? 'bg-[#131722] text-[#e4e4eb] border-t-[3px] border-t-[#4f8cff]'
              : 'bg-[#0b0d12] text-[#505060] hover:bg-[#131722]/50 hover:text-[#a1acc5] border-t-[3px] border-t-transparent'
            }
          `}
        >
          <span className='truncate max-w-32'>{tab.fileName}</span>
          {tab.isDirty && <span className='w-1.5 h-1.5 rounded-full bg-[#f59e0b]' />}
          <span
            role='button'
            tabIndex={0}
            onClick={(e) => handleClose(e, tab.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') { handleClose(e as unknown as React.MouseEvent, tab.id); } }}
            className={`ml-1 cursor-pointer transition-opacity ${tab.id === activeTabId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} hover:text-[#ef4444] text-[14px] leading-none`}
            aria-label={`Close ${tab.fileName}`}
          >
            ×
          </span>
        </button>
      ))}
    </div>
  );
});
