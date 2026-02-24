import React, { useState, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export const ChatPanel = React.memo(function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) {
      return;
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Placeholder: actual CLI streaming goes here
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-reply`,
        role: 'assistant',
        content: 'Chat functionality requires a connected CLI provider.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 500);
  }, [input, isLoading]);

  return (
    <div className='flex flex-col h-full'>
      <div className='px-3 py-2 border-b border-[#313244]'>
        <span className='text-xs font-semibold uppercase text-[#6c7086]'>Chat</span>
      </div>

      {/* Messages */}
      <div className='flex-1 overflow-y-auto p-2 space-y-2'>
        {messages.length === 0 ? (
          <p className='text-xs text-[#6c7086] text-center py-4'>
            Ask questions about your codebase
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`text-xs rounded p-2 ${
                msg.role === 'user'
                  ? 'bg-[#313244] text-[#cdd6f4] ml-4'
                  : 'bg-[#181825] text-[#cdd6f4] mr-4'
              }`}
            >
              {msg.content}
            </div>
          ))
        )}
        {isLoading && (
          <div className='text-xs text-[#6c7086] animate-pulse px-2'>Thinking...</div>
        )}
      </div>

      {/* Input */}
      <div className='p-2 border-t border-[#313244] flex gap-2'>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { void handleSend(); } }}
          placeholder='Ask about your code...'
          className='flex-1 bg-[#181825] border border-[#313244] rounded px-2 py-1 text-xs text-[#cdd6f4] placeholder-[#6c7086] focus:outline-none focus:border-[#89b4fa]'
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className='px-2 py-1 text-xs rounded bg-[#313244] text-[#89b4fa] hover:bg-[#45475a] disabled:opacity-50 transition-colors'
        >
          →
        </button>
      </div>
    </div>
  );
});
