import React, { useState, useCallback, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore.js';
import { useAgentStore, type CheckpointPreview } from '../../stores/agentStore.js';
import { ChangesPanel } from './ChangesPanel.js';
import { FileExplorer } from './FileExplorer.js';

const TABS = ['Intents', 'Agents', 'Changes', 'Files'];

export const AgentSidebar = React.memo(function AgentSidebar() {
  const [activeTab, setActiveTab] = useState('Intents');
  const [checkpointBusy, setCheckpointBusy] = useState(false);
  const [checkpointPreview, setCheckpointPreview] = useState<CheckpointPreview | null>(null);
  const { projectPath, openProject } = useProjectStore();
  const {
    pipelineStatus,
    conversationItems,
    currentSpec,
    queuedGoals,
    isQueuePaused,
    toggleQueuePaused,
    checkpoints,
    reset,
    createCheckpoint,
    loadCheckpoints,
    getCheckpointPreview,
    restoreCheckpoint,
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

    const label = currentSpec?.goal ?? 'session';
    const result = await createCheckpoint(projectPath, label);

    if (result.success) {
      void loadCheckpoints(projectPath);
    }
    setCheckpointBusy(false);
  }, [projectPath, currentSpec, createCheckpoint, loadCheckpoints]);

  const handleRestoreCheckpointItem = useCallback(async (filePath: string) => {
    if (!projectPath) {
      return;
    }
    setCheckpointBusy(true);

    const result = await restoreCheckpoint(projectPath, filePath);
    if (result.success) {
      setCheckpointPreview(null);
    }
    setCheckpointBusy(false);
  }, [projectPath, restoreCheckpoint]);

  const handlePreviewCheckpointItem = useCallback(async (filePath: string) => {
    if (!projectPath) {
      return;
    }
    setCheckpointBusy(true);

    const result = await getCheckpointPreview(projectPath, filePath);
    if (result.success && result.preview) {
      setCheckpointPreview(result.preview);
    }
    setCheckpointBusy(false);
  }, [projectPath, getCheckpointPreview]);

  const handleRefreshCheckpoints = useCallback(async () => {
    if (!projectPath) {
      return;
    }
    setCheckpointBusy(true);
    await loadCheckpoints(projectPath);
    setCheckpointBusy(false);
  }, [projectPath, loadCheckpoints]);

  useEffect(() => {
    if (!projectPath) {
      return;
    }
    void loadCheckpoints(projectPath);
  }, [projectPath, loadCheckpoints]);

  return (
    <div className='flex flex-col h-full overflow-hidden font-sans bg-[#0b0d12]'>
      {/* Project Header */}
      <div className='px-5 py-5 border-b border-[#1c222d] bg-[#0b0d12]'>
        <div className='flex items-start justify-between mb-2'>
          <div className='flex-1 min-w-0'>
            <h1 className='text-[10px] font-black text-[#e4e4eb] truncate uppercase tracking-[0.2em] opacity-90'>{projectName}</h1>
            <p className='text-[10px] text-[#505060] mt-1 font-mono truncate opacity-60'>{projectPath ?? 'No path selected'}</p>
          </div>
          <button
            onClick={handleOpenProject}
            className='text-[#505060] hover:text-[#e4e4eb] transition-all ml-3 flex-shrink-0'
            title='Open different project'
          >
            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' />
            </svg>
          </button>
        </div>
        
        <div className='mt-4 flex items-center justify-between'>
          <span className='text-[9px] text-[#505060] font-black tracking-widest uppercase'>STATUS</span>
          <div className='flex items-center gap-2 bg-[#131722] px-2 py-0.5 rounded border border-[#1c222d]'>
            <div className={`w-1.5 h-1.5 rounded-full ${
              pipelineStatus === 'running' ? 'bg-[#22c55e] animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]' :
              pipelineStatus === 'completed' ? 'bg-[#86efac]' :
              pipelineStatus === 'failed' ? 'bg-[#ef4444]' : 'bg-[#1c222d]'
            }`} />
            <span className='text-[9px] text-[#888892] font-bold uppercase tracking-tighter'>{pipelineStatus}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className='flex border-b border-[#1c222d] flex-shrink-0 gap-0 px-2 bg-[#0b0d12] shadow-sm'>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-1 py-3 text-[9px] font-black uppercase tracking-[0.15em] transition-all relative whitespace-nowrap ${
              activeTab === tab ? 'text-[#e4e4eb]' : 'text-[#505060] hover:text-[#888892]'
            }`}
          >
            {tab}
            {activeTab === tab && <div className='absolute bottom-0 left-2 right-2 h-0.5 bg-[#4f8cff] rounded-full' />}
          </button>
        ))}
      </div>

      <div className='flex-1 overflow-hidden flex flex-col min-h-0'>
        {/* Intents (History) Tab */}
        {activeTab === 'Intents' && (
          <div className='flex-1 overflow-y-auto p-5 space-y-6 min-h-0 custom-scrollbar'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <p className='text-[9px] text-[#505060] font-black uppercase tracking-[0.15em]'>Current Session</p>
                {conversationItems.length > 0 && (
                  <button
                    onClick={() => void handleSaveCheckpoint()}
                    disabled={checkpointBusy}
                    className='text-[9px] font-bold text-[#4f8cff] hover:text-[#8bb8ff] transition-colors disabled:opacity-50 uppercase tracking-tighter'
                  >
                    Save Checkpoint
                  </button>
                )}
              </div>
              
              {conversationItems.length === 0 ? (
                <div className='rounded-xl border border-[#1c222d] border-dashed p-6 text-center bg-[#131722]/10'>
                  <p className='text-[10px] text-[#505060] font-bold leading-relaxed uppercase tracking-widest opacity-60'>
                    No active intent.<br />Describe a goal to start.
                  </p>
                </div>
              ) : (
                <div className='rounded-xl border border-[#1c222d] bg-[#131722]/40 p-4 shadow-sm group transition-all hover:border-[#262d3d]'>
                  <p className='text-[11px] text-[#e4e4eb] font-bold leading-relaxed line-clamp-3'>
                    {currentSpec?.goal ?? conversationItems.find(i => i.type === 'goal')?.content ?? 'Untitled Intent'}
                  </p>
                  <button
                    onClick={() => reset()}
                    className='mt-3 text-[9px] font-black text-[#ef4444] hover:text-[#f87171] transition-colors uppercase tracking-widest'
                  >
                    Reset Session
                  </button>
                </div>
              )}
            </div>

            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <p className='text-[9px] text-[#505060] font-black uppercase tracking-[0.15em]'>History</p>
                <button
                  onClick={() => void handleRefreshCheckpoints()}
                  disabled={checkpointBusy}
                  className='text-[#505060] hover:text-[#a1acc5] transition-all p-1 hover:bg-[#131722] rounded-md'
                >
                  <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
                    <path d='M23 4v6h-6M1 20v-6h6' /><path d='M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15' />
                  </svg>
                </button>
              </div>

              {checkpoints.length === 0 ? (
                <div className='py-8 text-center'>
                  <p className='text-[10px] text-[#383840] font-bold uppercase tracking-widest'>No history found</p>
                </div>
              ) : (
                <div className='space-y-2.5'>
                  {checkpoints.map((checkpoint) => (
                    <div key={checkpoint.filePath} className='group rounded-xl border border-[#1c222d] bg-[#0b0d12] hover:border-[#262d3d] hover:bg-[#131722]/20 transition-all overflow-hidden'>
                      <div className='p-3.5 space-y-2.5'>
                        <div className='flex items-center justify-between'>
                          <span className='text-[9px] text-[#505060] font-mono opacity-80'>
                            {new Date(checkpoint.createdAt).toLocaleDateString()}
                          </span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter ${
                            checkpoint.pipelineStatus === 'completed' ? 'bg-[#0c1c0c] text-[#4ade80]' :
                            checkpoint.pipelineStatus === 'failed' ? 'bg-[#1c0c0c] text-[#ef4444]' :
                            'bg-[#131722] text-[#888892]'
                          }`}>
                            {checkpoint.pipelineStatus}
                          </span>
                        </div>
                        <p className='text-[11px] text-[#a1acc5] group-hover:text-[#e4e4eb] font-bold line-clamp-2 leading-relaxed transition-colors'>
                          {checkpoint.name}
                        </p>
                        <div className='flex items-center justify-between pt-2.5 border-t border-[#1c222d]/50'>
                          <span className='text-[9px] text-[#505060] font-bold'>{checkpoint.taskCount} tasks</span>
                          <div className='flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all'>
                            <button
                              onClick={() => void handlePreviewCheckpointItem(checkpoint.filePath)}
                              className='text-[9px] font-black text-[#4f8cff] hover:text-[#8bb8ff] uppercase tracking-tighter'
                            >
                              Details
                            </button>
                            <button
                              onClick={() => void handleRestoreCheckpointItem(checkpoint.filePath)}
                              className='text-[9px] font-black text-[#4f8cff] hover:text-[#8bb8ff] uppercase tracking-tighter'
                            >
                              Restore
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {checkpointPreview && (
              <div className='rounded border border-[#262d3d] bg-[#131722] p-3 space-y-3 shadow-xl'>
                <div className='flex items-center justify-between'>
                  <p className='text-[10px] text-[#e4e4eb] font-bold uppercase tracking-wider'>Preview</p>
                  <button onClick={() => setCheckpointPreview(null)} className='text-[#505060] hover:text-[#e4e4eb]'>✕</button>
                </div>
                <p className='text-[11px] text-[#a1acc5] leading-relaxed'>{checkpointPreview.name}</p>
                <div className='space-y-1'>
                   <div className='flex justify-between text-[9px]'><span className='text-[#505060]'>Tasks</span><span className='text-[#a1acc5]'>{checkpointPreview.checkpoint.taskCount}</span></div>
                   <div className='flex justify-between text-[9px]'><span className='text-[#505060]'>Events</span><span className='text-[#a1acc5]'>{checkpointPreview.checkpoint.eventCount}</span></div>
                   <div className='flex justify-between text-[9px]'><span className='text-[#505060]'>Version</span><span className='text-[#a1acc5]'>v{checkpointPreview.checkpoint.specVersion ?? 0}</span></div>
                </div>
                <button
                  onClick={() => void handleRestoreCheckpointItem(checkpointPreview.filePath)}
                  className='w-full py-1.5 bg-[#4f8cff] hover:bg-[#3b82f6] text-white text-[10px] font-bold rounded transition-colors'
                >
                  RESTORE SESSION
                </button>
              </div>
            )}
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'Agents' && (
          <div className='flex-1 overflow-y-auto min-h-0'>
            {agents.length === 0 ? (
              <div className='flex flex-col items-center justify-center h-full gap-3 px-4 opacity-40'>
                <p className='text-[10px] text-[#505060] text-center uppercase tracking-widest leading-relaxed'>
                  No active agents
                </p>
              </div>
            ) : (
              <div className='p-2 space-y-1'>
                {agents.map(([agentId, info]) => (
                  <div key={agentId} className='rounded border border-[#1c222d] bg-[#131722]/30 p-3 hover:bg-[#131722]/50 transition-colors'>
                    <div className='flex items-center justify-between mb-2'>
                      <div className='flex items-center gap-2'>
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${info.status === 'running' ? 'animate-pulse' : ''}`}
                          style={{ backgroundColor: getAgentColor(agentId) }}
                        />
                        <span className='text-[10px] font-bold text-[#e4e4eb] uppercase tracking-wider'>{agentId}</span>
                      </div>
                      <span className={`text-[9px] px-1 rounded uppercase ${
                        info.status === 'completed' ? 'text-[#22c55e]' :
                        info.status === 'failed' ? 'text-[#ef4444]' : 'text-[#888892]'
                      }`}>
                        {info.status}
                      </span>
                    </div>
                    {info.summary && (
                      <p className='text-[10px] text-[#666672] leading-relaxed line-clamp-2'>{info.summary}</p>
                    )}
                  </div>
                ))}

                {currentSpec !== null && currentSpec.tasks.length > 0 && (
                  <div className='mt-4 px-2'>
                    <p className='text-[9px] text-[#505060] font-bold uppercase tracking-widest mb-2'>Task Progress</p>
                    <div className='space-y-1.5'>
                      {currentSpec.tasks.map((task) => (
                        <div key={task.id} className='flex items-center gap-2'>
                          <div className={`w-1 h-1 rounded-full ${
                            task.status === 'in_progress' ? 'bg-[#22c55e] animate-pulse' :
                            task.status === 'completed' ? 'bg-[#86efac]' :
                            task.status === 'failed' ? 'bg-[#ef4444]' : 'bg-[#1c222d]'
                          }`} />
                          <span className='text-[10px] text-[#666672] truncate'>{task.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Changes Tab */}
        {activeTab === 'Changes' && (
          <div className='flex-1 overflow-hidden flex flex-col min-h-0'>
            <ChangesPanel />
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'Files' && (
          <div className='flex-1 overflow-hidden min-h-0'>
            <FileExplorer />
          </div>
        )}
      </div>

      {/* Queue Bar (Global) */}
      {queuedGoals.length > 0 && (
        <div className='flex-shrink-0 bg-[#131722] border-t border-[#1c222d] p-3'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-[9px] text-[#505060] font-bold uppercase tracking-tighter'>Queue ({queuedGoals.length})</span>
            <button onClick={() => toggleQueuePaused()} className='text-[9px] text-[#4f8cff]'>
              {isQueuePaused ? 'Resume' : 'Pause'}
            </button>
          </div>
          <div className='text-[10px] text-[#888892] truncate italic'>
            Next: {queuedGoals[0]}
          </div>
        </div>
      )}
    </div>
  );
});
