import React, { useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '../../stores/editorStore.js';

export const CodeEditor = React.memo(function CodeEditor() {
  const { tabs, activeTabId, updateTabContent, setCursorPosition } = useEditorStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (activeTabId && value !== undefined) {
        updateTabContent(activeTabId, value);
      }
    },
    [activeTabId, updateTabContent]
  );

  const handleEditorMount = useCallback(
    (editor: { onDidChangeCursorPosition: (cb: (e: { position: { lineNumber: number; column: number } }) => void) => void }) => {
      editor.onDidChangeCursorPosition((e) => {
        setCursorPosition({
          line: e.position.lineNumber,
          column: e.position.column,
        });
      });
    },
    [setCursorPosition]
  );

  if (!activeTab) {
    return (
      <div className='flex h-full items-center justify-center text-[#6c7086]'>
        <div className='text-center'>
          <p className='text-lg mb-2'>Intent IDE</p>
          <p className='text-sm'>Open a file from the explorer or use the Composer to start</p>
        </div>
      </div>
    );
  }

  return (
    <Editor
      height='100%'
      language={activeTab.language ?? 'text'}
      value={activeTab.content ?? ''}
      onChange={handleChange}
      onMount={handleEditorMount}
      theme='vs-dark'
      options={{
        fontSize: 14,
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
      }}
    />
  );
});
