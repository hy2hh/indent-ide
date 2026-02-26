import React, { useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore.js';
import { useEditorStore } from '../../stores/editorStore.js';
import type { FileTreeNode } from '@intent-ide/core';

export const FileExplorer = React.memo(function FileExplorer() {
  const { projectPath, fileTree, openProject, indexProject, isIndexing, indexProgress } =
    useProjectStore();
  const { openFile } = useEditorStore();

  const handleOpenProject = useCallback(async () => {
    await openProject();
  }, [openProject]);

  const handleIndexProject = useCallback(async () => {
    await indexProject();
  }, [indexProject]);

  return (
    <div className='flex flex-col h-full bg-[#0b0d12] font-sans'>
      {/* Header */}
      <div className='flex items-center justify-between px-4 py-3 border-b border-[#1c222d] bg-[#0b0d12]'>
        <span className='text-[10px] font-bold uppercase tracking-widest text-[#505060]'>Explorer</span>
        <button
          onClick={handleOpenProject}
          className='text-[10px] font-bold text-[#4f8cff] hover:text-[#8bb8ff] transition-colors uppercase tracking-widest'
        >
          Open
        </button>
      </div>

      {/* Index Button */}
      {projectPath && (
        <div className='px-4 py-3 border-b border-[#1c222d] bg-[#131722]/20'>
          <button
            onClick={handleIndexProject}
            disabled={isIndexing}
            className={`w-full text-[10px] font-bold py-1.5 px-3 rounded-lg border transition-all uppercase tracking-widest ${
              isIndexing 
                ? 'bg-[#1b315e]/20 border-[#1b315e]/30 text-[#4f8cff]' 
                : 'bg-[#0b0d12] border-[#1c222d] text-[#505060] hover:text-[#a1acc5] hover:border-[#262d3d]'
            }`}
          >
            {isIndexing ? `Indexing ${indexProgress}%` : 'Reindex Files'}
          </button>
        </div>
      )}

      {/* File Tree */}
      <div className='flex-1 overflow-y-auto py-2 custom-scrollbar'>
        {projectPath ? (
          fileTree.length > 0 ? (
            fileTree.map((node) => (
              <FileTreeItem
                key={node.path}
                node={node}
                depth={0}
                onFileClick={openFile}
              />
            ))
          ) : (
            <div className='px-6 py-8 text-center opacity-20'>
               <p className='text-[10px] font-bold uppercase tracking-widest text-[#505060]'>No Files</p>
            </div>
          )
        ) : (
          <div className='px-6 py-12 flex flex-col items-center justify-center gap-4 opacity-20'>
             <div className='w-10 h-10 rounded-2xl border-2 border-[#1c222d] flex items-center justify-center'>
                <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#505060' strokeWidth='2'>
                  <path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' />
                </svg>
             </div>
             <p className='text-[10px] font-bold uppercase tracking-[0.2em] text-[#505060] text-center'>
               Project Required
             </p>
          </div>
        )}
      </div>
    </div>
  );
});

interface FileTreeItemProps {
  node: FileTreeNode;
  depth: number;
  onFileClick: (path: string) => void;
}

const FileTreeItem = React.memo(function FileTreeItem({
  node,
  depth,
  onFileClick,
}: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = React.useState(depth < 1);

  const handleClick = useCallback(() => {
    if (node.type === 'directory') {
      setIsExpanded((prev) => !prev);
    } else {
      onFileClick(node.path);
    }
  }, [node.type, node.path, onFileClick]);

  const indent = depth * 12;
  const isDir = node.type === 'directory';

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full text-left flex items-center gap-2.5 px-4 py-1 text-[11px] transition-colors group ${
          isDir ? 'text-[#a1acc5] hover:bg-[#131722]/50' : 'text-[#666672] hover:bg-[#131722]/80 hover:text-[#e4e4eb]'
        }`}
        style={{ paddingLeft: `${16 + indent}px` }}
      >
        <span className='flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity'>
          {isDir ? (
            <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              <polyline points='9 18 15 12 9 6' />
            </svg>
          ) : (
            <div className='w-1 h-1 rounded-full bg-current' />
          )}
        </span>
        <span className='truncate font-mono tracking-tight'>{node.name}</span>
      </button>
      {isDir && isExpanded && node.children?.map((child) => (
        <FileTreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
});

