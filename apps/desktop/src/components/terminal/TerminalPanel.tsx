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
            background: '#181825',
            foreground: '#cdd6f4',
            cursor: '#89b4fa',
          },
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 12,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        if (containerRef.current) {
          term.open(containerRef.current);
          fitAddon.fit();
        }

        xtermInstance = term;

        const { id } = await window.intentIde.terminal.create(projectPath) as { id: string };
        terminalIdRef.current = id;

        term.onData((data) => {
          void window.intentIde.terminal.write(id, data);
        });

        window.intentIde.terminal.onData(id, (data) => {
          term.write(data);
        });
      } catch {
        // xterm not installed, show placeholder
        if (containerRef.current) {
          containerRef.current.innerHTML =
            '<div style="padding: 8px; color: #6c7086; font-size: 12px;">Terminal (install @xterm/xterm to enable)</div>';
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
    <div className='flex flex-col h-full bg-[#181825]'>
      <div className='flex items-center justify-between px-3 py-1.5 border-b border-[#313244]'>
        <span className='text-xs font-semibold uppercase text-[#6c7086]'>Terminal</span>
      </div>
      <div ref={containerRef} className='flex-1 p-1' />
    </div>
  );
});
