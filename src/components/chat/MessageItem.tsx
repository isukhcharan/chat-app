import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, MessageSquare, Bot, Check, X, SmilePlus } from 'lucide-react';
import { cn, formatMessageTime, groupReactions } from '@/lib/utils';
import { Message } from '@/types';
import Avatar from '@/components/shared/Avatar';
import { useAuth } from '@/contexts/AuthContext';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '🔥', '✅', '👀'];

interface MessageItemProps {
  message: Message;
  onReact: (messageId: string, emoji: string) => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onOpenThread: (message: Message) => void;
  isThreadReply?: boolean;
  hasUnreadReplies?: boolean;
}

export default function MessageItem({
  message,
  onReact,
  onEdit,
  onDelete,
  onOpenThread,
  isThreadReply = false,
  hasUnreadReplies = false,
}: MessageItemProps) {
  const { user } = useAuth();
  const isOwn = message.user.id === user?.id;
  const isAI = message.isAI;
  const isPending = message._pending;
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [hovered, setHovered] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length);
    }
  }, [editing]);

  const grouped = groupReactions(message.reactions);

  const handleEdit = () => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== message.content) onEdit(message.id, trimmed);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        'group relative px-4 py-1 transition-colors',
        isAI
          ? 'bg-cyan-500/5 hover:bg-cyan-500/[0.08] border-l-2 border-cyan-500/30 pl-3'
          : 'hover:bg-white/[0.025]',
        isPending && 'opacity-70',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowEmojiPicker(false); }}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 pt-0.5">
          {isAI ? (
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-cyan-400" />
            </div>
          ) : (
            <Avatar name={message.user.displayName} avatarUrl={message.user.avatarUrl} size="md" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className={cn('text-sm font-semibold', isAI ? 'text-cyan-400' : 'text-text-primary')}>
              {isAI ? 'Nexus AI' : message.user.displayName}
            </span>
            <span className="text-[10px] text-text-muted">{formatMessageTime(message.createdAt)}</span>
            {message.editedAt && <span className="text-[10px] text-text-muted italic">(edited)</span>}
            {isPending && <span className="text-[10px] text-text-muted italic">sending…</span>}
          </div>

          {/* Content / Edit */}
          {editing ? (
            <div className="space-y-2 mt-1">
              <textarea
                ref={editRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); }
                  if (e.key === 'Escape') setEditing(false);
                }}
                className="w-full bg-base-700 border border-indigo-500/50 rounded-lg px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <button onClick={handleEdit} className="nexus-btn-primary py-1 px-3 text-xs gap-1.5">
                  <Check className="w-3 h-3" /> Save
                </button>
                <button onClick={() => setEditing(false)} className="nexus-btn-ghost py-1 px-3 text-xs gap-1.5">
                  <X className="w-3 h-3" /> Cancel
                </button>
                <span className="text-[10px] text-text-muted">esc to cancel · enter to save</span>
              </div>
            </div>
          ) : (
            <p className={cn(
              'text-sm leading-relaxed whitespace-pre-wrap break-words',
              isAI ? 'text-cyan-50/90' : 'text-text-primary/90',
            )}>
              {message.content}
            </p>
          )}

          {/* Reactions */}
          {grouped.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {grouped.map(({ emoji, users, count }) => (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-colors',
                    users.includes(user?.id || '')
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-white/5 border-border text-text-secondary hover:border-white/20',
                  )}
                >
                  {emoji} <span>{count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Thread reply count — always visible, clickable */}
          {!isThreadReply && message._count.replies > 0 && (
            <button
              onClick={() => onOpenThread(message)}
              className={cn(
                'mt-1.5 flex items-center gap-1.5 text-xs font-medium transition-colors',
                hasUnreadReplies
                  ? 'text-indigo-300 hover:text-indigo-200'
                  : 'text-indigo-400/70 hover:text-indigo-300',
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {message._count.replies} {message._count.replies === 1 ? 'reply' : 'replies'}
              {hasUnreadReplies && (
                <span className="bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  NEW
                </span>
              )}
            </button>
          )}
        </div>

        {/* Hover action toolbar */}
        {hovered && !editing && !isPending && (
          <div className="absolute right-4 top-0.5 flex items-center gap-0.5 bg-base-800 border border-border rounded-lg p-0.5 shadow-lg animate-fade-in z-10">
            {/* Emoji */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker((s) => !s)}
                title="React"
                className="p-1.5 rounded hover:bg-white/8 text-text-muted hover:text-text-primary transition-colors"
              >
                <SmilePlus className="w-4 h-4" />
              </button>
              {showEmojiPicker && (
                <div className="absolute right-0 top-full mt-1 bg-base-800 border border-border rounded-lg p-1.5 flex gap-1 shadow-xl z-20">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => { onReact(message.id, e); setShowEmojiPicker(false); }}
                      className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-sm transition-colors"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reply in thread */}
            {!isThreadReply && (
              <button
                onClick={() => onOpenThread(message)}
                title="Reply in thread"
                className="p-1.5 rounded hover:bg-white/8 text-text-muted hover:text-text-primary transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}

            {/* Edit — own messages only */}
            {isOwn && !isAI && (
              <button
                onClick={() => { setEditing(true); setEditContent(message.content); }}
                title="Edit message"
                className="p-1.5 rounded hover:bg-white/8 text-text-muted hover:text-text-primary transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete — own messages only */}
            {isOwn && !isAI && (
              <button
                onClick={() => onDelete(message.id)}
                title="Delete message"
                className="p-1.5 rounded hover:bg-red-500/15 text-text-muted hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
