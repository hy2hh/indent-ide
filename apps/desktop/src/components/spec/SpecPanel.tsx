import React, { useState, useCallback } from 'react';
import { useAgentStore } from '../../stores/agentStore.js';

interface SpecSection {
  heading: string;
  content?: string;
  bullets?: string[];
  subsections?: Array<{
    label: string;
    bullets: string[];
  }>;
  terminal?: string[];
}

const MOCK_SPEC_TITLE = 'Intent Product Page Specification';

const MOCK_SPEC_SECTIONS: SpecSection[] = [
  {
    heading: 'Overview',
    content:
      "Create a product page for Intent — Augment's new macOS desktop app that enables spec-driven development with live specs and AI agents. This is a Public Beta launch.",
  },
  {
    heading: 'Product Information (from research)',
    subsections: [
      {
        label: 'What is Intent?',
        bullets: [
          'macOS desktop app for spec-driven development with live specs',
          'Features workspaces, parallel agents, git operations',
          'Built on the philosophy that live specs become the source of truth',
          'Currently macOS (Apple Silicon) only, Windows coming later',
        ],
      },
      {
        label: 'Core Messaging',
        bullets: [
          'Paradigm shift: "For decades, developers worked at the level of code. Now we can work at the level of Intent."',
          'Public Beta: Early access, expect rough edges',
          'Spec-driven development: A new paradigm where live specifications drive implementation',
        ],
      },
    ],
  },
  {
    heading: 'Current Tasks',
    terminal: [
      '▲ Next.js 16.1.2 (Turbopack)',
      '- Local:   http://localhost:3004',
      '- Network: http://192.168.50.36:3004',
      '',
      '✓ Starting...',
      '✓ Ready in 676ms',
    ],
  },
];

const SPEC_TABS = ['Spec', 'Notes'];

export const SpecPanel = React.memo(function SpecPanel() {
  const [activeTab, setActiveTab] = useState('Spec');
  const { currentSpec } = useAgentStore();

  const handleTabClick = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className='flex flex-col h-full overflow-hidden'>
      {/* Header tabs */}
      <div className='flex items-center h-9 border-b border-[#2a2a33] flex-shrink-0'>
        {SPEC_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`flex items-center gap-1.5 px-3 h-full text-xs whitespace-nowrap border-r border-[#2a2a33] transition-colors ${
              activeTab === tab
                ? 'bg-[#1c1c22] text-[#e4e4eb]'
                : 'text-[#666672] hover:text-[#c4c4cc]'
            }`}
          >
            <span>{tab}</span>
            <span className='text-[#666672] hover:text-[#f38ba8] ml-1'>×</span>
          </button>
        ))}
      </div>

      {/* Breadcrumb */}
      <div className='px-4 py-2 flex-shrink-0 border-b border-[#2a2a33]'>
        <p className='text-[10px] tracking-widest text-[#505060] uppercase font-sans'>
          NOTES / SPEC
        </p>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto px-4 py-4'>
        {activeTab === 'Spec' && (
          <SpecContent
            title={currentSpec ? currentSpec.goal : MOCK_SPEC_TITLE}
            sections={currentSpec ? buildSectionsFromSpec(currentSpec.goal, currentSpec.tasks.map((t) => t.description)) : MOCK_SPEC_SECTIONS}
          />
        )}
        {activeTab === 'Notes' && (
          <div className='flex items-center justify-center h-full'>
            <p className='text-xs text-[#505060]'>No notes yet</p>
          </div>
        )}
      </div>
    </div>
  );
});

function buildSectionsFromSpec(goal: string, tasks: string[]): SpecSection[] {
  return [
    {
      heading: 'Overview',
      content: goal,
    },
    {
      heading: 'Tasks',
      bullets: tasks,
    },
  ];
}

interface SpecContentProps {
  title: string;
  sections: SpecSection[];
}

const SpecContent = React.memo(function SpecContent({ title, sections }: SpecContentProps) {
  return (
    <div className='space-y-5 font-sans'>
      <h2 className='text-sm font-semibold text-[#e4e4eb] leading-snug'>{title}</h2>

      {sections.map((section, idx) => (
        <div key={idx} className='space-y-2'>
          <h3 className='text-xs font-semibold text-[#e4e4eb]'>{section.heading}</h3>

          {section.content && (
            <p className='text-xs text-[#c4c4cc] leading-relaxed'>{section.content}</p>
          )}

          {section.bullets && (
            <ul className='space-y-1'>
              {section.bullets.map((bullet, i) => (
                <li key={i} className='flex items-start gap-1.5 text-xs text-[#c4c4cc]'>
                  <span className='text-[#505060] mt-0.5 flex-shrink-0'>·</span>
                  <span className='leading-relaxed'>{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          {section.subsections?.map((sub, si) => (
            <div key={si} className='space-y-1.5'>
              <p className='text-xs text-[#e4e4eb]'>{sub.label}</p>
              <ul className='space-y-1'>
                {sub.bullets.map((bullet, bi) => (
                  <li key={bi} className='flex items-start gap-1.5 text-xs text-[#c4c4cc]'>
                    <span className='text-[#505060] mt-0.5 flex-shrink-0'>·</span>
                    <span className='leading-relaxed'>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {section.terminal && (
            <TerminalBlock lines={section.terminal} />
          )}
        </div>
      ))}
    </div>
  );
});

interface TerminalBlockProps {
  lines: string[];
}

const TerminalBlock = React.memo(function TerminalBlock({ lines }: TerminalBlockProps) {
  return (
    <div className='rounded border border-[#2a2a33] overflow-hidden'>
      {/* Terminal header */}
      <div className='flex items-center justify-between px-3 py-1.5 bg-[#1c1c22] border-b border-[#2a2a33]'>
        <span className='text-[10px] text-[#888892] font-mono'>Terminal</span>
        <span className='text-[10px] text-[#666672] hover:text-[#f38ba8] cursor-pointer'>×</span>
      </div>
      {/* Terminal output */}
      <div className='bg-[#111115] px-3 py-2.5 space-y-0.5'>
        {lines.map((line, i) => (
          <p key={i} className={`text-[11px] font-mono leading-relaxed ${
            line.startsWith('✓')
              ? 'text-[#22c55e]'
              : line.startsWith('-')
                ? 'text-[#3b82f6]'
                : line.startsWith('▲')
                  ? 'text-[#e4e4eb]'
                  : 'text-[#888892]'
          }`}>
            {line || '\u00A0'}
          </p>
        ))}
      </div>
    </div>
  );
});
