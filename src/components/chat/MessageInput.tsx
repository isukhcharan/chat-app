import { useState, useRef, useCallback, KeyboardEvent, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, Sparkles, Loader2, Smile, Paperclip, X, FileText, ImageIcon } from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Attachment } from '@/types';

interface PendingFile {
  id: string;
  file: File;
  preview?: string;
  url?: string;
  uploading: boolean;
  error?: boolean;
}

interface MessageInputProps {
  channelName: string;
  onSend: (content: string, attachments?: Attachment[]) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  onRequestSuggestions: () => void;
  suggestions: string[];
  aiThinking: boolean;
  disabled?: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node) &&
        !emojiButtonRef.current?.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiPicker]);

  const openEmojiPicker = useCallback(() => {
    if (showEmojiPicker) { setShowEmojiPicker(false); return; }
    if (!emojiButtonRef.current) return;
    const rect = emojiButtonRef.current.getBoundingClientRect();
    const pickerW = 352;
    const pickerH = 440;
    let left = rect.left;
    let top = rect.top - pickerH - 6;
    if (left + pickerW > window.innerWidth - 8) left = window.innerWidth - pickerW - 8;
    if (left < 8) left = 8;
    if (top < 8) top = rect.bottom + 6;
    setPickerPos({ top, left });
    setShowEmojiPicker(true);
  }, [showEmojiPicker]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      onTypingStart();
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(onTypingStop, 2000);
    },
    [onTypingStart, onTypingStop],
  );

  const insertEmoji = useCallback((emoji: any) => {
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const next = value.slice(0, cursor) + emoji.native + value.slice(cursor);
    setValue(next);
    setShowEmojiPicker(false);
    setTimeout(() => {
      textareaRef.current?.focus();
      const pos = cursor + (emoji.native as string).length;
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  }, [value]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newFiles: PendingFile[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      uploading: true,
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';

    for (const pf of newFiles) {
      const formData = new FormData();
      formData.append('file', pf.file);
      try {
        const result: any = await api.post('/attachments/upload', formData);
        setPendingFiles((prev) =>
          prev.map((f) => (f.id === pf.id ? { ...f, url: result.url, uploading: false } : f)),
        );
      } catch {
        setPendingFiles((prev) =>
          prev.map((f) => (f.id === pf.id ? { ...f, uploading: false, error: true } : f)),
        );
      }
    }
  }, []);

  const removeFile = useCallback((id: string) => {
    setPendingFiles((prev) => {
      const f = prev.find((p) => p.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    const uploading = pendingFiles.some((f) => f.uploading);
    const readyAttachments: Attachment[] = pendingFiles
      .filter((f) => f.url && !f.error)
      .map((f) => ({ url: f.url!, name: f.file.name, size: f.file.size, type: f.file.type }));

    if ((!trimmed && readyAttachments.length === 0) || uploading) return;

    onSend(trimmed, readyAttachments.length > 0 ? readyAttachments : undefined);
    setValue('');
    setPendingFiles([]);
    clearTimeout(typingTimeoutRef.current);
    onTypingStop();
  }, [value, pendingFiles, onSend, onTypingStop]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isAICommand = value.startsWith('/ai ');
  const isUploading = pendingFiles.some((f) => f.uploading);
  const canSend = (value.trim() || pendingFiles.some((f) => f.url)) && !isUploading;

  return (
    <div className="px-4 py-3 border-t border-border relative">
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => setValue(s)}
              className="px-2.5 py-1 bg-indigo-600/10 border border-indigo-500/20 rounded-full text-xs text-indigo-300 hover:bg-indigo-600/20 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {isAICommand && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-cyan-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Asking Nexus AI…</span>
        </div>
      )}

      {aiThinking && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-cyan-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Nexus AI is thinking…</span>
        </div>
      )}

      {/* Attachment previews */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pendingFiles.map((pf) => (
            <div
              key={pf.id}
              className="relative flex items-center gap-2 bg-base-700 border border-border rounded-lg px-2.5 py-2 text-xs max-w-[180px]"
            >
              {pf.preview ? (
                <img src={pf.preview} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
              ) : (
                <FileText className="w-5 h-5 text-text-muted flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-text-primary truncate font-medium">{pf.file.name}</p>
                <p className="text-text-muted">{formatBytes(pf.file.size)}</p>
              </div>
              {pf.uploading && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 flex-shrink-0" />}
              {pf.error && <span className="text-red-400 text-[10px] flex-shrink-0">failed</span>}
              <button
                onClick={() => removeFile(pf.id)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-base-600 border border-border rounded-full flex items-center justify-center hover:bg-red-500/20 transition-colors"
              >
                <X className="w-2.5 h-2.5 text-text-muted" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={cn(
        'flex items-center gap-2 bg-base-700 border rounded-lg px-3 py-2 transition-colors',
        isAICommand ? 'border-cyan-500/40' : 'border-border focus-within:border-indigo-500/50',
      )}>
        {/* Left actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={openEmojiPicker}
            className={cn(
              'p-1.5 rounded transition-colors',
              showEmojiPicker
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-text-muted hover:text-text-primary hover:bg-white/5',
            )}
            title="Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>
          {showEmojiPicker && createPortal(
            <div
              ref={emojiPickerRef}
              style={{ position: 'fixed', top: pickerPos.top, left: pickerPos.left, zIndex: 9999 }}
              className="shadow-2xl animate-scale-in"
            >
              <Picker
                data={data}
                onEmojiSelect={insertEmoji}
                theme="dark"
                previewPosition="none"
                skinTonePosition="none"
              />
            </div>,
            document.body,
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          />
        </div>

        <textarea
          ref={textareaRef}
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
            disabled={!canSend || disabled}
            className={cn(
              'p-1.5 rounded transition-all',
              canSend
                ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 active:scale-90'
                : 'text-text-muted cursor-not-allowed',
            )}
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
