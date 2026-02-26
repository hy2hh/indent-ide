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

function searchFiles(
  nodes: FileTreeNode[],
  query: string,
  out: MentionCandidate[],
  limit: number
): void {
  const lowerQuery = query.toLowerCase();
  for (const node of nodes) {
    if (out.length >= limit) {
      return;
    }
    if (node.type === 'file') {
      if (node.path.toLowerCase().includes(lowerQuery)) {
        out.push({
          value: node.path,
          label: node.path,
          kind: 'file',
        });
      }
    } else if (node.children && node.children.length > 0) {
      searchFiles(node.children, query, out, limit);
    }
  }
}

export const ConversationPanel = React.memo(function ConversationPanel() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    startPipeline,
    cancelPipeline,
    pipelineStatus,
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

  const agentMentions = React.useMemo(
    () => buildAgentMentions(conversationItems),
    [conversationItems]
  );

  const mentionSuggestions = React.useMemo(() => {
    if (mentionQuery === null) {
      return [] as MentionCandidate[];
    }

    const lowerQuery = mentionQuery.toLowerCase();
    const filteredAgents = agentMentions.filter((a) =>
      a.label.toLowerCase().includes(lowerQuery)
    );

    if (filteredAgents.length >= 8) {
      return filteredAgents.slice(0, 8);
    }

    const files: MentionCandidate[] = [];
    searchFiles(fileTree, mentionQuery, files, 8 - filteredAgents.length);

    return [...filteredAgents, ...files];
  }, [fileTree, agentMentions, mentionQuery]);

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
    <div className='flex flex-col h-full bg-[#0b0d12] font-sans overflow-hidden'>
      {/* Header */}
      <div className='px-6 flex-shrink-0 border-b border-[#1c222d] flex items-center justify-between h-[40px] bg-[#0b0d12] shadow-sm'>
        <p className='text-[9px] font-black tracking-[0.25em] text-[#505060] uppercase opacity-80'>
          {conversationItems.length > 0 ? 'Multi-Agent Session' : 'New Intent Engine'}
        </p>
        {isRunning && (
          <button
            onClick={() => void cancelPipeline()}
            className='text-[9px] font-black text-[#ef4444] hover:text-[#f87171] transition-all flex items-center gap-2 bg-[#1c0c0c] px-3 py-1 rounded-full border border-[#4a1e1e]/50'
          >
            <div className='w-1.5 h-1.5 bg-[#ef4444] rounded-full animate-pulse' />
            STOP PIPELINE
          </button>
        )}
      </div>

      {/* Tab Bar */}
      {tabs.length > 1 && (
        <div className='flex-shrink-0 flex items-center gap-1 px-4 py-2 border-b border-[#1c222d] overflow-x-auto bg-[#0b0d12] scrollbar-hide'>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-1.5 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-[#1b315e] text-[#cfe0ff] shadow-sm ring-1 ring-white/10'
                  : 'text-[#666672] hover:text-[#a1acc5] hover:bg-[#131722]'
              }`}
            >
              <div
                className='w-1.5 h-1.5 rounded-full shadow-[0_0_6px_currentColor]'
                style={{ backgroundColor: tab.dotColor }}
              />
              <span className='text-[10px] font-black uppercase tracking-[0.1em]'>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className='flex-1 overflow-y-auto px-8 py-8 space-y-6 custom-scrollbar'>
        {filteredItems.length === 0 && (
          <div className='flex flex-col items-center justify-center h-full gap-5 opacity-40'>
            <div className='w-16 h-16 rounded-[24px] border-2 border-[#1c222d] flex items-center justify-center bg-[#131722]/20 rotate-3'>
              <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#505060' strokeWidth='2' className='-rotate-3'>
                <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
              </svg>
            </div>
            <div className='text-center'>
              <p className='text-[10px] font-black uppercase tracking-[0.3em] text-[#505060]'>Initialize System Intent</p>
              <p className='text-[10px] text-[#383840] mt-2 font-mono font-bold tracking-tight'>PRESS ⌘ + ↵ TO EXECUTE PIPELINE</p>
            </div>
          </div>
        )}

        {filteredItems.map((item, idx) => (
          <ConversationItemRenderer key={idx} item={item} />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className='flex-shrink-0 border-t border-[#1c222d] bg-[#0b0d12]/95 backdrop-blur-2xl px-6 pb-6 pt-4'>
        {queuedGoals.length > 0 && (
          <div className='mb-4'>
            <div className='rounded-xl border border-[#1c222d] bg-[#131722]/40 px-4 py-3 shadow-inner'>
              <div className='flex items-center justify-between mb-3'>
                <p className='text-[9px] font-black text-[#505060] uppercase tracking-[0.2em] opacity-80'>
                  Pipeline Queue ({queuedGoals.length})
                </p>
                <div className='flex items-center gap-4'>
                  <button onClick={() => toggleQueuePaused()} className='text-[9px] font-black text-[#4f8cff] hover:text-[#8bb8ff] tracking-widest'>
                    {isQueuePaused ? 'RESUME' : 'PAUSE'}
                  </button>
                  <button onClick={() => clearQueuedGoals()} className='text-[9px] font-black text-[#505060] hover:text-[#a1acc5] tracking-widest'>
                    CLEAR
                  </button>
                </div>
              </div>
              <div className='space-y-2 max-h-24 overflow-y-auto custom-scrollbar pr-2'>
                {queuedGoals.map((goal, idx) => (
                  <div key={`${goal}-${idx}`} className='flex items-center gap-3 group bg-[#0b0d12]/40 p-1.5 rounded-lg border border-transparent hover:border-[#1c222d] transition-all'>
                    <span className='text-[9px] text-[#383840] font-mono font-bold w-4'>{idx + 1}</span>
                    <p className='text-[11px] text-[#666672] truncate flex-1 font-medium'>{goal}</p>
                    <button onClick={() => removeQueuedGoal(idx)} className='opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[#505060] hover:text-[#ef4444] px-1'>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className='relative group'>
          <div className='absolute -inset-1 bg-gradient-to-b from-[#4f8cff]/10 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none' />
          <div className='relative rounded-2xl border border-[#1c222d] bg-[#131722]/30 p-4 transition-all focus-within:border-[#4f8cff]/40 focus-within:bg-[#131722]/50 shadow-sm'>
             <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRunning ? 'Pipeline in progress... Queue next goal' : 'Describe your objective... Use @ for context'}
              rows={2}
              className='w-full bg-transparent text-[13px] text-[#e4e4eb] placeholder-[#383840] focus:outline-none resize-none leading-relaxed font-medium'
            />
            
            {mentionSuggestions.length > 0 && (
              <div className='absolute bottom-full left-0 mb-3 w-80 rounded-2xl border border-[#1c222d] bg-[#0b0d12]/98 backdrop-blur-2xl shadow-2xl overflow-hidden z-50 ring-1 ring-white/5'>
                <div className='px-3 py-2 bg-[#131722]/50 border-b border-[#1c222d]'>
                  <span className='text-[8px] font-black text-[#505060] uppercase tracking-[0.2em]'>Suggestions</span>
                </div>
                {mentionSuggestions.map((candidate) => (
                  <button
                    key={`${candidate.kind}:${candidate.value}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyMention(candidate);
                    }}
                    className='w-full flex items-center justify-between gap-4 px-4 py-2.5 text-left hover:bg-[#4f8cff]/10 transition-colors border-b border-[#1c222d]/50 last:border-0'
                  >
                    <div className='flex items-center gap-3 min-w-0'>
                      {candidate.kind === 'agent' ? (
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${candidate.activity === 'running' ? 'bg-[#22c55e] animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-[#505060]'}`} />
                      ) : (
                        <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='#505060' strokeWidth='2.5' className='flex-shrink-0'>
                          <path d='M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z' /><polyline points='13 2 13 9 20 9' />
                        </svg>
                      )}
                      <span className='text-[11px] text-[#a1acc5] truncate font-mono'>@{candidate.label}</span>
                    </div>
                    <span className='text-[8px] font-black uppercase tracking-widest text-[#383840] bg-[#131722] px-1.5 py-0.5 rounded'>{candidate.kind}</span>
                  </button>
                ))}
              </div>
            )}

            <div className='flex items-center justify-between mt-3 pt-3 border-t border-[#1c222d]/30'>
              <div className='flex items-center gap-3 opacity-60'>
                <div className='flex items-center gap-1.5'>
                  <div className='w-1.5 h-1.5 rounded-full bg-[#9333ea]' />
                  <span className='text-[9px] font-black text-[#505060] uppercase tracking-tighter'>Coordinator v1.0</span>
                </div>
                <div className='w-1 h-1 rounded-full bg-[#383840]' />
                <span className='text-[9px] font-bold text-[#505060] truncate max-w-[140px] uppercase tracking-tighter'>
                  {projectPath?.split('/').pop()}
                </span>
              </div>
              
              <button
                onClick={() => void handleSend()}
                disabled={!input.trim() || !projectPath}
                className={`flex items-center gap-2.5 px-5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg ${
                  isRunning 
                    ? 'bg-[#131722] text-[#4f8cff] border border-[#1c222d] hover:border-[#4f8cff]/40' 
                    : 'bg-[#4f8cff] text-white hover:bg-[#3b82f6] hover:shadow-[0_0_25px_rgba(79,140,255,0.3)]'
                } disabled:opacity-10 disabled:shadow-none disabled:grayscale`}
              >
                {isRunning ? 'ENQUEUE' : 'START PIPELINE'}
                <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3'>
                  <path d='M22 2L11 13' /><path d='M22 2l-7 20-4-9-9-4 20-7z' />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
    </div>
  );
});

interface RendererProps { item: ConversationItemType }

const ConversationItemRenderer = React.memo(function ConversationItemRenderer({ item }: RendererProps) {
  switch (item.type) {
    case 'goal':
      return (
        <div className='flex justify-end'>
          <div className='max-w-[85%] rounded-2xl bg-[#131722] border border-[#1c222d] px-4 py-3 shadow-lg'>
            <p className='text-sm text-[#cfe0ff] leading-relaxed'>{item.content}</p>
          </div>
        </div>
      );
    case 'response':
      return (
        <div className='flex gap-4 max-w-[90%]'>
          <div className='flex-shrink-0 w-8 h-8 rounded-lg bg-[#9333ea]/20 border border-[#9333ea]/30 flex items-center justify-center'>
            <span className='text-[10px] font-bold text-[#9333ea]'>CO</span>
          </div>
          <p className='text-sm text-[#a1acc5] leading-relaxed py-1.5 whitespace-pre-line'>{item.content}</p>
        </div>
      );
    case 'agent-started':
      return (
        <div className='flex items-center gap-3 py-2 px-4 rounded-xl border border-[#1c222d] bg-[#131722]/20'>
          <div className='w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse' />
          <span className='text-[10px] font-bold text-[#505060] uppercase tracking-widest'>AGENT ACTIVATED</span>
          <span className='text-[11px] text-[#a1acc5] font-medium'>{item.agentId}</span>
          {item.taskId && <span className='text-[10px] text-[#383840] font-mono'>[{item.taskId}]</span>}
        </div>
      );
    case 'agent-progress':
      return (
        <div className='rounded-2xl border border-[#1c222d] bg-[#0b0d12] overflow-hidden shadow-2xl'>
          <div className='flex items-center justify-between px-4 py-2 border-b border-[#1c222d] bg-[#131722]/30'>
            <div className='flex items-center gap-2'>
              <div className='w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse' />
              <span className='text-[10px] font-bold text-[#e4e4eb] uppercase tracking-widest'>{item.agentId}</span>
            </div>
            <span className='text-[9px] font-bold text-[#505060] uppercase tracking-tighter'>Executing...</span>
          </div>
          <div className='p-4'>
            <pre className='text-[11px] text-[#666672] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap'><code>{item.content}</code></pre>
          </div>
        </div>
      );
    case 'agent-completed':
      return (
        <div className='rounded-2xl border border-[#1c222d] bg-[#131722]/40 overflow-hidden shadow-lg'>
          <div className='flex items-center justify-between px-4 py-2.5 bg-[#0c1c0c]/30 border-b border-[#1c222d]'>
            <div className='flex items-center gap-2'>
              <div className='w-1.5 h-1.5 rounded-full bg-[#22c55e]' />
              <span className='text-[10px] font-bold text-[#e4e4eb] uppercase tracking-widest'>{item.agentId}</span>
            </div>
            <span className='text-[9px] font-bold text-[#22c55e] uppercase tracking-widest'>Success</span>
          </div>
          <div className='p-4 space-y-3'>
            <p className='text-xs text-[#a1acc5] leading-relaxed'>{item.summary}</p>
            {item.files.length > 0 && (
              <div className='flex flex-wrap gap-1.5'>
                {item.files.map((f, i) => (
                  <span key={i} className='text-[9px] font-mono text-[#4f8cff] bg-[#0b0d12] border border-[#1c222d] px-2 py-0.5 rounded-md'>
                    {f.split('/').pop()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    case 'agent-failed':
      return (
        <div className='rounded-2xl border border-[#4a1e1e] bg-[#1c0c0c] p-4 shadow-lg'>
          <div className='flex items-center gap-2 mb-2'>
            <div className='w-1.5 h-1.5 rounded-full bg-[#ef4444]' />
            <span className='text-[10px] font-bold text-[#e4e4eb] uppercase tracking-widest'>{item.agentId}</span>
            <span className='text-[9px] font-bold text-[#ef4444] ml-auto uppercase tracking-widest'>Pipeline Interrupted</span>
          </div>
          <p className='text-xs text-[#f87171] leading-relaxed'>{item.error}</p>
        </div>
      );
    case 'verify-pass':
      return (
        <div className='rounded-2xl border border-[#1e4a1e] bg-[#0c1c0c] p-4 shadow-lg'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-[10px] text-[#4ade80] font-bold uppercase tracking-widest'>Verification Passed</span>
            <span className='text-[10px] text-[#22c55e] font-mono'>{Math.round(item.coverage * 100)}% COV</span>
          </div>
          <p className='text-xs text-[#86efac] leading-relaxed'>{item.summary}</p>
        </div>
      );
    case 'verify-fail':
      return (
        <div className='rounded-2xl border border-[#4a3a1e] bg-[#1c150c] p-4 space-y-2'>
          <span className='text-[10px] text-[#f59e0b] font-bold uppercase tracking-widest'>Refinement Required</span>
          {item.issues.slice(0, 3).map((issue, i) => (
            <div key={i} className='flex gap-2 text-xs text-[#d97706] leading-relaxed'>
              <span className='opacity-50'>•</span>
              {issue}
            </div>
          ))}
        </div>
      );
    case 'pipeline-completed':
      return (
        <div className='flex flex-col items-center py-6 space-y-3'>
          <div className='w-10 h-10 rounded-full bg-[#22c55e]/20 flex items-center justify-center border border-[#22c55e]/30'>
             <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#22c55e' strokeWidth='3'>
               <polyline points='20 6 9 17 4 12' />
             </svg>
          </div>
          <div className='text-center'>
            <p className='text-[11px] font-bold text-[#e4e4eb] uppercase tracking-widest mb-1'>Intent Fulfilled</p>
            <p className='text-[10px] text-[#505060] max-w-sm'>{item.summary}</p>
          </div>
        </div>
      );
    case 'pipeline-failed':
      return (
        <div className='flex flex-col items-center py-6 space-y-3 opacity-80'>
          <div className='w-10 h-10 rounded-full bg-[#ef4444]/20 flex items-center justify-center border border-[#ef4444]/30'>
             <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='3'>
               <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
             </svg>
          </div>
          <div className='text-center'>
            <p className='text-[11px] font-bold text-[#f87171] uppercase tracking-widest mb-1'>Pipeline Halted</p>
            <p className='text-[10px] text-[#505060] max-w-sm'>{item.error}</p>
          </div>
        </div>
      );
    default:
      return null;
  }
});


