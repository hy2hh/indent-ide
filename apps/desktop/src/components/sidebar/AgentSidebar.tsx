import React, { useState, useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore.js';
import { useAgentStore } from '../../stores/agentStore.js';
import { ChangesPanel } from './ChangesPanel.js';
import { FileExplorer } from './FileExplorer.js';

const TABS = ['Agents', 'Changes', 'Files'];

export const AgentSidebar = React.memo(function AgentSidebar() {
  const [activeTab, setActiveTab] = useState('Agents');
  const { projectPath, openProject } = useProjectStore();
  const { pipelineStatus, conversationItems, currentSpec, reset } = useAgentStore();

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
