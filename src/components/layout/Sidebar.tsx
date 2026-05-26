import { useState, useEffect, useCallback } from 'react';
import { Hash, Plus, LogOut, Zap, ChevronDown, Lock, Loader2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket } from '@/lib/socket';
import Avatar from '@/components/shared/Avatar';
import api from '@/lib/api';
import { Channel, User, UserStatus } from '@/types';

interface SidebarProps {
  channels: Channel[];
  activeChannelId: string | null;
  activeDMUserId: string | null;
  onSelectChannel: (channel: Channel) => void;
  onSelectDM: (user: User) => void;
  onChannelsUpdate: (channels: Channel[]) => void;
}

export default function Sidebar({
  channels,
  activeChannelId,
  activeDMUserId,
  onSelectChannel,
  onSelectDM,
  onChannelsUpdate,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const socket = getSocket();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [creating, setCreating] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, UserStatus>>({});
  const [showMembers, setShowMembers] = useState(true);

  useEffect(() => {
    api.get('/users').then((data: any) => {
      setMembers(data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const onStatus = ({ userId, status }: { userId: string; status: UserStatus }) => {
      setOnlineStatus((prev) => ({ ...prev, [userId]: status }));
    };

    const onConnected = (newUser: { id: string; username: string; displayName: string; status: UserStatus }) => {
      setOnlineStatus((prev) => ({ ...prev, [newUser.id]: 'ONLINE' }));
      // Add to members list if not already there
      setMembers((prev) => {
        if (prev.some((m) => m.id === newUser.id)) return prev;
        return [...prev, { ...newUser, status: 'ONLINE' }];
      });
    };

    socket.on('user:status', onStatus);
    socket.on('user:connected', onConnected);
    return () => {
      socket.off('user:status', onStatus);
      socket.off('user:connected', onConnected);
    };
  }, [socket]);

  const handleCreateChannel = useCallback(async () => {
    if (!newChannelName.trim()) return;
    setCreating(true);
    try {
      const channel: any = await api.post('/channels', { name: newChannelName.trim() });
      onChannelsUpdate([...channels, channel]);
      onSelectChannel(channel);
      setNewChannelName('');
      setShowCreateModal(false);
    } catch {}
    setCreating(false);
  }, [newChannelName, channels, onChannelsUpdate, onSelectChannel]);

  const getStatus = (m: User): UserStatus => onlineStatus[m.id] ?? m.status;

  const otherMembers = members.filter((m) => m.id !== user?.id);
  const onlineMembers = otherMembers.filter((m) => getStatus(m) === 'ONLINE');
  const offlineMembers = otherMembers.filter((m) => getStatus(m) !== 'ONLINE');

  return (
    <aside className="w-60 flex-shrink-0 bg-base-900 border-r border-border flex flex-col h-full">
      {/* Workspace header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" fill="white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Nexus</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {/* Channels section */}
        <div className="px-3 py-1 mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Channels</span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => onSelectChannel(ch)}
                className={cn('channel-item w-full', activeChannelId === ch.id && !activeDMUserId && 'active')}
              >
                {ch.type === 'PRIVATE' ? (
                  <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-3 border-t border-border mb-2" />

        {/* Direct Messages section */}
        <div className="px-3 py-1">
          <button
            onClick={() => setShowMembers((s) => !s)}
            className="flex items-center justify-between w-full mb-1"
          >
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Direct Messages</span>
            <ChevronDown className={cn('w-3 h-3 text-text-muted transition-transform', !showMembers && '-rotate-90')} />
          </button>

          {showMembers && (
            <div className="space-y-0.5">
              {onlineMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onSelectDM(m)}
                  className={cn(
                    'w-full flex items-center gap-2 px-1.5 py-1.5 rounded transition-colors',
                    activeDMUserId === m.id
                      ? 'bg-indigo-600/20 text-indigo-300'
                      : 'hover:bg-white/5 text-text-secondary hover:text-text-primary',
                  )}
                >
                  <Avatar name={m.displayName} avatarUrl={m.avatarUrl} status="ONLINE" size="xs" />
                  <span className="text-xs truncate">{m.displayName}</span>
                  <MessageCircle className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 flex-shrink-0" />
                </button>
              ))}
              {offlineMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onSelectDM(m)}
                  className={cn(
                    'w-full flex items-center gap-2 px-1.5 py-1.5 rounded transition-colors',
                    activeDMUserId === m.id
                      ? 'bg-indigo-600/20 text-indigo-300'
                      : 'hover:bg-white/5 text-text-muted hover:text-text-secondary',
                  )}
                >
                  <Avatar name={m.displayName} avatarUrl={m.avatarUrl} status="OFFLINE" size="xs" />
                  <span className="text-xs truncate">{m.displayName}</span>
                </button>
              ))}
              {otherMembers.length === 0 && (
                <p className="text-xs text-text-muted px-1.5 py-1">No other members yet</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Current user footer */}
      <div className="px-3 py-2.5 border-t border-border flex items-center gap-2">
        <Avatar name={user?.displayName || ''} avatarUrl={user?.avatarUrl} status="ONLINE" size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-primary truncate">{user?.displayName}</p>
          <p className="text-[10px] text-text-muted truncate">@{user?.username}</p>
        </div>
        <button
          onClick={logout}
          className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Create channel modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-base-800 border border-border rounded-xl p-5 w-full max-w-xs animate-slide-up">
            <h2 className="text-sm font-semibold mb-4">Create a channel</h2>
            <div className="relative mb-4">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                autoFocus
                className="nexus-input pl-8"
                placeholder="channel-name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreateModal(false)} className="nexus-btn-ghost flex-1">Cancel</button>
              <button onClick={handleCreateChannel} disabled={creating || !newChannelName.trim()} className="nexus-btn-primary flex-1">
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
