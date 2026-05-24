import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles, Loader2, Send } from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import MessageItem from '@/components/chat/MessageItem';

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
  const socket = getSocket();

  useEffect(() => {
    setLoading(true);
    api.get(`/channels/${channelId}/messages/${parentMessage.id}/replies`)
      .then((data: any) => { setReplies(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [channelId, parentMessage.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  useEffect(() => {
    const onNewMessage = (msg: Message) => {
      if (msg.parentId !== parentMessage.id) return;
      setReplies((prev) => {
        if (prev.some((r) => r.id === msg.id)) return prev;
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
    socket.on('message:updated', onUpdated);
    socket.on('message:deleted', onDeleted);
    socket.on('message:reactions_updated', onReactionsUpdated);
    socket.on('ai:summary', onSummary);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:updated', onUpdated);
      socket.off('message:deleted', onDeleted);
      socket.off('message:reactions_updated', onReactionsUpdated);
      socket.off('ai:summary', onSummary);
    };
  }, [parentMessage.id]);

  const handleReply = useCallback(() => {
    const trimmed = reply.trim();
    if (!trimmed) return;
    socket.emit('message:send', { channelId, content: trimmed, parentId: parentMessage.id });
    setReply('');
  }, [reply, channelId, parentMessage.id]);

  const handleSummarize = useCallback(() => {
    setSummarizing(true);
    setSummary(null);
    socket.emit('ai:summarize', { channelId, messageId: parentMessage.id });
  }, [channelId, parentMessage.id]);

  const handleReact = useCallback((messageId: string, emoji: string) => {
    socket.emit('message:react', { messageId, emoji, channelId });
  }, [channelId]);

  const handleEdit = useCallback((messageId: string, content: string) => {
    socket.emit('message:edit', { messageId, content });
  }, []);

  const handleDelete = useCallback((messageId: string) => {
    socket.emit('message:delete', { messageId });
  }, []);

  return (
    <div className="w-80 flex-shrink-0 border-l border-border flex flex-col bg-base-900 animate-slide-up">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold">Thread</h3>
          <p className="text-xs text-text-muted">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</p>
        </div>
        <div className="flex items-center gap-1">
          {replies.length > 0 && (
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              title="Summarize thread with AI"
            >
              {summarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Summarize
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI summary */}
      {summary && (
        <div className="mx-3 mt-3 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 mb-1.5">
            <Sparkles className="w-3 h-3" />
            AI Summary
          </div>
          <p className="text-xs text-cyan-50/80 whitespace-pre-wrap leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Parent message */}
      <div className="p-3 mx-3 mt-3 mb-1 bg-base-800/50 border border-border rounded-lg">
        <p className="text-xs font-medium text-text-secondary mb-1">{parentMessage.user.displayName}</p>
        <p className="text-xs text-text-primary/80 leading-relaxed line-clamp-3">{parentMessage.content}</p>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
          </div>
        ) : replies.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-6">No replies yet</p>
        ) : (
          replies.map((r) => (
            <MessageItem
              key={r.id}
              message={r}
              onReact={handleReact}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onOpenThread={() => {}}
              isThreadReply
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="px-3 py-2.5 border-t border-border">
        <div className="flex items-center gap-2 bg-base-700 border border-border rounded-lg px-3 py-2 focus-within:border-indigo-500/50">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleReply())}
            placeholder="Reply…"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
          />
          <button
            onClick={handleReply}
            disabled={!reply.trim()}
            className="text-indigo-400 hover:text-indigo-300 disabled:text-text-muted disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
