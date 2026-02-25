import React, { useEffect, useMemo, useState } from 'react';
import { useUiStore } from '../../stores/uiStore.js';

export const BrowserPanel = React.memo(function BrowserPanel() {
  const {
    browserUrl,
    browserHistory,
    historyIndex,
    browserRevision,
    setBrowserUrl,
    goBack,
    goForward,
    reloadBrowser,
  } = useUiStore();
  const [inputUrl, setInputUrl] = useState(browserUrl);

  useEffect(() => {
    setInputUrl(browserUrl);
  }, [browserUrl]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex >= 0 && historyIndex < browserHistory.length - 1;

  const iframeSrc = useMemo(() => browserUrl, [browserUrl, browserRevision]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBrowserUrl(inputUrl);
  };

  return (
    <div className='flex h-full flex-col bg-[#0f1116]'>
      <div className='flex h-9 flex-shrink-0 items-center gap-1 border-b border-[#262d3d] bg-[#131722] px-2'>
        <button
          onClick={() => goBack()}
          disabled={!canGoBack}
          className='rounded border border-[#262d3d] bg-[#0d111a] px-1.5 py-0.5 text-[10px] text-[#a1acc5] hover:border-[#33405a] hover:text-[#eef2ff] disabled:opacity-40 disabled:hover:border-[#262d3d] disabled:hover:text-[#a1acc5] transition-colors'
          title='Back'
        >
          ←
        </button>
        <button
          onClick={() => goForward()}
          disabled={!canGoForward}
          className='rounded border border-[#262d3d] bg-[#0d111a] px-1.5 py-0.5 text-[10px] text-[#a1acc5] hover:border-[#33405a] hover:text-[#eef2ff] disabled:opacity-40 disabled:hover:border-[#262d3d] disabled:hover:text-[#a1acc5] transition-colors'
          title='Forward'
        >
          →
        </button>
        <button
          onClick={() => reloadBrowser()}
          className='rounded border border-[#262d3d] bg-[#0d111a] px-1.5 py-0.5 text-[10px] text-[#a1acc5] hover:border-[#33405a] hover:text-[#eef2ff] transition-colors'
          title='Reload'
        >
          ↻
        </button>
        <form className='flex flex-1 items-center gap-1' onSubmit={handleSubmit}>
          <input
            value={inputUrl}
            onChange={(event) => setInputUrl(event.target.value)}
            className='h-6 w-full rounded border border-[#262d3d] bg-[#0d111a] px-2 text-[11px] text-[#c9d4ef] placeholder-[#667085] focus:outline-none focus:border-[#4f8cff]'
            placeholder='Enter URL (localhost:3000, docs.augmentcode.com...)'
          />
          <button
            type='submit'
            className='h-6 rounded border border-[#33405a] bg-[#142343] px-2 text-[10px] text-[#8bb8ff] hover:bg-[#1b315e] transition-colors'
          >
            Go
          </button>
        </form>
      </div>
      {iframeSrc ? (
        <iframe
          key={`${iframeSrc}::${browserRevision}`}
          src={iframeSrc}
          title='Intent Browser'
          className='h-full w-full border-0 bg-[#0b0d12]'
          sandbox='allow-same-origin allow-scripts allow-forms allow-popups allow-downloads'
          referrerPolicy='no-referrer'
        />
      ) : (
        <div className='flex h-full items-center justify-center bg-[#0f1116]'>
          <p className='text-xs text-[#667085]'>Open a URL to preview docs, PRs, or local apps.</p>
        </div>
      )}
    </div>
  );
});
