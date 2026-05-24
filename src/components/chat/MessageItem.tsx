import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, MessageSquare, Bot, Check, X } from 'lucide-react';
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
}

export default function MessageItem({
  message,
  onReact,
  onEdit,
  onDelete,
  onOpenThread,
  isThreadReply = false,
}: MessageItemProps) {
  const { user } = useAuth();
  const isOwn = message.user.id === user?.id;
  const isAI = message.isAI;
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
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
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setEditing(false);
  };

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-1 hover:bg-white/[0.02] rounded transition-colors relative',
        isAI && 'bg-cyan-500/5 hover:bg-cyan-500/[0.07] border-l-2 border-cyan-500/30 pl-3',
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); }}
    >
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
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className={cn('text-sm font-semibold', isAI ? 'text-cyan-400' : 'text-text-primary')}>
            {isAI ? 'Nexus AI' : message.user.displayName}
          </span>
          <span className="text-[10px] text-text-muted">{formatMessageTime(message.createdAt)}</span>
          {message.editedAt && <span className="text-[10px] text-text-muted italic">(edited)</span>}
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              ref={editRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); }
                if (e.key === 'Escape') setEditing(false);
              }}
              className="w-full bg-base-700 border border-indigo-500/50 rounded px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={2}
            />
            <div className="flex gap-1.5">
              <button onClick={handleEdit} className="nexus-btn-primary py-1 px-2.5 text-xs">
                <Check className="w-3 h-3" /> Save
              </button>
              <button onClick={() => setEditing(false)} className="nexus-btn-ghost py-1 px-2.5 text-xs">
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className={cn('text-sm leading-relaxed whitespace-pre-wrap break-words', isAI ? 'text-cyan-50/90' : 'text-text-primary/90')}>
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
                {emoji} {count}
              </button>
            ))}
          </div>
        )}

        {/* Thread count */}
        {!isThreadReply && message._count.replies > 0 && (
          <button
            onClick={() => onOpenThread(message)}
            className="mt-1.5 flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {message._count.replies} {message._count.replies === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {/* Hover actions */}
      {showActions && !editing && (
        <div className="absolute right-4 top-1 flex items-center gap-0.5 bg-base-800 border border-border rounded-lg p-0.5 shadow-lg animate-fade-in">
          {/* Emoji picker trigger */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker((s) => !s)}
              className="p-1.5 rounded hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors text-sm"
            >
              😀
            </button>
            {showEmojiPicker && (
              <div className="absolute right-0 top-full mt-1 bg-base-800 border border-border rounded-lg p-1.5 flex gap-1 shadow-xl z-10">
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

          {!isThreadReply && (
            <button
              onClick={() => onOpenThread(message)}
              className="p-1.5 rounded hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
              title="Open thread"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          )}

          {isOwn && !isAI && (
            <>
              <button
                onClick={() => { setEditing(true); setEditContent(message.content); }}
                className="p-1.5 rounded hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(message.id)}
                className="p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
