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
    return <div className='h-9 border-b border-[#313244] bg-[#181825]' />;
  }

  return (
    <div
      className='flex h-9 border-b border-[#313244] bg-[#181825] overflow-x-auto'
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          className={`
            flex items-center gap-2 px-3 h-full text-xs whitespace-nowrap border-r border-[#313244]
            transition-colors min-w-0
            ${tab.id === activeTabId
              ? 'bg-[#1e1e2e] text-[#cdd6f4] border-t-2 border-t-[#89b4fa]'
              : 'bg-[#181825] text-[#6c7086] hover:bg-[#1e1e2e] hover:text-[#cdd6f4]'
            }
          `}
        >
          <span className='truncate max-w-32'>{tab.fileName}</span>
          {tab.isDirty && <span className='w-2 h-2 rounded-full bg-[#f38ba8]' />}
          <span
            role='button'
            tabIndex={0}
            onClick={(e) => handleClose(e, tab.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') { handleClose(e as unknown as React.MouseEvent, tab.id); } }}
            className='ml-1 hover:text-[#f38ba8] cursor-pointer'
            aria-label={`Close ${tab.fileName}`}
          >
            ×
          </span>
        </button>
      ))}
    </div>
  );
});
