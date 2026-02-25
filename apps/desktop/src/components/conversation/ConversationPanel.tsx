import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { FileTreeNode } from '@intent-ide/core';
import { useAgentStore, type ConversationItemType } from '../../stores/agentStore.js';
import { useProjectStore } from '../../stores/projectStore.js';

interface MentionCandidate {
  value: string;
  label: string;
  kind: 'agent' | 'file';
  activity?: 'running' | 'idle';
}

function buildAgentMentions(conversationItems: ConversationItemType[]): MentionCandidate[] {
  const activityMap = new Map<string, MentionCandidate['activity']>([
    ['coordinator', 'idle'],
    ['verifier', 'idle'],
  ]);

  for (const item of conversationItems) {
    if (item.type === 'agent-started' || item.type === 'agent-progress') {
      activityMap.set(item.agentId, 'running');
      continue;
    }
    if (item.type === 'agent-completed' || item.type === 'agent-failed') {
      activityMap.set(item.agentId, 'idle');
    }
  }

  return [...activityMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([agentId, activity]) => ({
      value: agentId,
      label: agentId,
      kind: 'agent' as const,
      activity: activity ?? 'idle',
    }));
}

function collectFileMentions(nodes: FileTreeNode[], out: MentionCandidate[], limit: number): void {
  for (const node of nodes) {
    if (out.length >= limit) {
      return;
    }
    if (node.type === 'file') {
      out.push({
        value: node.path,
        label: node.path,
        kind: 'file',
      });
    } else if (node.children && node.children.length > 0) {
      collectFileMentions(node.children, out, limit);
    }
  }
}

function buildMentionCandidates(
  fileTree: FileTreeNode[],
  conversationItems: ConversationItemType[],
): MentionCandidate[] {
  const agents = buildAgentMentions(conversationItems);
  const files: MentionCandidate[] = [];
  collectFileMentions(fileTree, files, 120);
  return [...agents, ...files];
}

export const ConversationPanel = React.memo(function ConversationPanel() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    startPipeline,
    cancelPipeline,
    pipelineStatus,
    currentSpec,
    conversationItems,
    queuedGoals,
    removeQueuedGoal,
    clearQueuedGoals,
    isQueuePaused,
    toggleQueuePaused,
  } = useAgentStore();
  const { projectPath, fileTree } = useProjectStore();

  const isRunning = pipelineStatus === 'running';
  const mentionMatch = input.match(/(?:^|\s)@([^\s@]*)$/);
  const mentionQuery = mentionMatch ? mentionMatch[1] ?? '' : null;

  const mentionCandidates = React.useMemo(
    () => buildMentionCandidates(fileTree, conversationItems),
    [fileTree, conversationItems]
  );
  const mentionSuggestions = React.useMemo(() => {
    if (mentionQuery === null) {
      return [] as MentionCandidate[];
    }
    const query = mentionQuery.toLowerCase();
    return mentionCandidates
      .filter((candidate) => candidate.label.toLowerCase().includes(query))
      .slice(0, 8);
  }, [mentionCandidates, mentionQuery]);

  // 동적 탭 생성
  const tabs = React.useMemo(() => {
    const agentTabs: { id: string; label: string; dotColor: string }[] = [];
    const seen = new Set<string>();

    for (const item of conversationItems) {
      if (
        (item.type === 'agent-started' || item.type === 'agent-progress' || item.type === 'agent-completed') &&
        !seen.has(item.agentId) &&
        item.agentId !== 'coordinator'
      ) {
        seen.add(item.agentId);
        const color = item.type === 'agent-completed' ? '#22c55e' : '#f97316';
        agentTabs.push({
          id: item.agentId,
          label: item.agentId.length > 14 ? item.agentId.slice(0, 12) + '...' : item.agentId,
          dotColor: color,
        });
      }
    }

    return [
      { id: 'coordinator', label: 'Coordinator', dotColor: '#9333ea' },
      ...agentTabs,
    ];
  }, [conversationItems]);

  const [activeTab, setActiveTab] = useState('coordinator');

  // activeTab이 tabs에 없으면 coordinator로 리셋
  useEffect(() => {
    if (!tabs.find(t => t.id === activeTab)) {
      setActiveTab('coordinator');
    }
  }, [tabs, activeTab]);

  // 탭별 필터링된 아이템
  const filteredItems = React.useMemo(() => {
    if (activeTab === 'coordinator') {
      return conversationItems;
    }
    return conversationItems.filter(item => {
      if ('agentId' in item) {
        return item.agentId === activeTab;
      }
      return false;
    });
  }, [conversationItems, activeTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredItems.length]);

  const applyMention = useCallback((candidate: MentionCandidate) => {
    setInput((prev) => {
      const match = prev.match(/(?:^|\s)@([^\s@]*)$/);
      if (!match || match.index === undefined) {
        return prev;
      }
      const fullToken = match[0];
      const tokenStart = match.index + (fullToken.startsWith(' ') ? 1 : 0);
      return `${prev.slice(0, tokenStart)}@${candidate.value} `;
    });
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !projectPath) {
      return;
    }

    const goal = input.trim();
    setInput('');
    await startPipeline(goal, projectPath);
  }, [input, projectPath, startPipeline]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        void handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className='flex flex-col h-full bg-[#18181c] font-sans'>
      {/* Breadcrumb */}
      <div className='px-4 py-2 flex-shrink-0 border-b border-[#2a2a33] flex items-center justify-between h-9'>
        <p className='text-[10px] tracking-widest text-[#505060] uppercase'>
          {conversationItems.length > 0 ? 'MULTI-AGENT' : 'NEW SESSION'}
        </p>
        {isRunning && (
          <button
            onClick={() => void cancelPipeline()}
            className='text-[10px] text-[#ef4444] hover:text-[#f87171] transition-colors flex items-center gap-1'
          >
            <span className='w-1.5 h-1.5 bg-[#ef4444] rounded-sm inline-block' />
            Stop
          </button>
        )}
      </div>

      {/* Tab Bar */}
      {tabs.length > 1 && (
        <div className='flex-shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-[#2a2a33] overflow-x-auto'>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#2a2a33] text-[#e4e4eb]'
                  : 'text-[#888892] hover:text-[#c4c4cc] hover:bg-[#1c1c22]'
              }`}
            >
              <span
                className='w-1.5 h-1.5 rounded-full flex-shrink-0'
                style={{ backgroundColor: tab.dotColor }}
              />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className='flex-1 overflow-y-auto px-4 py-4 space-y-3'>
        {filteredItems.length === 0 && (
          <div className='flex flex-col items-center justify-center h-full gap-2'>
            {activeTab === 'coordinator' ? (
              <>
                <p className='text-sm text-[#505060]'>목표를 입력하세요</p>
                <p className='text-xs text-[#383840]'>⌘↵ 로 전송</p>
              </>
            ) : (
              <p className='text-xs text-[#505060]'>이 에이전트의 메시지가 없습니다</p>
            )}
          </div>
        )}

        {filteredItems.map((item, idx) => (
          <ConversationItemRenderer key={idx} item={item} />
        ))}

        {/* Spec tasks (실시간 진행 상황) — coordinator 탭에서만 표시 */}
        {activeTab === 'coordinator' && currentSpec !== null && currentSpec.tasks.length > 0 && isRunning && (
          <div className='space-y-1.5'>
            <p className='text-[10px] text-[#505060] uppercase tracking-wider'>Tasks</p>
            {currentSpec.tasks.map((task) => (
              <div key={task.id} className='rounded border border-[#2a2a33] bg-[#1c1c22] px-3 py-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      task.status === 'in_progress' ? 'bg-[#22c55e] animate-pulse' :
                      task.status === 'completed' ? 'bg-[#86efac]' :
                      task.status === 'failed' ? 'bg-[#ef4444]' : 'bg-[#505060]'
                    }`} />
                    <span className='text-xs text-[#e4e4eb]'>{task.description}</span>
                  </div>
                  <span className='text-[10px] text-[#666672] capitalize'>{task.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className='flex-shrink-0 border-t border-[#2a2a33]'>
        {queuedGoals.length > 0 && (
          <div className='px-4 pt-2'>
            <div className='rounded border border-[#2a2a33] bg-[#1c1c22] px-2 py-2'>
              <div className='flex items-center justify-between mb-1'>
                <p className='text-[10px] text-[#888892] uppercase tracking-wider'>
                  Queue ({queuedGoals.length})
                </p>
                <div className='flex items-center gap-3'>
                  <button
                    onClick={() => toggleQueuePaused()}
                    className='text-[10px] text-[#8bb8ff] hover:text-[#bfd3ff] transition-colors'
                  >
                    {isQueuePaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={() => clearQueuedGoals()}
                    className='text-[10px] text-[#666672] hover:text-[#e4e4eb] transition-colors'
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className='space-y-1 max-h-24 overflow-y-auto'>
                {queuedGoals.map((goal, idx) => (
                  <div key={`${goal}-${idx}`} className='flex items-center gap-2'>
                    <span className='text-[10px] text-[#505060] flex-shrink-0'>{idx + 1}.</span>
                    <p className='text-xs text-[#c4c4cc] truncate flex-1'>{goal}</p>
                    <button
                      onClick={() => removeQueuedGoal(idx)}
                      className='text-[10px] text-[#666672] hover:text-[#e4e4eb] transition-colors'
                      title='Remove queued goal'
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className='px-4 pt-3 pb-1'>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRunning ? 'Agent is working... Add another goal to queue.' : 'Describe what you want to build or change...'}
            rows={2}
            className='w-full bg-transparent text-sm text-[#e4e4eb] placeholder-[#505060] focus:outline-none resize-none leading-relaxed'
          />
        </div>

        {mentionSuggestions.length > 0 && (
          <div className='px-4 pb-1'>
            <div className='rounded border border-[#2a2a33] bg-[#1c1c22] overflow-hidden max-h-32 overflow-y-auto'>
              {mentionSuggestions.map((candidate) => (
                <button
                  key={`${candidate.kind}:${candidate.value}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyMention(candidate);
                  }}
                  className='w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left hover:bg-[#222228] transition-colors'
                >
                  <span className='text-xs text-[#e4e4eb] truncate flex items-center gap-1.5'>
                    {candidate.kind === 'agent' && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          candidate.activity === 'running' ? 'bg-[#4ade80] animate-pulse' : 'bg-[#64748b]'
                        }`}
                      />
                    )}
                    @{candidate.label}
                  </span>
                  <span className='text-[10px] uppercase tracking-wide text-[#666672] flex-shrink-0'>
                    {candidate.kind}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className='flex items-center justify-between px-4 pb-3 pt-1'>
          <span className='text-xs text-[#505060]'>
            Claude Opus 4.6 · {projectPath?.split('/').pop()}
          </span>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || !projectPath}
              className='flex items-center gap-1.5 px-3 py-1 bg-[#9333ea] hover:bg-[#7e22ce] disabled:opacity-30 disabled:cursor-not-allowed text-white rounded text-xs transition-colors'
            >
              <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
                <path d='M2 6l7-4-3 8-1-3-3-1z' stroke='white' strokeWidth='1.2' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
              {isRunning ? 'Queue' : 'Run'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

interface RendererProps { item: ConversationItemType }

const ConversationItemRenderer = React.memo(function ConversationItemRenderer({ item }: RendererProps) {
  switch (item.type) {
    case 'goal':
      return (
        <div className='rounded border border-[#1e4a1e] bg-[#0c1c0c] px-3 py-2.5'>
          <p className='text-sm text-[#4ade80] leading-relaxed'>{item.content}</p>
        </div>
      );
    case 'response':
      return <p className='text-sm text-[#c4c4cc] leading-relaxed whitespace-pre-line'>{item.content}</p>;
    case 'agent-started':
      return (
        <div className='flex items-center gap-2 py-0.5'>
          <div className='w-2 h-2 rounded-full bg-[#22c55e] animate-pulse flex-shrink-0' />
          <span className='text-xs text-[#888892]'>
            <span className='text-[#e4e4eb] font-medium'>{item.agentId}</span>
            {item.taskId !== undefined ? ` — ${item.taskId}` : ' — started'}
          </span>
        </div>
      );
    case 'agent-progress':
      return (
        <div className='rounded border border-[#2a2a33] bg-[#1c1c22] overflow-hidden'>
          <div className='flex items-center gap-2 px-3 py-2 border-b border-[#2a2a33]'>
            <div className='w-2 h-2 rounded-full bg-[#22c55e] animate-pulse flex-shrink-0' />
            <span className='text-xs font-medium text-[#e4e4eb]'>{item.agentId}</span>
            <span className='text-[10px] text-[#888892] ml-auto'>Running...</span>
          </div>
          <div className='p-3'>
            <pre className='text-xs text-[#a6adc8] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap'><code>{item.content}</code></pre>
          </div>
        </div>
      );
    case 'agent-completed':
      return (
        <div className='rounded border border-[#2a2a33] bg-[#1c1c22] overflow-hidden'>
          <div className='flex items-center justify-between px-3 py-2.5'>
            <div className='flex items-center gap-2'>
              <div className='w-2 h-2 rounded-full bg-[#86efac] flex-shrink-0' />
              <span className='text-xs font-medium text-[#e4e4eb]'>{item.agentId}</span>
            </div>
            <span className='text-xs text-[#86efac]'>Complete</span>
          </div>
          <p className='px-3 pb-2 text-xs text-[#888892] leading-relaxed'>{item.summary}</p>
          {item.files.length > 0 && (
            <div className='px-3 pb-3 flex flex-wrap gap-1'>
              {item.files.map((f, i) => (
                <span key={i} className='text-[10px] font-mono text-[#6b8fd4] bg-[#111115] border border-[#2a2a33] px-1.5 py-0.5 rounded'>
                  {f.split('/').pop()}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    case 'agent-failed':
      return (
        <div className='rounded border border-[#4a1e1e] bg-[#1c0c0c] px-3 py-2.5'>
          <div className='flex items-center gap-2 mb-1'>
            <div className='w-2 h-2 rounded-full bg-[#ef4444] flex-shrink-0' />
            <span className='text-xs font-medium text-[#e4e4eb]'>{item.agentId}</span>
            <span className='text-xs text-[#ef4444] ml-auto'>Failed</span>
          </div>
          <p className='text-xs text-[#f87171] leading-relaxed'>{item.error}</p>
        </div>
      );
    case 'verify-pass':
      return (
        <div className='rounded border border-[#1e4a1e] bg-[#0c1c0c] px-3 py-2.5'>
          <div className='flex items-center justify-between mb-1'>
            <span className='text-xs text-[#4ade80] font-medium'>Verification passed</span>
            <span className='text-[10px] text-[#22c55e]'>{Math.round(item.coverage * 100)}% coverage</span>
          </div>
          <p className='text-xs text-[#86efac] leading-relaxed'>{item.summary}</p>
        </div>
      );
    case 'verify-fail':
      return (
        <div className='rounded border border-[#4a3a1e] bg-[#1c150c] px-3 py-2.5 space-y-1'>
          <span className='text-xs text-[#f59e0b] font-medium'>Issues found — retrying...</span>
          {item.issues.slice(0, 3).map((issue, i) => (
            <p key={i} className='text-xs text-[#d97706] leading-relaxed'>• {issue}</p>
          ))}
        </div>
      );
    case 'pipeline-completed':
      return (
        <div className='rounded border border-[#1e4a1e] bg-[#0c1c0c] px-3 py-2.5'>
          <p className='text-xs text-[#4ade80] font-medium mb-1'>Done</p>
          <p className='text-xs text-[#86efac] leading-relaxed'>{item.summary}</p>
        </div>
      );
    case 'pipeline-failed':
      return (
        <div className='rounded border border-[#4a1e1e] bg-[#1c0c0c] px-3 py-2.5'>
          <p className='text-xs text-[#ef4444] font-medium mb-1'>Pipeline failed</p>
          <p className='text-xs text-[#f87171] leading-relaxed'>{item.error}</p>
        </div>
      );
    default:
      return null;
  }
});
