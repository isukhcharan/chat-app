import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles, Loader2, Send, MessageSquare } from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { formatMessageTime, cn } from '@/lib/utils';
import Avatar from '@/components/shared/Avatar';

interface ThreadPanelProps {
  parentMessage: Message;
  channelId: string;
  onClose: () => void;
}

export default function ThreadPanel({ parentMessage, channelId, onClose }: ThreadPanelProps) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const socket = getSocket();

  useEffect(() => {
    setLoading(true);
    setSummary(null);
    api.get(`/channels/${channelId}/messages/${parentMessage.id}/replies`)
      .then((data: any) => { setReplies(data || []); setLoading(false); })
      .catch(() => setLoading(false));

    // Focus reply input when panel opens
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [channelId, parentMessage.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies.length]);

  useEffect(() => {
    const onNewMessage = (msg: Message) => {
      if (msg.parentId !== parentMessage.id) return;
      setReplies((prev) => {
        if (prev.some((r) => r.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const onConfirmed = ({ pendingId, message: msg }: { pendingId: string; message: Message }) => {
      if (msg.parentId !== parentMessage.id) return;
      setReplies((prev) => {
        const idx = prev.findIndex(
          (m) => m.id === pendingId || (m._pending && m.content === msg.content && m.user.id === msg.user.id),
        );
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = msg;
          return next;
        }
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const onUpdated = (msg: Message) => {
      setReplies((prev) => prev.map((m) => m.id === msg.id ? msg : m));
    };

    const onDeleted = ({ id }: { id: string }) => {
      setReplies((prev) => prev.filter((m) => m.id !== id));
    };

    const onReactionsUpdated = ({ messageId, reactions }: any) => {
      setReplies((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    };

    const onSummary = ({ messageId, summary: s }: any) => {
      if (messageId === parentMessage.id) { setSummary(s); setSummarizing(false); }
    };

    socket.on('message:new', onNewMessage);
    socket.on('message:confirmed', onConfirmed);
    socket.on('message:updated', onUpdated);
    socket.on('message:deleted', onDeleted);
    socket.on('message:reactions_updated', onReactionsUpdated);
    socket.on('ai:summary', onSummary);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:confirmed', onConfirmed);
      socket.off('message:updated', onUpdated);
      socket.off('message:deleted', onDeleted);
      socket.off('message:reactions_updated', onReactionsUpdated);
      socket.off('ai:summary', onSummary);
    };
  }, [parentMessage.id]);

  const handleReply = useCallback(() => {
    const trimmed = reply.trim();
    if (!trimmed || !user) return;

    // Optimistic
    const optimistic: Message = {
      id: `pending-${Date.now()}`,
      content: trimmed,
      isAI: false,
      createdAt: new Date().toISOString(),
      channelId,
      parentId: parentMessage.id,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      reactions: [],
      _count: { replies: 0 },
      _pending: true,
    };
    setReplies((prev) => [...prev, optimistic]);
    setReply('');
    socket.emit('message:send', { channelId, content: trimmed, parentId: parentMessage.id });
  }, [reply, channelId, parentMessage.id, user]);

  const handleSummarize = useCallback(() => {
    setSummarizing(true);
    setSummary(null);
    socket.emit('ai:summarize', { channelId, messageId: parentMessage.id });
  }, [channelId, parentMessage.id]);

  return (
    <div className="w-[340px] flex-shrink-0 border-l border-border flex flex-col bg-base-900 animate-slide-up">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
        <MessageSquare className="w-4 h-4 text-text-muted flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold">Thread</h3>
          <p className="text-xs text-text-muted">
            {replies.length === 0 ? 'No replies yet' : `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {replies.length > 0 && !summarizing && (
            <button
              onClick={handleSummarize}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20 transition-colors"
            >
              <Sparkles className="w-3 h-3" /> Summarize
            </button>
          )}
          {summarizing && (
            <span className="flex items-center gap-1 text-xs text-cyan-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Summarizing…
            </span>
          )}
          <button
            onClick={onClose}
            className="ml-1 p-1.5 rounded hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Parent message */}
      <div className="px-4 py-3 border-b border-border bg-base-800/40 flex-shrink-0">
        <div className="flex gap-2.5">
          <Avatar name={parentMessage.user.displayName} avatarUrl={parentMessage.user.avatarUrl} size="sm" className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-xs font-semibold text-text-primary">{parentMessage.user.displayName}</span>
              <span className="text-[10px] text-text-muted">{formatMessageTime(parentMessage.createdAt)}</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap break-words line-clamp-4">
              {parentMessage.content}
            </p>
          </div>
        </div>
      </div>

      {/* AI summary */}
      {summary && (
        <div className="mx-3 mt-3 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 mb-2">
            <Sparkles className="w-3 h-3" /> AI Summary
          </div>
          <p className="text-xs text-cyan-50/80 whitespace-pre-wrap leading-relaxed">{summary}</p>
          <button onClick={() => setSummary(null)} className="mt-2 text-[10px] text-cyan-500/60 hover:text-cyan-400 transition-colors">
            Dismiss
          </button>
        </div>
      )}

      {/* Replies */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
          </div>
        ) : replies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-text-muted gap-1">
            <MessageSquare className="w-6 h-6 opacity-20" />
            <p className="text-xs">Be the first to reply</p>
          </div>
        ) : (
          replies.map((r) => (
            <div key={r.id} className={cn('flex gap-2.5 px-4', r._pending && 'opacity-60')}>
              <Avatar name={r.user.displayName} avatarUrl={r.user.avatarUrl} size="sm" className="flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-text-primary">{r.user.displayName}</span>
                  <span className="text-[10px] text-text-muted">{formatMessageTime(r.createdAt)}</span>
                  {r._pending && <span className="text-[10px] text-text-muted italic">sending…</span>}
                </div>
                <p className="text-sm text-text-primary/90 leading-relaxed whitespace-pre-wrap break-words">{r.content}</p>
                {/* Reactions on replies */}
                {r.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(
                      r.reactions.reduce((acc: Record<string, number>, rx) => {
                        acc[rx.emoji] = (acc[rx.emoji] || 0) + 1;
                        return acc;
                      }, {}),
                    ).map(([emoji, count]) => (
                      <span key={emoji} className="text-xs bg-white/5 border border-border px-1.5 py-0.5 rounded-full">
                        {emoji} {count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="px-3 py-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2 bg-base-700 border border-border rounded-lg px-3 py-2.5 focus-within:border-indigo-500/50 transition-colors">
          <Avatar name={user?.displayName || ''} size="xs" className="flex-shrink-0" />
          <input
            ref={inputRef}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleReply())}
            placeholder={`Reply in thread…`}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
          />
          <button
            onClick={handleReply}
            disabled={!reply.trim()}
            className="text-indigo-400 hover:text-indigo-300 disabled:text-text-muted disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-text-muted mt-1.5 px-0.5">
          <kbd className="bg-base-600 border border-border rounded px-1 text-[9px]">Enter</kbd> to reply
        </p>
      </div>
    </div>
  );
}
