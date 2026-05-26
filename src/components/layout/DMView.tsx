import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { User, DirectMessage } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { formatMessageTime, cn } from '@/lib/utils';
import Avatar from '@/components/shared/Avatar';

interface DMViewProps {
  partner: User;
}

export default function DMView({ partner }: DMViewProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [partnerStatus, setPartnerStatus] = useState(partner.status);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  useEffect(() => {
    setPartnerStatus(partner.status);
    setLoading(true);
    setMessages([]);
    api.get(`/dms/${partner.id}`).then((data: any) => {
      setMessages(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [partner.id]);

  useEffect(() => {
    const onStatus = ({ userId, status }: { userId: string; status: User['status'] }) => {
      if (userId === partner.id) setPartnerStatus(status);
    };
    socket.on('user:status', onStatus);
    return () => { socket.off('user:status', onStatus); };
  }, [partner.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    const onDmNew = (dm: DirectMessage) => {
      const isRelevant =
        (dm.senderId === user?.id && dm.receiverId === partner.id) ||
        (dm.senderId === partner.id && dm.receiverId === user?.id);
      if (!isRelevant) return;
      setMessages((prev) => {
        // Replace optimistic
        const pendingIdx = prev.findIndex(
          (m) => m.id.startsWith('pending-') && m.content === dm.content && m.senderId === user?.id,
        );
        if (pendingIdx !== -1) {
          const next = [...prev];
          next[pendingIdx] = dm;
          return next;
        }
        if (prev.some((m) => m.id === dm.id)) return prev;
        return [...prev, dm];
      });
    };

    socket.on('dm:new', onDmNew);
    return () => { socket.off('dm:new', onDmNew); };
  }, [partner.id, user?.id]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || !user) return;

    // Optimistic
    const optimistic: DirectMessage = {
      id: `pending-${Date.now()}`,
      content: trimmed,
      createdAt: new Date().toISOString(),
      isRead: false,
      senderId: user.id,
      receiverId: partner.id,
      sender: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    socket.emit('dm:send', { receiverId: partner.id, content: trimmed });
  }, [input, user, partner.id]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
        <Avatar name={partner.displayName} avatarUrl={partner.avatarUrl} status={partnerStatus} size="sm" />
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm">{partner.displayName}</h1>
          <p className="text-xs text-text-muted">@{partner.username} · {partnerStatus === 'ONLINE' ? 'Online' : 'Offline'}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 px-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
            <Avatar name={partner.displayName} avatarUrl={partner.avatarUrl} size="lg" />
            <p className="text-sm font-medium mt-1">{partner.displayName}</p>
            <p className="text-xs">This is the beginning of your conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={cn('flex gap-2.5', isOwn && 'flex-row-reverse')}>
                {!isOwn && (
                  <Avatar name={msg.sender.displayName} avatarUrl={msg.sender.avatarUrl} size="sm" className="flex-shrink-0 mt-0.5" />
                )}
                <div className={cn('max-w-[72%]', isOwn && 'items-end flex flex-col')}>
                  <div
                    className={cn(
                      'px-3.5 py-2 rounded-2xl text-sm leading-relaxed',
                      isOwn
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-base-700 text-text-primary rounded-tl-sm',
                      msg.id.startsWith('pending-') && 'opacity-60',
                    )}
                  >
                    {msg.content}
                  </div>
                  <p className="text-[10px] text-text-muted mt-1 px-1">{formatMessageTime(msg.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 bg-base-700 border border-border rounded-xl px-3 py-2 focus-within:border-indigo-500/50 transition-colors">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder={`Message ${partner.displayName}`}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="text-indigo-400 hover:text-indigo-300 disabled:text-text-muted disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
