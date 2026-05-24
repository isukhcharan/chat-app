import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  channelName: string;
  onSend: (content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  onRequestSuggestions: () => void;
  suggestions: string[];
  aiThinking: boolean;
  disabled?: boolean;
}

export default function MessageInput({
  channelName,
  onSend,
  onTypingStart,
  onTypingStop,
  onRequestSuggestions,
  suggestions,
  aiThinking,
  disabled,
}: MessageInputProps) {
  const [value, setValue] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      onTypingStart();
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(onTypingStop, 2000);
    },
    [onTypingStart, onTypingStop],
  );

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
    clearTimeout(typingTimeoutRef.current);
    onTypingStop();
  }, [value, onSend, onTypingStop]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isAICommand = value.startsWith('/ai ');

  return (
    <div className="px-4 py-3 border-t border-border">
      {/* Smart reply suggestions */}
      {suggestions.length > 0 && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => { setValue(s); }}
              className="px-2.5 py-1 bg-indigo-600/10 border border-indigo-500/20 rounded-full text-xs text-indigo-300 hover:bg-indigo-600/20 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* AI hint */}
      {isAICommand && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-cyan-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Asking Nexus AI…</span>
        </div>
      )}

      {/* AI thinking indicator */}
      {aiThinking && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-cyan-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Nexus AI is thinking…</span>
        </div>
      )}

      <div className={cn(
        'flex items-end gap-2 bg-base-700 border rounded-lg px-3 py-2 transition-colors',
        isAICommand ? 'border-cyan-500/40' : 'border-border focus-within:border-indigo-500/50',
      )}>
        <textarea
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName} — type /ai [question] to ask AI`}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted resize-none max-h-36 focus:outline-none leading-5"
          style={{ height: 'auto', minHeight: '20px' }}
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = 'auto';
            t.style.height = `${t.scrollHeight}px`;
          }}
        />
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onRequestSuggestions}
            className="p-1.5 rounded hover:bg-white/5 text-text-muted hover:text-cyan-400 transition-colors"
            title="Get AI reply suggestions"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className={cn(
              'p-1.5 rounded transition-colors',
              value.trim()
                ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'
                : 'text-text-muted cursor-not-allowed',
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-[10px] text-text-muted mt-1.5 px-0.5">
        <kbd className="bg-base-600 border border-border rounded px-1 text-[9px]">Enter</kbd> to send ·{' '}
        <kbd className="bg-base-600 border border-border rounded px-1 text-[9px]">Shift+Enter</kbd> for newline
      </p>
    </div>
  );
}
