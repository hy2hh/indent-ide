import React, { useState, useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore.js';
import { useAgentStore } from '../../stores/agentStore.js';

const INDICATOR_COLORS = [
  '#22c55e',
  '#22c55e',
  '#22c55e',
  '#ef4444',
  '#3b82f6',
  '#3b82f6',
  '#6b7280',
  '#6b7280',
];

const TABS = ['Agents', 'Context', 'Changes', 'Files'];

interface MockAgent {
  id: string;
  name: string;
  color: string;
  description: string;
  time: string;
}

const MOCK_AGENTS: MockAgent[] = [
  {
    id: 'coordinator',
    name: 'Coordinator',
    color: '#9333ea',
    description: "Back to the PR|Let's continue with the Intent...",
    time: '3d ago',
  },
  {
    id: 'code-review',
    name: 'Code Review',
    color: '#ec4899',
    description: '',
    time: '3d ago',
  },
  {
    id: 'design-review',
    name: 'Design Review',
    color: '#3b82f6',
    description: '',
    time: '3d ago',
  },
];

const BG_AGENT_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#eab308'];

export const AgentSidebar = React.memo(function AgentSidebar() {
  const [activeTab, setActiveTab] = useState('Agents');
  const { projectPath } = useProjectStore();
  const { agentStates, pipelineStatus } = useAgentStore();

  const projectName = projectPath
    ? (projectPath.split('/').pop() ?? 'Project')
    : 'Intent Product Page';

  const runningCount = Object.values(agentStates).filter((a) => a.status === 'running').length;

  const handleTabClick = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className='flex flex-col h-full overflow-hidden'>
      {/* Project Header */}
      <div className='px-4 pt-4 pb-3 border-b border-[#2a2a33]'>
        <div className='flex items-start justify-between mb-1'>
          <div className='flex-1 min-w-0'>
            <h1 className='text-sm font-semibold text-[#e4e4eb] truncate'>{projectName}</h1>
            <p className='text-xs text-[#888892] mt-0.5'>augmentcode/dotcom</p>
          </div>
          <div className='flex items-center gap-2 ml-2 flex-shrink-0'>
            <button className='text-[#888892] hover:text-[#e4e4eb] transition-colors' title='Open in browser'>
              <svg width='13' height='13' viewBox='0 0 13 13' fill='none'>
                <path d='M4.5 2H2v9h9V8.5M7 2h4v4M6 7l5-5' stroke='currentColor' strokeWidth='1.2' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </button>
            <button className='text-[#888892] hover:text-[#e4e4eb] transition-colors' title='More options'>
              <svg width='13' height='13' viewBox='0 0 13 13' fill='none'>
                <circle cx='6.5' cy='2.5' r='1' fill='currentColor' />
                <circle cx='6.5' cy='6.5' r='1' fill='currentColor' />
                <circle cx='6.5' cy='10.5' r='1' fill='currentColor' />
              </svg>
            </button>
          </div>
        </div>

        {/* Colored file-change indicators */}
        <div className='flex items-center gap-1 mt-3'>
          {/* Document icon */}
          <div className='w-5 h-4 rounded-sm bg-[#e4e4eb] flex items-center justify-center flex-shrink-0'>
            <svg width='9' height='10' viewBox='0 0 9 10' fill='none'>
              <path d='M1.5 1h4L7 3.5V9H1.5V1z' stroke='#18181c' strokeWidth='0.8' />
              <path d='M5 1v3h2' stroke='#18181c' strokeWidth='0.8' />
            </svg>
          </div>
          {INDICATOR_COLORS.map((color, i) => (
            <div
              key={i}
              className='w-4 h-4 rounded-sm flex-shrink-0'
              style={{ backgroundColor: color, opacity: 0.85 }}
            />
          ))}
        </div>

        <p className='text-xs text-[#888892] mt-2'>
          {pipelineStatus === 'running'
            ? `Running ${runningCount} agent${runningCount !== 1 ? 's' : ''}...`
            : 'Review 67 files changed.'}
        </p>
      </div>

      {/* Tabs */}
      <div className='flex border-b border-[#2a2a33] px-1 flex-shrink-0'>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`px-2.5 py-2 text-xs transition-colors relative whitespace-nowrap ${
              activeTab === tab ? 'text-[#e4e4eb]' : 'text-[#888892] hover:text-[#c4c4cc]'
            }`}
          >
            {tab === 'Changes' ? (
              <span>
                Changes{' '}
                <span className='text-[#666672]'>67</span>
              </span>
            ) : (
              tab
            )}
            {activeTab === tab && (
              <div className='absolute bottom-0 left-2 right-2 h-px bg-[#e4e4eb]' />
            )}
          </button>
        ))}
      </div>

      {/* Agents Tab */}
      {activeTab === 'Agents' && (
        <div className='flex-1 overflow-y-auto'>
          <p className='px-4 py-3 text-xs text-[#666672] leading-relaxed'>
            Agents write code, maintain notes, and coordinate tasks.
          </p>

          {/* Create new agent */}
          <button className='w-full flex items-center justify-between px-4 py-2 text-xs text-[#888892] hover:text-[#e4e4eb] hover:bg-[#222228] transition-colors'>
            <span>+ Create new agent</span>
            <svg width='10' height='10' viewBox='0 0 10 10' fill='none'>
              <path d='M2 4l3 3 3-3' stroke='currentColor' strokeWidth='1.2' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </button>

          {/* Agent List */}
          <div className='mt-1'>
            {MOCK_AGENTS.map((agent) => (
              <AgentListItem key={agent.id} agent={agent} />
            ))}
          </div>

          {/* Divider */}
          <div className='border-t border-[#2a2a33] mt-1'>
            <button className='w-full flex items-center justify-between px-4 py-2.5 text-xs hover:bg-[#222228] transition-colors'>
              <div className='flex items-center gap-2'>
                <div className='flex items-center gap-1'>
                  {BG_AGENT_COLORS.map((color, i) => (
                    <div
                      key={i}
                      className='w-2.5 h-2.5 rounded-full flex-shrink-0'
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className='text-[#888892]'>3 background agents</span>
              </div>
              <svg width='10' height='10' viewBox='0 0 10 10' fill='none'>
                <path d='M2 4l3 3 3-3' stroke='#888892' strokeWidth='1.2' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </button>
          </div>
        </div>
      )}

      {activeTab !== 'Agents' && (
        <div className='flex-1 flex items-center justify-center'>
          <p className='text-xs text-[#505060]'>{activeTab} panel</p>
        </div>
      )}
    </div>
  );
});

interface AgentListItemProps {
  agent: MockAgent;
}

const AgentListItem = React.memo(function AgentListItem({ agent }: AgentListItemProps) {
  return (
    <button className='w-full px-4 py-2.5 text-left hover:bg-[#222228] transition-colors group'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div
            className='w-3.5 h-3.5 rounded-sm flex-shrink-0'
            style={{ backgroundColor: agent.color }}
          />
          <span className='text-xs text-[#e4e4eb]'>{agent.name}</span>
        </div>
        <span className='text-xs text-[#666672]'>{agent.time}</span>
      </div>
      {agent.description && (
        <p className='text-xs text-[#666672] mt-0.5 truncate pl-[22px]'>{agent.description}</p>
      )}
    </button>
  );
});
