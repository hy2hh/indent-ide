import React, { useCallback, useRef, useState, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useEditorStore } from '../../stores/editorStore.js';
import { useAgentStore } from '../../stores/agentStore.js';
import { useUiStore } from '../../stores/uiStore.js';
import { useProjectStore } from '../../stores/projectStore.js';

export const CodeEditor = React.memo(function CodeEditor() {
  const { tabs, activeTabId, updateTabContent, setCursorPosition } = useEditorStore();
  const { startPipeline } = useAgentStore();
  const { projectPath } = useProjectStore();
  const { setCenterPanelMode } = useUiStore();
  const monaco = useMonaco();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const [showAskOverlay, setShowAskOverlay] = useState(false);
  const [askPrompt, setAskPrompt] = useState('');
  const [askPosition, setAskPosition] = useState({ top: 0, left: 0 });

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (activeTabId && value !== undefined) {
        updateTabContent(activeTabId, value);
      }
    },
    [activeTabId, updateTabContent]
  );

  const handleEditorMount = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor: any) => {
      editorRef.current = editor;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.onDidChangeCursorPosition((e: any) => {
        setCursorPosition({
          line: e.position.lineNumber,
          column: e.position.column,
        });
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.addCommand((monaco as any)?.KeyMod.CtrlCmd | (monaco as any)?.KeyCode.KeyK, () => {
        const selection = editor.getSelection();
        if (!selection) {
          return;
        }

        const position = editor.getScrolledVisiblePosition(selection.getStartPosition());
        if (position) {
          setAskPosition({
            top: Math.max(0, position.top - 40),
            left: Math.max(0, position.left),
          });
        } else {
          setAskPosition({ top: 40, left: 40 });
        }
        setAskPrompt('');
        setShowAskOverlay(true);
      });
    },
    [setCursorPosition, monaco]
  );

  useEffect(() => {
    if (showAskOverlay) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowAskOverlay(false);
        }
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
    return undefined;
  }, [showAskOverlay]);

  const handleAskSubmit = useCallback(async () => {
    if (!askPrompt.trim() || !activeTab || !projectPath || !editorRef.current) {
      return;
    }

    const editor = editorRef.current;
    const selection = editor.getSelection();
    let codeContext = '';

    if (selection && !selection.isEmpty()) {
      const model = editor.getModel();
      if (model) {
        codeContext = model.getValueInRange(selection);
      }
    }

    const goal = `In \`${activeTab.filePath}\`\n\n${
      codeContext ? `Selected code:\n\`\`\`\n${codeContext}\n\`\`\`\n\n` : ''
    }Task: ${askPrompt.trim()}`;

    setShowAskOverlay(false);
    setAskPrompt('');
    setCenterPanelMode('split');
    await startPipeline(goal, projectPath);
  }, [askPrompt, activeTab, projectPath, startPipeline, setCenterPanelMode]);

  if (!activeTab) {
    return (
      <div className='flex h-full items-center justify-center text-[#505060] bg-[#0b0d12]'>
        <div className='text-center opacity-40'>
          <div className='w-16 h-16 mx-auto mb-4 rounded-2xl border-2 border-[#1c222d] flex items-center justify-center'>
            <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5'>
              <path d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' /><polyline points='14 2 14 8 20 8' />
            </svg>
          </div>
          <p className='text-xs font-bold tracking-widest uppercase'>Intent Editor</p>
          <p className='text-[10px] mt-2'>Select a file from the explorer</p>
        </div>
      </div>
    );
  }

  return (
    <div className='relative h-full w-full bg-[#0b0d12]'>
      <Editor
        height='100%'
        language={activeTab.language ?? 'text'}
        value={activeTab.content ?? ''}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme='vs-dark'
        options={{
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineNumbers: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true },
          padding: { top: 16 },
        }}
      />
      
      {showAskOverlay && (
        <div 
          className='absolute z-50 flex items-center gap-2 p-1.5 rounded-lg border border-[#4f8cff]/30 bg-[#131722]/95 backdrop-blur-xl shadow-2xl'
          style={{ top: askPosition.top, left: askPosition.left, minWidth: '400px', transform: 'translateY(-100%)' }}
        >
          <div className='flex-shrink-0 pl-2 pr-1'>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#4f8cff' strokeWidth='2.5'>
              <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
            </svg>
          </div>
          <input
            autoFocus
            value={askPrompt}
            onChange={(e) => setAskPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handleAskSubmit();
              }
            }}
            placeholder='Ask agent to modify this code... (Press Enter)'
            className='flex-1 bg-transparent text-[11px] text-[#e4e4eb] placeholder-[#505060] focus:outline-none py-1'
          />
          <kbd className='px-1.5 py-0.5 rounded bg-[#0b0d12] border border-[#1c222d] text-[9px] text-[#666672] font-mono'>esc</kbd>
        </div>
      )}
    </div>
  );
});
