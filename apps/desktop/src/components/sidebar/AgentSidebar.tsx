import React, { useState, useCallback, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore.js';
import { useAgentStore, type CheckpointPreview } from '../../stores/agentStore.js';
import { ChangesPanel } from './ChangesPanel.js';
import { FileExplorer } from './FileExplorer.js';

const TABS = ['Agents', 'Changes', 'Files'];

export const AgentSidebar = React.memo(function AgentSidebar() {
  const [activeTab, setActiveTab] = useState('Agents');
  const [checkpointMessage, setCheckpointMessage] = useState<string | null>(null);
  const [checkpointError, setCheckpointError] = useState<string | null>(null);
  const [checkpointBusy, setCheckpointBusy] = useState(false);
  const [checkpointNameDrafts, setCheckpointNameDrafts] = useState<Record<string, string>>({});
  const [checkpointPreview, setCheckpointPreview] = useState<CheckpointPreview | null>(null);
  const { projectPath, openProject } = useProjectStore();
  const {
    pipelineStatus,
    conversationItems,
    currentSpec,
    checkpoints,
    reset,
    createCheckpoint,
    loadCheckpoints,
    renameCheckpoint,
    getCheckpointPreview,
    restoreCheckpoint,
    restoreLatestCheckpoint,
    deleteCheckpoint,
  } = useAgentStore();

  const projectName = projectPath ? (projectPath.split('/').pop() ?? 'Project') : 'Project';

  // conversationItems에서 에이전트 목록 추출
  const agentMap = new Map<string, { status: string; summary?: string; files?: string[] }>();
  for (const item of conversationItems) {
    if (item.type === 'agent-started') {
      if (!agentMap.has(item.agentId)) {
        agentMap.set(item.agentId, { status: 'running' });
      }
    } else if (item.type === 'agent-completed') {
      agentMap.set(item.agentId, { status: 'completed', summary: item.summary, files: item.files });
    } else if (item.type === 'agent-failed') {
      agentMap.set(item.agentId, { status: 'failed', summary: item.error });
    }
  }
  const agents = Array.from(agentMap.entries());
  const runningCount = agents.filter(([, v]) => v.status === 'running').length;

  const AGENT_COLORS: Record<string, string> = {
    coordinator: '#9333ea',
    verifier: '#3b82f6',
  };

  function getAgentColor(id: string): string {
    return AGENT_COLORS[id] ?? '#22c55e';
  }

  const handleOpenProject = useCallback(() => {
    void openProject();
  }, [openProject]);

  const handleSaveCheckpoint = useCallback(async () => {
    if (!projectPath) {
      return;
    }
    setCheckpointBusy(true);
    setCheckpointError(null);
    setCheckpointMessage(null);

    const label = currentSpec?.goal ?? 'session';
    const result = await createCheckpoint(projectPath, label);

    if (result.success) {
      setCheckpointMessage(result.message ?? 'Checkpoint saved.');
      void loadCheckpoints(projectPath);
    } else {
      setCheckpointError(result.error ?? 'Failed to save checkpoint.');
    }
    setCheckpointBusy(false);
  }, [projectPath, currentSpec, createCheckpoint, loadCheckpoints]);

  const handleRestoreCheckpoint = useCallback(async () => {
    if (!projectPath) {
      return;
    }
    setCheckpointBusy(true);
    setCheckpointError(null);
    setCheckpointMessage(null);

    const result = await restoreLatestCheckpoint(projectPath);

    if (result.success) {
      setCheckpointMessage(result.message ?? 'Checkpoint restored.');
      void loadCheckpoints(projectPath);
    } else {
      setCheckpointError(result.error ?? 'Failed to restore checkpoint.');
    }
    setCheckpointBusy(false);
  }, [projectPath, restoreLatestCheckpoint, loadCheckpoints]);

  const handleRestoreCheckpointItem = useCallback(async (filePath: string) => {
    if (!projectPath) {
      return;
    }
    setCheckpointBusy(true);
    setCheckpointError(null);
    setCheckpointMessage(null);

    const result = await restoreCheckpoint(projectPath, filePath);
    if (result.success) {
      setCheckpointMessage(result.message ?? 'Checkpoint restored.');
      setCheckpointPreview(null);
    } else {
      setCheckpointError(result.error ?? 'Failed to restore checkpoint.');
    }
    setCheckpointBusy(false);
  }, [projectPath, restoreCheckpoint]);

  const handlePreviewCheckpointItem = useCallback(async (filePath: string) => {
    if (!projectPath) {
      return;
    }
    setCheckpointBusy(true);
    setCheckpointError(null);
    setCheckpointMessage(null);

    const result = await getCheckpointPreview(projectPath, filePath);
    if (result.success && result.preview) {
      setCheckpointPreview(result.preview);
    } else {
      setCheckpointError(result.error ?? 'Failed to load checkpoint preview.');
    }
    setCheckpointBusy(false);
  }, [projectPath, getCheckpointPreview]);

  const handleRenameCheckpointItem = useCallback(async (filePath: string) => {
    if (!projectPath) {
      return;
    }

    const draft = checkpointNameDrafts[filePath]?.trim();
    if (!draft) {
      setCheckpointError('Checkpoint name is required.');
      return;
    }

    setCheckpointBusy(true);
    setCheckpointError(null);
    setCheckpointMessage(null);

    const result = await renameCheckpoint(projectPath, filePath, draft);
    if (result.success) {
      setCheckpointMessage(result.message ?? 'Checkpoint renamed.');
      if (checkpointPreview?.filePath === filePath) {
        setCheckpointPreview(null);
      }
    } else {
      setCheckpointError(result.error ?? 'Failed to rename checkpoint.');
    }
    setCheckpointBusy(false);
  }, [projectPath, checkpointNameDrafts, renameCheckpoint, checkpointPreview]);

  const handleDeleteCheckpointItem = useCallback(async (filePath: string) => {
    if (!projectPath) {
      return;
    }
    setCheckpointBusy(true);
    setCheckpointError(null);
    setCheckpointMessage(null);

    const result = await deleteCheckpoint(projectPath, filePath);
    if (result.success) {
      setCheckpointMessage(result.message ?? 'Checkpoint deleted.');
      if (checkpointPreview?.filePath === filePath) {
        setCheckpointPreview(null);
      }
    } else {
      setCheckpointError(result.error ?? 'Failed to delete checkpoint.');
    }
    setCheckpointBusy(false);
  }, [projectPath, deleteCheckpoint, checkpointPreview]);

  const handleRefreshCheckpoints = useCallback(async () => {
    if (!projectPath) {
      return;
    }
    setCheckpointBusy(true);
    setCheckpointError(null);
    const result = await loadCheckpoints(projectPath);
    if (!result.success) {
      setCheckpointError(result.error ?? 'Failed to load checkpoints.');
    }
    setCheckpointBusy(false);
  }, [projectPath, loadCheckpoints]);

  useEffect(() => {
    if (!projectPath) {
      return;
    }
    setCheckpointPreview(null);
    void loadCheckpoints(projectPath);
  }, [projectPath, loadCheckpoints]);

  useEffect(() => {
    setCheckpointNameDrafts((prev) => {
      const next: Record<string, string> = {};
      for (const checkpoint of checkpoints) {
        next[checkpoint.filePath] = prev[checkpoint.filePath] ?? checkpoint.name;
      }
      return next;
    });
  }, [checkpoints]);

  return (
    <div className='flex flex-col h-full overflow-hidden font-sans'>
      {/* Project Header */}
      <div className='px-4 pt-4 pb-3 border-b border-[#2a2a33]'>
        <div className='flex items-start justify-between mb-1'>
          <div className='flex-1 min-w-0'>
            <h1 className='text-sm font-semibold text-[#e4e4eb] truncate'>{projectName}</h1>
            <p className='text-xs text-[#666672] mt-0.5'>{projectPath ?? ''}</p>
          </div>
          <button
            onClick={handleOpenProject}
            className='text-[#666672] hover:text-[#e4e4eb] transition-colors ml-2 flex-shrink-0'
            title='Open different project'
          >
            <svg width='13' height='13' viewBox='0 0 13 13' fill='none'>
              <path d='M2 4h5l2 2h4v6H2V4z' stroke='currentColor' strokeWidth='1.2' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </button>
        </div>
        <p className='text-xs text-[#888892] mt-2'>
          {pipelineStatus === 'running'
            ? `Running ${runningCount} agent${runningCount !== 1 ? 's' : ''}...`
            : pipelineStatus === 'completed'
              ? 'Pipeline completed.'
              : pipelineStatus === 'failed'
                ? 'Pipeline failed.'
                : 'Ready.'}
        </p>
      </div>

      {/* Tabs */}
      <div className='flex border-b border-[#2a2a33] flex-shrink-0 gap-1 px-2'>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2 py-2 text-xs transition-colors relative whitespace-nowrap ${
              activeTab === tab ? 'text-[#e4e4eb]' : 'text-[#888892] hover:text-[#c4c4cc]'
            }`}
          >
            {tab}
            {activeTab === tab && <div className='absolute bottom-0 left-0 right-0 h-px bg-[#e4e4eb]' />}
          </button>
        ))}
      </div>

      {/* Agents Tab */}
      {activeTab === 'Agents' && (
        <div className='flex-1 overflow-y-auto'>
          {agents.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full gap-3 px-4'>
              <p className='text-xs text-[#505060] text-center leading-relaxed'>
                아직 실행된 에이전트가 없습니다.<br />
                가운데 패널에서 목표를 입력하세요.
              </p>
            </div>
          ) : (
            <div>
              {agents.map(([agentId, info]) => (
                <div key={agentId} className='px-4 py-2.5 hover:bg-[#222228] transition-colors'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2.5'>
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          info.status === 'running' ? 'animate-pulse' : ''
                        }`}
                        style={{ backgroundColor: getAgentColor(agentId) }}
                      />
                      <span className='text-xs font-medium text-[#e4e4eb]'>{agentId}</span>
                    </div>
                    <span className={`text-[10px] ${
                      info.status === 'completed' ? 'text-[#22c55e]' :
                      info.status === 'failed' ? 'text-[#ef4444]' : 'text-[#888892]'
                    }`}>
                      {info.status === 'running' ? 'Running...' : info.status === 'completed' ? 'Done' : 'Failed'}
                    </span>
                  </div>
                  {info.summary !== undefined && (
                    <p className='text-[11px] text-[#666672] mt-0.5 truncate pl-[18px]'>{info.summary}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Spec 태스크 요약 */}
          {currentSpec !== null && currentSpec.tasks.length > 0 && (
            <div className='border-t border-[#2a2a33] px-4 py-3'>
              <p className='text-[10px] text-[#505060] uppercase tracking-wider mb-2'>Tasks</p>
              {currentSpec.tasks.map((task) => (
                <div key={task.id} className='flex items-center gap-2 py-1'>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    task.status === 'in_progress' ? 'bg-[#22c55e] animate-pulse' :
                    task.status === 'completed' ? 'bg-[#86efac]' :
                    task.status === 'failed' ? 'bg-[#ef4444]' : 'bg-[#505060]'
                  }`} />
                  <span className='text-[11px] text-[#888892] truncate'>{task.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* Reset 버튼 */}
          {(pipelineStatus === 'completed' || pipelineStatus === 'failed') && (
            <div className='border-t border-[#2a2a33] px-4 py-3'>
              <button
                onClick={() => reset()}
                className='w-full text-xs text-[#888892] hover:text-[#e4e4eb] hover:bg-[#222228] transition-colors py-1.5 rounded'
              >
                + New session
              </button>
            </div>
          )}

          {/* Checkpoint controls */}
          {projectPath && (
            <div className='border-t border-[#2a2a33] px-4 py-3 space-y-2'>
              <p className='text-[10px] text-[#505060] uppercase tracking-wider'>Checkpoint</p>
              <div className='flex gap-2'>
                <button
                  onClick={() => void handleSaveCheckpoint()}
                  disabled={checkpointBusy}
                  className='flex-1 text-[11px] py-1 rounded border border-[#2a2a33] text-[#888892] hover:text-[#e4e4eb] hover:border-[#3a3a45] disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  Save
                </button>
                <button
                  onClick={() => void handleRestoreCheckpoint()}
                  disabled={checkpointBusy}
                  className='flex-1 text-[11px] py-1 rounded border border-[#2a2a33] text-[#888892] hover:text-[#e4e4eb] hover:border-[#3a3a45] disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  Restore Latest
                </button>
                <button
                  onClick={() => void handleRefreshCheckpoints()}
                  disabled={checkpointBusy}
                  className='text-[11px] px-2 py-1 rounded border border-[#2a2a33] text-[#888892] hover:text-[#e4e4eb] hover:border-[#3a3a45] disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  ↻
                </button>
              </div>
              {checkpoints.length === 0 ? (
                <p className='text-[10px] text-[#666672] leading-relaxed'>No checkpoints yet.</p>
              ) : (
                <div className='max-h-36 overflow-y-auto space-y-1'>
                  {checkpoints.map((checkpoint) => (
                    <div key={checkpoint.filePath} className='rounded border border-[#2a2a33] bg-[#1a1a20] px-2 py-1.5'>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='text-[10px] text-[#888892] truncate'>
                          {new Date(checkpoint.createdAt).toLocaleString()}
                        </span>
                        <span className='text-[10px] text-[#505060] uppercase'>
                          {checkpoint.pipelineStatus}
                        </span>
                      </div>
                      <div className='mt-1 flex items-center gap-1.5'>
                        <input
                          value={checkpointNameDrafts[checkpoint.filePath] ?? checkpoint.name}
                          onChange={(event) => {
                            const value = event.target.value;
                            setCheckpointNameDrafts((prev) => ({ ...prev, [checkpoint.filePath]: value }));
                          }}
                          disabled={checkpointBusy}
                          className='flex-1 min-w-0 text-[10px] bg-[#141419] border border-[#2a2a33] rounded px-1.5 py-1 text-[#c4c4cc] focus:outline-none focus:border-[#3a3a45] disabled:opacity-60'
                        />
                        <button
                          onClick={() => void handleRenameCheckpointItem(checkpoint.filePath)}
                          disabled={checkpointBusy}
                          className='text-[10px] text-[#666672] hover:text-[#c4c4cc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                        >
                          Rename
                        </button>
                      </div>
                      <p className='text-[11px] text-[#c4c4cc] truncate mt-0.5'>{checkpoint.goal}</p>
                      <div className='flex items-center justify-between mt-1'>
                        <span className='text-[10px] text-[#666672]'>{checkpoint.taskCount} tasks</span>
                        <div className='flex items-center gap-2'>
                          <button
                            onClick={() => void handlePreviewCheckpointItem(checkpoint.filePath)}
                            disabled={checkpointBusy}
                            className='text-[10px] text-[#6b8fd4] hover:text-[#93c5fd] disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => void handleDeleteCheckpointItem(checkpoint.filePath)}
                            disabled={checkpointBusy}
                            className='text-[10px] text-[#f87171] hover:text-[#ef4444] disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {checkpointPreview && (
                <div className='rounded border border-[#2a2a33] bg-[#141419] p-2 space-y-1.5'>
                  <div className='flex items-center justify-between gap-2'>
                    <p className='text-[10px] text-[#e4e4eb] truncate'>{checkpointPreview.name}</p>
                    <button
                      onClick={() => setCheckpointPreview(null)}
                      className='text-[10px] text-[#666672] hover:text-[#c4c4cc] transition-colors'
                    >
                      Close
                    </button>
                  </div>
                  <p className='text-[10px] text-[#888892]'>
                    {new Date(checkpointPreview.createdAt).toLocaleString()}
                  </p>
                  <div className='grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]'>
                    <span className='text-[#666672]'>Goal</span>
                    <span className='text-[#c4c4cc]'>
                      {checkpointPreview.diff.goalChanged ? 'Changed' : 'Same'}
                    </span>
                    <span className='text-[#666672]'>Pipeline</span>
                    <span className='text-[#c4c4cc]'>
                      {checkpointPreview.current.pipelineStatus} → {checkpointPreview.checkpoint.pipelineStatus}
                    </span>
                    <span className='text-[#666672]'>Spec Version</span>
                    <span className='text-[#c4c4cc]'>
                      {checkpointPreview.current.specVersion ?? '-'} → {checkpointPreview.checkpoint.specVersion ?? '-'}
                    </span>
                    <span className='text-[#666672]'>Task Count</span>
                    <span className='text-[#c4c4cc]'>
                      {checkpointPreview.current.taskCount} → {checkpointPreview.checkpoint.taskCount}
                    </span>
                    <span className='text-[#666672]'>Task Changes</span>
                    <span className='text-[#c4c4cc]'>
                      {checkpointPreview.diff.changedTaskCount}
                    </span>
                    <span className='text-[#666672]'>Events</span>
                    <span className='text-[#c4c4cc]'>
                      {checkpointPreview.current.eventCount} → {checkpointPreview.checkpoint.eventCount}
                    </span>
                    <span className='text-[#666672]'>Conversation</span>
                    <span className='text-[#c4c4cc]'>
                      {checkpointPreview.current.conversationCount} → {checkpointPreview.checkpoint.conversationCount}
                    </span>
                  </div>
                  {checkpointPreview.diff.taskChanges.length > 0 && (
                    <div className='max-h-24 overflow-y-auto rounded border border-[#222228] px-1.5 py-1 space-y-1'>
                      {checkpointPreview.diff.taskChanges.map((task) => (
                        <div key={task.id} className='text-[10px] text-[#888892]'>
                          <span className='text-[#c4c4cc] uppercase mr-1'>{task.change}</span>
                          <span className='truncate'>{task.description}</span>
                          <span className='text-[#666672]'> ({task.fields.join(', ')})</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => void handleRestoreCheckpointItem(checkpointPreview.filePath)}
                    disabled={checkpointBusy}
                    className='w-full text-[11px] py-1 rounded border border-[#2a2a33] text-[#6b8fd4] hover:text-[#93c5fd] hover:border-[#3a3a45] disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                  >
                    Restore this checkpoint
                  </button>
                </div>
              )}
              {checkpointMessage && (
                <p className='text-[10px] text-[#86efac] leading-relaxed'>{checkpointMessage}</p>
              )}
              {checkpointError && (
                <p className='text-[10px] text-[#f87171] leading-relaxed'>{checkpointError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Changes Tab */}
      {activeTab === 'Changes' && (
        <div className='flex-1 overflow-hidden flex flex-col'>
          <ChangesPanel />
        </div>
      )}

      {/* Files Tab */}
      {activeTab === 'Files' && (
        <div className='flex-1 overflow-hidden'>
          <FileExplorer />
        </div>
      )}
    </div>
  );
});
