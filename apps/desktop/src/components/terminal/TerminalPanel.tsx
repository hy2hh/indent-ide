import React, { useEffect, useRef } from 'react';

interface TerminalPanelProps {
  projectPath: string;
}

export const TerminalPanel = React.memo(function TerminalPanel({
  projectPath,
}: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalIdRef = useRef<string | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!projectPath || isInitialized.current) {
      return;
    }

    isInitialized.current = true;

    let xtermInstance: { write: (d: string) => void; dispose: () => void } | null = null;

    const init = async () => {
      try {
        const { Terminal } = await import('@xterm/xterm');
        const { FitAddon } = await import('@xterm/addon-fit');

        const term = new Terminal({
          theme: {
            background: '#0b0d12',
            foreground: '#e4e4eb',
            cursor: '#4f8cff',
            selectionBackground: 'rgba(79, 140, 255, 0.3)',
            black: '#1c222d',
            red: '#ef4444',
            green: '#22c55e',
            yellow: '#f59e0b',
            blue: '#4f8cff',
            magenta: '#9333ea',
            cyan: '#8bb8ff',
            white: '#e4e4eb',
            brightBlack: '#505060',
            brightRed: '#f87171',
            brightGreen: '#4ade80',
            brightYellow: '#fbbf24',
            brightBlue: '#73a3ff',
            brightMagenta: '#a855f7',
            brightCyan: '#bfd3ff',
            brightWhite: '#ffffff'
          },
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 12,
          cursorBlink: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        if (containerRef.current) {
          term.open(containerRef.current);
          fitAddon.fit();
          
          const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => {
              try {
                fitAddon.fit();
              } catch {
                // ignore resize errors during unmount
              }
            });
          });
          resizeObserver.observe(containerRef.current);
        }

        xtermInstance = term;

        const { id } = await window.intentIde.terminal.create(projectPath) as { id: string };
        terminalIdRef.current = id;

        term.onData((data) => {
          void window.intentIde.terminal.write(id, data);
        });

        window.intentIde.terminal.onData(id, (data: string) => {
          term.write(data);
        });
      } catch {
        // xterm not installed, show placeholder
        if (containerRef.current) {
          containerRef.current.innerHTML =
            '<div style="padding: 16px; color: #505060; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold;">Terminal Offline (install @xterm/xterm to enable)</div>';
        }
      }
    };

    void init();

    return () => {
      if (terminalIdRef.current) {
        void window.intentIde.terminal.destroy(terminalIdRef.current);
      }
      xtermInstance?.dispose();
    };
  }, [projectPath]);

  return (
    <div className='flex flex-col h-full bg-[#0b0d12]'>
      <div className='flex items-center justify-between px-5 h-[36px] border-b border-[#1c222d] bg-[#0b0d12]'>
        <span className='text-[9px] font-black uppercase tracking-[0.2em] text-[#505060] opacity-80'>Terminal</span>
        <div className='flex items-center gap-2'>
          <div className='w-1.5 h-1.5 rounded-full bg-[#22c55e]/40' />
          <span className='text-[8px] font-bold text-[#383840] uppercase'>Active</span>
        </div>
      </div>
      <div ref={containerRef} className='flex-1 p-3 overflow-hidden custom-scrollbar' />
    </div>
  );
});
