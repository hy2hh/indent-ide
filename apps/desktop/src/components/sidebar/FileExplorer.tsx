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
    <div className='flex flex-col h-full'>
      {/* Header */}
      <div className='flex items-center justify-between px-3 py-2 border-b border-[#313244]'>
        <span className='text-xs font-semibold uppercase text-[#6c7086]'>Explorer</span>
        <button
          onClick={handleOpenProject}
          className='text-xs text-[#89b4fa] hover:text-[#cdd6f4] transition-colors'
          title='Open Project'
        >
          Open
        </button>
      </div>

      {/* Index Button */}
      {projectPath && (
        <div className='px-3 py-2 border-b border-[#313244]'>
          <button
            onClick={handleIndexProject}
            disabled={isIndexing}
            className='w-full text-xs py-1 px-2 rounded bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a] disabled:opacity-50 transition-colors'
          >
            {isIndexing ? `Indexing... ${indexProgress}%` : 'Index Project'}
          </button>
        </div>
      )}

      {/* File Tree */}
      <div className='flex-1 overflow-y-auto py-1'>
        {projectPath ? (
          fileTree.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              depth={0}
              onFileClick={openFile}
            />
          ))
        ) : (
          <div className='px-3 py-4 text-xs text-[#6c7086] text-center'>
            Click &quot;Open&quot; to open a project
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
  const [isExpanded, setIsExpanded] = React.useState(depth < 2);

  const handleClick = useCallback(() => {
    if (node.type === 'directory') {
      setIsExpanded((prev) => !prev);
    } else {
      onFileClick(node.path);
    }
  }, [node.type, node.path, onFileClick]);

  const icon = node.type === 'directory' ? (isExpanded ? '▾' : '▸') : '·';
  const indent = depth * 12;

  return (
    <div>
      <button
        onClick={handleClick}
        className='w-full text-left flex items-center gap-1.5 px-2 py-0.5 text-xs hover:bg-[#313244] transition-colors text-[#cdd6f4]'
        style={{ paddingLeft: `${8 + indent}px` }}
      >
        <span className='text-[#6c7086] flex-shrink-0'>{icon}</span>
        <span className='truncate'>{node.name}</span>
      </button>
      {node.type === 'directory' && isExpanded && node.children?.map((child) => (
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
