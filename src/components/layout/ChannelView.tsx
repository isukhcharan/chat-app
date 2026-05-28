import { useState, useEffect, useRef, useCallback } from 'react';
import { Hash, Users, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Attachment, Channel, Message, TypingUser } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { groupReactions } from '@/lib/utils';
import MessageItem from '@/components/chat/MessageItem';
import MessageInput from '@/components/chat/MessageInput';
import TypingIndicator from '@/components/chat/TypingIndicator';
import ThreadPanel from './ThreadPanel';

interface ChannelViewProps {
  channel: Channel;
}

export default function ChannelView({ channel }: ChannelViewProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const [unreadThreadIds, setUnreadThreadIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();
  // Track pending message IDs so we can replace them on confirm
  const pendingIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setTypingUsers(new Map());
    setSuggestions([]);
    setUnreadThreadIds(new Set());

    api.get(`/channels/${channel.id}/messages`).then((data: any) => {
      setMessages(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));

    api.post(`/channels/${channel.id}/read`).catch(() => {});
  }, [channel.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    socket.emit('channel:join', { channelId: channel.id });

    const onNewMessage = (msg: Message) => {
      if (msg.channelId !== channel.id) return;
      if (msg.parentId) return; // thread replies stay in ThreadPanel only
      setMessages((prev) => {
        // Replace a pending message from the same user with the same content
        if (!msg.isAI && msg.user.id === user?.id) {
          const pendingIdx = prev.findIndex((m) => m._pending && m.content === msg.content);
          if (pendingIdx !== -1) {
            pendingIds.current.delete(prev[pendingIdx].id);
            const next = [...prev];
            next[pendingIdx] = msg;
            return next;
          }
        }
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setSuggestions([]);
    };

    const onUpdated = (msg: Message) => {
      setMessages((prev) => prev.map((m) => m.id === msg.id ? msg : m));
    };

    const onDeleted = ({ id }: { id: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    };

    const onReactionsUpdated = ({ messageId, reactions }: any) => {
      setMessages((prev) =>
        prev.map((m) => m.id === messageId ? { ...m, reactions } : m),
      );
    };

    const onTyping = (data: TypingUser & { channelId: string }) => {
      if (data.channelId !== channel.id || data.userId === user?.id) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (data.typing) next.set(data.userId, data);
        else next.delete(data.userId);
        return next;
      });
    };

    const onAISuggestions = ({ channelId, suggestions: s }: any) => {
      if (channelId === channel.id) setSuggestions(s || []);
    };

    const onAIThinking = ({ channelId }: { channelId: string }) => {
      if (channelId === channel.id) setAiThinking(true);
    };

    const onAIThinkingDone = ({ channelId }: { channelId: string }) => {
      if (channelId === channel.id) setAiThinking(false);
    };

    // Replaces both: sender's optimistic (_pending) and receiver's temp (srv-*)
    const onConfirmed = ({ pendingId, message: msg }: { pendingId: string; message: Message }) => {
      if (msg.channelId !== channel.id) return;
      if (msg.parentId) {
        // Thread reply confirmed — bump parent's reply count in channel view
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.parentId
              ? { ...m, _count: { ...m._count, replies: m._count.replies + 1 } }
              : m,
          ),
        );
        // Mark the thread as having unread replies, unless it's currently open
        setThreadMessage((current) => {
          if (current?.id !== msg.parentId) {
            setUnreadThreadIds((prev) => new Set(prev).add(msg.parentId!));
          }
          return current;
        });
        return;
      }
      setMessages((prev) => {
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

    socket.on('message:new', onNewMessage);
    socket.on('message:confirmed', onConfirmed);
    socket.on('message:updated', onUpdated);
    socket.on('message:deleted', onDeleted);
    socket.on('message:reactions_updated', onReactionsUpdated);
    socket.on('typing:update', onTyping);
    socket.on('ai:suggestions', onAISuggestions);
    socket.on('ai:thinking', onAIThinking);
    socket.on('ai:thinking_done', onAIThinkingDone);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:confirmed', onConfirmed);
      socket.off('message:updated', onUpdated);
      socket.off('message:deleted', onDeleted);
      socket.off('message:reactions_updated', onReactionsUpdated);
      socket.off('typing:update', onTyping);
      socket.off('ai:suggestions', onAISuggestions);
      socket.off('ai:thinking', onAIThinking);
      socket.off('ai:thinking_done', onAIThinkingDone);
    };
  }, [channel.id, user?.id]);

  const handleSend = useCallback((content: string, attachments?: Attachment[]) => {
    if (!user) return;
    const tempId = `pending-${Date.now()}`;
    pendingIds.current.add(tempId);
    const optimistic: Message = {
      id: tempId,
      content,
      isAI: false,
      createdAt: new Date().toISOString(),
      channelId: channel.id,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      reactions: [],
      attachments: attachments ?? [],
      _count: { replies: 0 },
      _pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    socket.emit('message:send', { channelId: channel.id, content, attachments: attachments ?? [] });
  }, [channel.id, user]);

  const handleEdit = useCallback((messageId: string, content: string) => {
    socket.emit('message:edit', { messageId, content });
  }, []);

  const handleDelete = useCallback((messageId: string) => {
    // Optimistic remove
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    socket.emit('message:delete', { messageId });
  }, []);

  const handleReact = useCallback((messageId: string, emoji: string) => {
    // Optimistic reaction toggle
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const existing = m.reactions.find(
          (r) => r.emoji === emoji && r.user.id === user?.id,
        );
        const reactions = existing
          ? m.reactions.filter((r) => !(r.emoji === emoji && r.user.id === user?.id))
          : [...m.reactions, { id: `opt-${Date.now()}`, emoji, user: { id: user!.id, username: user!.username } }];
        return { ...m, reactions };
      }),
    );
    socket.emit('message:react', { messageId, emoji, channelId: channel.id });
  }, [channel.id, user]);

  const handleTypingStart = useCallback(() => {
    socket.emit('typing:start', { channelId: channel.id });
  }, [channel.id]);

  const handleTypingStop = useCallback(() => {
    socket.emit('typing:stop', { channelId: channel.id });
  }, [channel.id]);

  const handleRequestSuggestions = useCallback(() => {
    socket.emit('ai:suggest_replies', { channelId: channel.id });
  }, [channel.id]);

  const typingNames = Array.from(typingUsers.values()).map((u) => u.username);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Channel header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
          <Hash className="w-5 h-5 text-text-muted flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm">{channel.name}</h1>
            {channel.description && (
              <p className="text-xs text-text-muted truncate">{channel.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <Users className="w-3.5 h-3.5" />
            {channel._count?.members ?? '—'}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-text-muted">
              <Hash className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs mt-1">Be the first to say something in #{channel.name}</p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onReact={handleReact}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onOpenThread={(m) => {
                  setThreadMessage(m);
                  setUnreadThreadIds((prev) => {
                    const next = new Set(prev);
                    next.delete(m.id);
                    return next;
                  });
                }}
                hasUnreadReplies={unreadThreadIds.has(msg.id)}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <TypingIndicator usernames={typingNames} />

        <MessageInput
          channelName={channel.name}
          onSend={(content, attachments) => handleSend(content, attachments)}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          onRequestSuggestions={handleRequestSuggestions}
          suggestions={suggestions}
          aiThinking={aiThinking}
        />
      </div>

      {/* Thread panel */}
      {threadMessage && (
        <ThreadPanel
          parentMessage={threadMessage}
          channelId={channel.id}
          onClose={() => setThreadMessage(null)}
        />
      )}
    </div>
  );
}
