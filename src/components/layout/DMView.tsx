import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Send, Loader2, SmilePlus, Pencil, Trash2, Check, X, Reply, CornerUpLeft, Menu } from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { User, DirectMessage, DMReplyTo, Reaction } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { formatMessageTime, cn, groupReactions } from '@/lib/utils';
import Avatar from '@/components/shared/Avatar';

interface DMViewProps {
  partner: User;
  onOpenSidebar?: () => void;
}

interface DMItemProps {
  msg: DirectMessage;
  isOwn: boolean;
  isHighlighted: boolean;
  isLastRead: boolean;
  isNew: boolean;
  currentUserId: string;
  partnerId: string;
  partner: { displayName: string; avatarUrl?: string };
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onReact: (id: string, emoji: string) => void;
  onReply: (msg: DirectMessage) => void;
  onScrollTo: (msgId: string) => void;
}

function DMItem({ msg, isOwn, isHighlighted, isLastRead, isNew, currentUserId, partnerId, partner, onEdit, onDelete, onReact, onReply, onScrollTo }: DMItemProps) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const editRef = useRef<HTMLTextAreaElement>(null);
  const pickerBtnRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const isPending = msg.id.startsWith('pending-');

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        !pickerBtnRef.current?.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    };
    if (showPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  const openPicker = () => {
    if (showPicker) { setShowPicker(false); return; }
    if (!pickerBtnRef.current) return;
    const rect = pickerBtnRef.current.getBoundingClientRect();
    const w = 352, h = 440;
    let left = rect.left;
    let top = rect.top - h - 6;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    if (left < 8) left = 8;
    if (top < 8) top = rect.bottom + 6;
    setPickerPos({ top, left });
    setShowPicker(true);
  };

  const saveEdit = () => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== msg.content) onEdit(msg.id, trimmed);
    setEditing(false);
  };

  const grouped = groupReactions(msg.reactions ?? []);

  return (
    <div
      id={`dm-msg-${msg.id}`}
      className={cn(
        'group relative px-4 py-1 transition-colors duration-300',
        isPending && 'opacity-60',
        isHighlighted ? 'bg-indigo-500/20' : 'hover:bg-white/[0.02]',
        isNew && 'animate-message-in',
      )}
      onMouseEnter={() => { if (!showPicker) setHovered(true); }}
      onMouseLeave={() => { if (!showPicker) setHovered(false); }}
    >
      <div className={cn('flex gap-2.5', isOwn && 'flex-row-reverse')}>
        {!isOwn && (
          <Avatar name={msg.sender.displayName} avatarUrl={msg.sender.avatarUrl} size="sm" className="flex-shrink-0 mt-0.5" />
        )}

        <div className={cn('max-w-[72%]', isOwn && 'items-end flex flex-col')}>
          <div className={cn('flex items-baseline gap-2 mb-1', isOwn && 'flex-row-reverse')}>
            <span className="text-xs font-semibold text-text-primary">{msg.sender.displayName}</span>
            <span className="text-[10px] text-text-muted">{formatMessageTime(msg.createdAt)}</span>
            {msg.editedAt && <span className="text-[10px] text-text-muted italic">(edited)</span>}
          </div>

          {editing ? (
            <div className="space-y-2 w-full">
              <textarea
                ref={editRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                  if (e.key === 'Escape') setEditing(false);
                }}
                className="w-full bg-base-700 border border-indigo-500/50 rounded-lg px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <button onClick={saveEdit} className="nexus-btn-primary py-1 px-3 text-xs gap-1.5">
                  <Check className="w-3 h-3" /> Save
                </button>
                <button onClick={() => setEditing(false)} className="nexus-btn-ghost py-1 px-3 text-xs gap-1.5">
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className={cn(
              'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
              isOwn ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-base-800 text-text-primary rounded-tl-sm',
            )}>
              {msg.replyTo && (
                <button
                  onClick={() => onScrollTo(msg.replyTo!.id)}
                  className={cn(
                    'flex items-stretch gap-0 mb-2 rounded-lg overflow-hidden text-xs w-full text-left',
                    'hover:brightness-110 transition-all cursor-pointer',
                    isOwn ? 'bg-indigo-700/60' : 'bg-base-700',
                  )}
                >
                  <div className={cn('w-1 flex-shrink-0', isOwn ? 'bg-indigo-300' : 'bg-indigo-500')} />
                  <div className="px-2.5 py-1.5 min-w-0">
                    <p className={cn('font-semibold mb-0.5 truncate', isOwn ? 'text-indigo-200' : 'text-indigo-400')}>
                      {msg.replyTo.sender.displayName}
                    </p>
                    <p className={cn('truncate', isOwn ? 'text-indigo-100/80' : 'text-text-muted')}>
                      {msg.replyTo.content}
                    </p>
                  </div>
                </button>
              )}
              {msg.content}
            </div>
          )}

          {grouped.length > 0 && (
            <div className={cn('flex flex-wrap gap-1 mt-1.5', isOwn && 'justify-end')}>
              {grouped.map(({ emoji, users, count }) => (
                <button
                  key={emoji}
                  onClick={() => onReact(msg.id, emoji)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-colors',
                    users.includes(currentUserId)
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-white/5 border-border text-text-secondary hover:border-white/20',
                  )}
                >
                  {emoji} <span>{count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Read receipt — only on the last own message the partner has read */}
          {isOwn && !isPending && isLastRead && (
            <div className={cn('flex mt-1', isOwn && 'justify-end')}>
              <div title={`Read by ${partner.displayName}`} className="w-3.5 h-3.5 rounded-full overflow-hidden ring-1 ring-base-900 cursor-default">
                {partner.avatarUrl ? (
                  <img src={partner.avatarUrl} alt={partner.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-indigo-500/60 flex items-center justify-center text-[7px] font-bold text-white">
                    {partner.displayName[0].toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Hover toolbar */}
        {(hovered || showPicker) && !editing && !isPending && (
          <div className={cn(
            'absolute top-0 flex items-center gap-0.5 bg-base-800 border border-border rounded-lg p-0.5 shadow-lg z-10',
            isOwn ? 'left-4' : 'right-4',
          )}>
            <button
              ref={pickerBtnRef}
              onClick={openPicker}
              title="React"
              className="p-1.5 rounded hover:bg-white/8 text-text-muted hover:text-text-primary transition-colors"
            >
              <SmilePlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => onReply(msg)}
              title="Reply"
              className="p-1.5 rounded hover:bg-white/8 text-text-muted hover:text-text-primary transition-colors"
            >
              <Reply className="w-4 h-4" />
            </button>
            {isOwn && (
              <>
                <button
                  onClick={() => { setEditing(true); setEditContent(msg.content); }}
                  title="Edit"
                  className="p-1.5 rounded hover:bg-white/8 text-text-muted hover:text-text-primary transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(msg.id)}
                  title="Delete"
                  className="p-1.5 rounded hover:bg-red-500/15 text-text-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {showPicker && createPortal(
        <div
          ref={pickerRef}
          style={{ position: 'fixed', top: pickerPos.top, left: pickerPos.left, zIndex: 9999 }}
          className="shadow-2xl"
        >
          <Picker
            data={data}
            onEmojiSelect={(emoji: any) => { onReact(msg.id, emoji.native); setShowPicker(false); }}
            theme="dark"
            previewPosition="none"
            skinTonePosition="none"
          />
        </div>,
        document.body,
      )}
    </div>
  );
}

export default function DMView({ partner, onOpenSidebar }: DMViewProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? '';
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<DirectMessage | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const initialCountRef = useRef(0);
  const [partnerStatus, setPartnerStatus] = useState(partner.status);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToMessage = useCallback((msgId: string) => {
    const el = document.getElementById(`dm-msg-${msgId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMsgId(msgId);
    setTimeout(() => setHighlightedMsgId(null), 1500);
  }, []);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  useEffect(() => {
    setPartnerStatus(partner.status);
    setLoading(true);
    setMessages([]);
    api.get(`/workspaces/${wsId}/dms/${partner.id}`).then((data: any) => {
      const list = (data || []).map((m: any) => ({ ...m, reactions: m.reactions ?? [] }));
      setMessages(list);
      initialCountRef.current = list.length;
      setLoading(false);
    }).catch(() => setLoading(false));

    // Mark partner's messages as read; notifies them in real-time
    socket.emit('dm:mark_read', { partnerId: partner.id });
  }, [partner.id]);

  // Re-mark as read when new messages arrive while the conversation is open
  const lastMsgId = messages[messages.length - 1]?.id;
  useEffect(() => {
    if (!lastMsgId) return;
    const t = setTimeout(() => {
      socket.emit('dm:mark_read', { partnerId: partner.id });
    }, 600);
    return () => clearTimeout(t);
  }, [lastMsgId, partner.id]);

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
    const onNew = (dm: DirectMessage) => {
      const isRelevant =
        (dm.senderId === user?.id && dm.receiverId === partner.id) ||
        (dm.senderId === partner.id && dm.receiverId === user?.id);
      if (!isRelevant) return;
      setMessages((prev) => {
        const pendingIdx = prev.findIndex(
          (m) => m.id.startsWith('pending-') && m.content === dm.content && m.senderId === user?.id,
        );
        if (pendingIdx !== -1) {
          const next = [...prev];
          next[pendingIdx] = { ...dm, reactions: dm.reactions ?? [] };
          return next;
        }
        if (prev.some((m) => m.id === dm.id)) return prev;
        return [...prev, { ...dm, reactions: dm.reactions ?? [] }];
      });
    };

    const onUpdated = (dm: DirectMessage) => {
      setMessages((prev) => prev.map((m) => m.id === dm.id ? { ...dm, reactions: dm.reactions ?? [] } : m));
    };

    const onDeleted = ({ id }: { id: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    };

    const onReactions = ({ messageId, reactions }: { messageId: string; reactions: Reaction[] }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    };

    const onRead = ({ senderId }: { senderId: string }) => {
      // When the partner reads our messages, mark them as read in local state
      setMessages((prev) =>
        prev.map((m) => m.senderId === senderId ? { ...m, isRead: true } : m),
      );
    };

    socket.on('dm:new', onNew);
    socket.on('dm:updated', onUpdated);
    socket.on('dm:deleted', onDeleted);
    socket.on('dm:reactions_updated', onReactions);
    socket.on('dm:read', onRead);
    return () => {
      socket.off('dm:new', onNew);
      socket.off('dm:updated', onUpdated);
      socket.off('dm:deleted', onDeleted);
      socket.off('dm:reactions_updated', onReactions);
      socket.off('dm:read', onRead);
    };
  }, [partner.id, user?.id]);

  const handleReply = useCallback((msg: DirectMessage) => {
    setReplyingTo(msg);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || !user) return;

    const optimistic: DirectMessage = {
      id: `pending-${Date.now()}`,
      content: trimmed,
      createdAt: new Date().toISOString(),
      isRead: false,
      senderId: user.id,
      receiverId: partner.id,
      replyToId: replyingTo?.id,
      replyTo: replyingTo ? { id: replyingTo.id, content: replyingTo.content, sender: { id: replyingTo.sender.id, displayName: replyingTo.sender.displayName } } : undefined,
      sender: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
      reactions: [],
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    setReplyingTo(null);
    socket.emit('dm:send', { receiverId: partner.id, content: trimmed, replyToId: replyingTo?.id });
  }, [input, user, partner.id, replyingTo]);

  const handleEdit = useCallback((messageId: string, content: string) => {
    socket.emit('dm:edit', { messageId, content, partnerId: partner.id });
  }, [partner.id]);

  const handleDelete = useCallback((messageId: string) => {
    socket.emit('dm:delete', { messageId, partnerId: partner.id });
  }, [partner.id]);

  const handleReact = useCallback((messageId: string, emoji: string) => {
    socket.emit('dm:react', { messageId, emoji, partnerId: partner.id });
  }, [partner.id]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-1 -ml-1 rounded text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Avatar name={partner.displayName} avatarUrl={partner.avatarUrl} status={partnerStatus} size="sm" />
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm">{partner.displayName}</h1>
          <p className="text-xs text-text-muted">@{partner.username} · {partnerStatus === 'ONLINE' ? 'Online' : 'Offline'}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2 py-16">
            <Avatar name={partner.displayName} avatarUrl={partner.avatarUrl} size="lg" />
            <p className="text-sm font-medium mt-1">{partner.displayName}</p>
            <p className="text-xs">This is the beginning of your conversation.</p>
          </div>
        ) : (() => {
            // Find the last own read message, then hide avatar if partner replied after it
            const lastReadMsg = messages
              .filter((m) => m.senderId === user?.id && !m.id.startsWith('pending-') && m.isRead)
              .at(-1);
            const lastOwnIndex = lastReadMsg
              ? messages.findIndex((m) => m.id === lastReadMsg.id)
              : -1;
            const partnerRepliedAfter =
              lastOwnIndex >= 0 &&
              messages.slice(lastOwnIndex + 1).some((m) => m.senderId !== user?.id);
            const lastReadId = lastReadMsg && !partnerRepliedAfter ? lastReadMsg.id : null;

            return messages.map((msg, idx) => (
            <DMItem
              key={msg.id}
              msg={msg}
              isOwn={msg.senderId === user?.id}
              isHighlighted={highlightedMsgId === msg.id}
              isLastRead={msg.id === lastReadId}
              isNew={idx >= initialCountRef.current}
              currentUserId={user?.id ?? ''}
              partnerId={partner.id}
              partner={partner}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReact={handleReact}
              onReply={handleReply}
              onScrollTo={scrollToMessage}
            />
            ));
          })()}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        {replyingTo && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-base-700 border border-indigo-500/30 rounded-lg text-xs">
            <CornerUpLeft className="w-3 h-3 text-indigo-400 flex-shrink-0" />
            <span className="text-indigo-400 font-medium">{replyingTo.sender.displayName}</span>
            <span className="text-text-muted truncate flex-1">{replyingTo.content}</span>
            <button onClick={() => setReplyingTo(null)} className="text-text-muted hover:text-text-primary flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 bg-base-700 border border-border rounded-xl px-3 py-2 focus-within:border-indigo-500/50 transition-colors">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setReplyingTo(null);
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder={replyingTo ? `Reply to ${replyingTo.sender.displayName}…` : `Message ${partner.displayName}`}
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
