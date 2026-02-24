import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAgentStore } from '../../stores/agentStore.js';

interface GoalItem {
  type: 'goal';
  content: string;
}

interface ResponseItem {
  type: 'response';
  content: string;
}

interface SubAgentItem {
  type: 'sub-agent';
  name: string;
  status: 'Running...' | 'Complete' | 'Failed';
  description: string;
  code?: string;
}

interface TimestampItem {
  type: 'timestamp';
  label: string;
}

type ConversationItem = GoalItem | ResponseItem | SubAgentItem | TimestampItem;

const MOCK_CONVERSATION: ConversationItem[] = [
  {
    type: 'goal',
    content:
      'Create the Intent product page with hero section, feature sections, and download CTA.',
  },
  {
    type: 'response',
    content:
      "I'll create the Intent product page. Let me set up the route and build each section.",
  },
  { type: 'timestamp', label: '3d ago' },
  {
    type: 'goal',
    content:
      'Update the hero with a high-fidelity app mockup and fix the overlapping content issue.',
  },
  {
    type: 'response',
    content:
      "I'll redesign the hero section with a detailed mockup. Spawning an agent to handle this.",
  },
  {
    type: 'sub-agent',
    name: 'Hero Redesign Agent',
    status: 'Complete',
    description: 'Created 3-panel app mockup with theme support',
  },
  { type: 'timestamp', label: '2d ago' },
  {
    type: 'goal',
    content:
      'Implement an interactive UI mockup for the hero section. Also need to build the mobile responsive view for the entire page.',
  },
  {
    type: 'response',
    content:
      "I'll break this into two parallel tasks. Let me spawn sub-agents to work on each:",
  },
  {
    type: 'sub-agent',
    name: 'Hero Mockup Agent',
    status: 'Running...',
    description: 'Building interactive Intent app mockup with 3-panel layout',
    code: `// intent-app-mockup.tsx
export function IntentAppMockup() {
  return (
    <div className="flex">...`,
  },
  {
    type: 'sub-agent',
    name: 'Mobile View Agent',
    status: 'Running...',
    description: '',
  },
];

const CONVERSATION_TABS = [
  { id: 'coordinator', label: 'Coordinator', dotColor: '#22c55e' },
  { id: 'hero-section', label: 'hero-section...', dotColor: '#f97316' },
  { id: 'fix', label: '807245d: Fix...', dotColor: '#f97316' },
];

export const ConversationPanel = React.memo(function ConversationPanel() {
  const [activeTab, setActiveTab] = useState('coordinator');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { startPipeline, pipelineStatus, currentSpec, events } = useAgentStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || pipelineStatus === 'running') {
      return;
    }
    setInput('');
    await startPipeline(input.trim(), '/');
  }, [input, pipelineStatus, startPipeline]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        void handleSend();
      }
    },
    [handleSend]
  );

  const handleTabClick = useCallback((id: string) => {
    setActiveTab(id);
  }, []);

  const hasRealConversation = currentSpec !== null || events.length > 0;

  return (
    <div className='flex flex-col h-full bg-[#18181c]'>
      {/* Tab Bar */}
      <div className='flex items-center h-9 border-b border-[#2a2a33] overflow-x-auto flex-shrink-0'>
        {CONVERSATION_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex items-center gap-1.5 px-3 h-full text-xs whitespace-nowrap border-r border-[#2a2a33] transition-colors flex-shrink-0 ${
              tab.id === activeTab
                ? 'bg-[#1c1c22] text-[#e4e4eb]'
                : 'text-[#666672] hover:text-[#c4c4cc] hover:bg-[#1e1e24]'
            }`}
          >
            <div
              className='w-2 h-2 rounded-full flex-shrink-0'
              style={{ backgroundColor: tab.dotColor }}
            />
            <span>{tab.label}</span>
            <span className='ml-1 text-[#666672] hover:text-[#f38ba8]'>×</span>
          </button>
        ))}
      </div>

      {/* Breadcrumb */}
      <div className='px-4 py-2 flex-shrink-0 border-b border-[#2a2a33]'>
        <p className='text-[10px] tracking-widest text-[#505060] uppercase font-sans'>
          AGENTS / COORDINATOR / COORDINATOR AGENT
        </p>
      </div>

      {/* Messages */}
      <div className='flex-1 overflow-y-auto px-4 py-4 space-y-3'>
        {!hasRealConversation &&
          MOCK_CONVERSATION.map((item, idx) => (
            <ConversationItemRenderer key={idx} item={item} />
          ))}

        {hasRealConversation && currentSpec && (
          <>
            <div className='rounded border border-[#1e4a1e] bg-[#0c1c0c] px-3 py-2.5'>
              <p className='text-xs text-[#86efac] leading-relaxed'>{currentSpec.goal}</p>
            </div>
            <p className='text-xs text-[#c4c4cc] leading-relaxed'>
              Processing your request. The agent pipeline is{' '}
              {pipelineStatus === 'running' ? 'running' : pipelineStatus}...
            </p>
            {currentSpec.tasks.map((task) => (
              <div key={task.id} className='rounded border border-[#2a2a33] bg-[#1c1c22] px-3 py-2.5'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        task.status === 'in_progress'
                          ? 'bg-[#22c55e] animate-pulse'
                          : task.status === 'completed'
                            ? 'bg-[#86efac]'
                            : 'bg-[#505060]'
                      }`}
                    />
                    <span className='text-xs text-[#e4e4eb]'>{task.description}</span>
                  </div>
                  <span className='text-xs text-[#666672] capitalize'>{task.status}</span>
                </div>
              </div>
            ))}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className='flex-shrink-0 border-t border-[#2a2a33]'>
        <div className='px-4 pt-3 pb-1'>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Type a message...'
            className='w-full bg-transparent text-xs text-[#e4e4eb] placeholder-[#505060] focus:outline-none'
          />
        </div>
        <div className='flex items-center justify-between px-4 pb-3 pt-1'>
          <span className='text-xs text-[#505060]'>Claude Opus 4.6 @</span>
          <div className='flex items-center gap-3'>
            {/* Paperclip */}
            <button className='text-[#666672] hover:text-[#e4e4eb] transition-colors'>
              <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
                <path
                  d='M12 6.5L6.5 12a3.5 3.5 0 01-5-5l5-5a2.5 2.5 0 013.5 3.5L5 10.5a1.5 1.5 0 01-2-2L8 4'
                  stroke='currentColor'
                  strokeWidth='1.2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </button>
            {/* Link */}
            <button className='text-[#666672] hover:text-[#e4e4eb] transition-colors'>
              <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
                <path
                  d='M6 8a3 3 0 004.24 0l1.5-1.5a3 3 0 00-4.24-4.24L6.5 3.5M8 6a3 3 0 00-4.24 0L2.26 7.5A3 3 0 006.5 11.74l1-1'
                  stroke='currentColor'
                  strokeWidth='1.2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </button>
            {/* Send */}
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || pipelineStatus === 'running'}
              className={`transition-colors ${
                input.trim() && pipelineStatus !== 'running'
                  ? 'text-[#e4e4eb]'
                  : 'text-[#505060]'
              }`}
            >
              <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
                <path
                  d='M2 7l9-5-4 9-1-3.5L2 7z'
                  stroke='currentColor'
                  strokeWidth='1.2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className='flex-shrink-0 border-t border-[#2a2a33] px-4 py-1 flex items-center gap-3 bg-[#141418]'>
        <span className='text-[10px] text-[#505060] font-sans'>p 3002</span>
        <span className='text-[10px] text-[#505060] font-sans'>Terminal</span>
        <span className='text-[10px] text-[#505060] font-sans'>ls</span>
        <span className='text-[10px] text-[#505060] font-sans truncate'>npm run dev -- -p 30...</span>
      </div>
    </div>
  );
});

interface ConversationItemRendererProps {
  item: ConversationItem;
}

const ConversationItemRenderer = React.memo(function ConversationItemRenderer({
  item,
}: ConversationItemRendererProps) {
  if (item.type === 'goal') {
    return (
      <div className='rounded border border-[#1e4a1e] bg-[#0c1c0c] px-3 py-2.5'>
        <p className='text-xs text-[#86efac] leading-relaxed'>{item.content}</p>
      </div>
    );
  }

  if (item.type === 'response') {
    return <p className='text-xs text-[#c4c4cc] leading-relaxed'>{item.content}</p>;
  }

  if (item.type === 'timestamp') {
    return <p className='text-xs text-[#505060]'>{item.label}</p>;
  }

  if (item.type === 'sub-agent') {
    return <SubAgentCard item={item} />;
  }

  return null;
});

interface SubAgentCardProps {
  item: SubAgentItem;
}

const SubAgentCard = React.memo(function SubAgentCard({ item }: SubAgentCardProps) {
  const isRunning = item.status === 'Running...';
  const isComplete = item.status === 'Complete';

  return (
    <div className='rounded border border-[#2a2a33] bg-[#1c1c22] overflow-hidden'>
      <div className='flex items-center justify-between px-3 py-2'>
        <div className='flex items-center gap-2'>
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isRunning
                ? 'bg-[#22c55e] animate-pulse'
                : isComplete
                  ? 'bg-[#86efac]'
                  : 'bg-[#888892]'
            }`}
          />
          <span className='text-xs text-[#e4e4eb]'>{item.name}</span>
        </div>
        <span
          className={`text-xs ${
            isRunning ? 'text-[#888892]' : isComplete ? 'text-[#86efac]' : 'text-[#888892]'
          }`}
        >
          {item.status}
        </span>
      </div>
      {item.description && (
        <p className='px-3 pb-2 text-xs text-[#888892]'>{item.description}</p>
      )}
      {item.code && (
        <div className='mx-3 mb-3 rounded bg-[#111115] border border-[#2a2a33] p-2.5 overflow-hidden'>
          <pre className='text-[11px] text-[#a6adc8] font-mono leading-relaxed overflow-x-auto'>
            <code>{item.code}</code>
          </pre>
        </div>
      )}
    </div>
  );
});
