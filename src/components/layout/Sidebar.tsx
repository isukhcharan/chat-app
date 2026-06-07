import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import {
  Hash,
  Plus,
  LogOut,
  Zap,
  ChevronDown,
  Lock,
  Loader2,
  MessageCircle,
  Settings,
  Check,
  UserPlus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getSocket } from '@/lib/socket';
import Avatar from '@/components/shared/Avatar';
import api from '@/lib/api';
import { Channel, User, UserStatus, WorkspaceMember } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  activeChannelId: string | null;
  activeDMUserId: string | null;
  onSelectChannel: (channel: Channel) => void;
  onSelectDM: (user: User) => void;
  onChannelsUpdate: (channels: Channel[]) => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  channels,
  activeChannelId,
  activeDMUserId,
  onSelectChannel,
  onSelectDM,
  onChannelsUpdate,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const { workspaces, currentWorkspace, switchWorkspace, refreshWorkspaces } = useWorkspace();
  const socket = getSocket();

  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, UserStatus>>({});
  const [showMembers, setShowMembers] = useState(true);
  const [unreadDMs, setUnreadDMs] = useState<Record<string, number>>({});
  const [unreadChannels, setUnreadChannels] = useState<Record<string, number>>({});
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const activeChannelIdRef = useRef(activeChannelId);
  const activeDMUserIdRef = useRef(activeDMUserId);
  const memberInputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => { activeChannelIdRef.current = activeChannelId; }, [activeChannelId]);
  useLayoutEffect(() => { activeDMUserIdRef.current = activeDMUserId; }, [activeDMUserId]);

  // Load workspace members + DM unread counts whenever workspace changes
  useEffect(() => {
    if (!currentWorkspace) return;
    setMembers([]);
    api
      .get(`/workspaces/${currentWorkspace.id}/members`)
      .then((data: any) => setMembers(data || []))
      .catch(() => {});
    api
      .get(`/workspaces/${currentWorkspace.id}/dms/unread/counts`)
      .then((data: any) => setUnreadDMs(data || {}))
      .catch(() => {});
  }, [currentWorkspace?.id]);

  const channelsSeedDone = useRef(false);
  useEffect(() => {
    channelsSeedDone.current = false;
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (channelsSeedDone.current || channels.length === 0) return;
    channelsSeedDone.current = true;
    const init: Record<string, number> = {};
    channels.forEach((ch) => {
      if (ch.unreadCount && ch.id !== activeChannelIdRef.current) {
        init[ch.id] = ch.unreadCount;
      }
    });
    setUnreadChannels(init);
  }, [channels]);

  useEffect(() => {
    if (activeChannelId) {
      setUnreadChannels((prev) => ({ ...prev, [activeChannelId]: 0 }));
    }
  }, [activeChannelId]);

  useEffect(() => {
    if (activeDMUserId && currentWorkspace) {
      setUnreadDMs((prev) => ({ ...prev, [activeDMUserId]: 0 }));
      api.post(`/workspaces/${currentWorkspace.id}/dms/${activeDMUserId}/read`).catch(() => {});
    }
  }, [activeDMUserId, currentWorkspace?.id]);

  useEffect(() => {
    const onDmNew = (dm: any) => {
      if (dm.senderId === user?.id) return;
      if (dm.senderId === activeDMUserIdRef.current) return;
      setUnreadDMs((prev) => ({ ...prev, [dm.senderId]: (prev[dm.senderId] ?? 0) + 1 }));
    };
    const onMsgNew = (msg: any) => {
      if (msg.user?.id === user?.id) return;
      if (msg.channelId === activeChannelIdRef.current) return;
      if (msg.parentId) return;
      setUnreadChannels((prev) => ({
        ...prev,
        [msg.channelId]: (prev[msg.channelId] ?? 0) + 1,
      }));
    };
    socket.on('dm:new', onDmNew);
    socket.on('message:new', onMsgNew);
    return () => {
      socket.off('dm:new', onDmNew);
      socket.off('message:new', onMsgNew);
    };
  }, [user?.id, socket]);

  useEffect(() => {
    const onStatus = ({ userId, status }: { userId: string; status: UserStatus }) => {
      setOnlineStatus((prev) => ({ ...prev, [userId]: status }));
    };
    socket.on('user:status', onStatus);
    return () => { socket.off('user:status', onStatus); };
  }, [socket]);

  const toggleMember = useCallback((memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  }, []);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setNewChannelName('');
    setSelectedMemberIds([]);
    setMemberSearch('');
  }, []);

  const handleCreateChannel = useCallback(async () => {
    if (!newChannelName.trim() || !currentWorkspace) return;
    setCreating(true);
    try {
      const channel: any = await api.post(
        `/workspaces/${currentWorkspace.id}/channels`,
        {
          name: newChannelName.trim(),
          ...(selectedMemberIds.length > 0 ? { memberIds: selectedMemberIds } : {}),
        },
      );
      onChannelsUpdate([...channels, channel]);
      onSelectChannel(channel);
      closeCreateModal();
    } catch {}
    setCreating(false);
  }, [newChannelName, selectedMemberIds, channels, currentWorkspace, onChannelsUpdate, onSelectChannel, closeCreateModal]);

  const handleGenerateInvite = async () => {
    if (!currentWorkspace) return;
    setGeneratingInvite(true);
    try {
      const data: any = await api.post(`/workspaces/${currentWorkspace.id}/invites`, {});
      const link = `${window.location.origin}/invite/${data.token}`;
      setInviteLink(link);
    } catch {}
    setGeneratingInvite(false);
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const getStatus = (userId: string, fallback: UserStatus): UserStatus =>
    onlineStatus[userId] ?? fallback;

  const otherMembers = members.filter((m) => m.userId !== user?.id);
  const onlineMembers = otherMembers.filter((m) => getStatus(m.userId, m.user.status) === 'ONLINE');
  const offlineMembers = otherMembers.filter(
    (m) => getStatus(m.userId, m.user.status) !== 'ONLINE',
  );

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm z-30 transition-opacity md:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'flex-shrink-0 bg-base-900 border-r border-border flex flex-col',
          'fixed inset-y-0 left-0 w-72 z-40 transition-transform duration-300 h-full',
          'md:relative md:w-60 md:translate-x-0 md:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Workspace header / switcher */}
        <div className="px-4 py-3 border-b border-border">
          <button
            onClick={() => setShowWorkspacePicker((s) => !s)}
            className="flex items-center gap-2 w-full hover:bg-white/5 rounded px-1 -mx-1 py-1 transition-colors"
          >
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center flex-shrink-0">
              <Zap className="w-3.5 h-3.5 text-white" fill="white" />
            </div>
            <span className="font-semibold text-sm tracking-tight truncate flex-1 text-left">
              {currentWorkspace?.name ?? 'Nexus'}
            </span>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-text-muted transition-transform flex-shrink-0',
                showWorkspacePicker && 'rotate-180',
              )}
            />
          </button>

          {showWorkspacePicker && (
            <div className="mt-2 bg-base-800 border border-border rounded-lg overflow-hidden shadow-xl">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    switchWorkspace(ws);
                    setShowWorkspacePicker(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-5 h-5 bg-indigo-600/80 rounded flex items-center justify-center flex-shrink-0">
                    <Zap className="w-3 h-3 text-white" fill="white" />
                  </div>
                  <span className="text-xs truncate flex-1">{ws.name}</span>
                  {ws.id === currentWorkspace?.id && (
                    <Check className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                  )}
                </button>
              ))}
              <div className="border-t border-border">
                <a
                  href="/workspaces/new"
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-text-muted hover:text-text-primary text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create workspace
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Channels section */}
          <div className="px-3 py-1 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Channels
              </span>
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
                  className={cn(
                    'channel-item w-full',
                    activeChannelId === ch.id && !activeDMUserId && 'active',
                  )}
                >
                  {ch.type === 'PRIVATE' ? (
                    <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span className="truncate flex-1 text-left">{ch.name}</span>
                  {(unreadChannels[ch.id] ?? 0) > 0 && ch.id !== activeChannelId && (
                    <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-badge-pop">
                      {unreadChannels[ch.id] > 99 ? '99+' : unreadChannels[ch.id]}
                    </span>
                  )}
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
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Direct Messages
              </span>
              <ChevronDown
                className={cn(
                  'w-3 h-3 text-text-muted transition-transform',
                  !showMembers && '-rotate-90',
                )}
              />
            </button>

            {showMembers && (
              <div className="space-y-0.5">
                {onlineMembers.map((m) => (
                  <button
                    key={m.userId}
                    onClick={() => onSelectDM(m.user as User)}
                    className={cn(
                      'w-full flex items-center gap-2 px-1.5 py-1.5 rounded transition-colors',
                      activeDMUserId === m.userId
                        ? 'bg-indigo-600/20 text-indigo-300'
                        : 'hover:bg-white/5 text-text-secondary hover:text-text-primary',
                    )}
                  >
                    <Avatar
                      name={m.user.displayName}
                      avatarUrl={m.user.avatarUrl}
                      status="ONLINE"
                      size="xs"
                    />
                    <span className="text-xs truncate flex-1 text-left">{m.user.displayName}</span>
                    {(unreadDMs[m.userId] ?? 0) > 0 && (
                      <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-badge-pop">
                        {unreadDMs[m.userId] > 99 ? '99+' : unreadDMs[m.userId]}
                      </span>
                    )}
                  </button>
                ))}
                {offlineMembers.map((m) => (
                  <button
                    key={m.userId}
                    onClick={() => onSelectDM(m.user as User)}
                    className={cn(
                      'w-full flex items-center gap-2 px-1.5 py-1.5 rounded transition-colors',
                      activeDMUserId === m.userId
                        ? 'bg-indigo-600/20 text-indigo-300'
                        : 'hover:bg-white/5 text-text-muted hover:text-text-secondary',
                    )}
                  >
                    <Avatar
                      name={m.user.displayName}
                      avatarUrl={m.user.avatarUrl}
                      status="OFFLINE"
                      size="xs"
                    />
                    <span className="text-xs truncate flex-1 text-left">{m.user.displayName}</span>
                    {(unreadDMs[m.userId] ?? 0) > 0 && (
                      <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-badge-pop">
                        {unreadDMs[m.userId] > 99 ? '99+' : unreadDMs[m.userId]}
                      </span>
                    )}
                  </button>
                ))}
                {otherMembers.length === 0 && (
                  <p className="text-xs text-text-muted px-1.5 py-1">No other members yet</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer: invite + current user */}
        <div className="border-t border-border">
          <button
            onClick={() => {
              setShowInviteModal(true);
              if (!inviteLink) handleGenerateInvite();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors text-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite people
          </button>
          <div className="px-3 py-2.5 border-t border-border flex items-center gap-2">
            <Avatar
              name={user?.displayName || ''}
              avatarUrl={user?.avatarUrl}
              status="ONLINE"
              size="sm"
            />
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
        </div>

        {/* Create channel modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-base-800 border border-border rounded-xl p-5 w-full max-w-sm animate-scale-in">
              <h2 className="text-sm font-semibold mb-4">Create a channel</h2>

              {/* Channel name */}
              <div className="relative mb-4">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  autoFocus
                  className="nexus-input pl-8"
                  placeholder="channel-name"
                  value={newChannelName}
                  onChange={(e) =>
                    setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()}
                />
              </div>

              {/* Member picker — @-mention style */}
              {otherMembers.length > 0 && (() => {
                const query = memberSearch.startsWith('@') ? memberSearch.slice(1) : memberSearch;
                const suggestions = otherMembers.filter(
                  (m) =>
                    !selectedMemberIds.includes(m.userId) &&
                    (query === '' ||
                      m.user.displayName.toLowerCase().includes(query.toLowerCase()) ||
                      m.user.username.toLowerCase().includes(query.toLowerCase())),
                );
                const showDropdown = memberSearch.length > 0 && suggestions.length > 0;

                return (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-text-secondary mb-2">
                      Add members
                    </label>

                    {/* Chip + input */}
                    <div
                      className="flex flex-wrap gap-1.5 p-2 bg-base-700 border border-border rounded-lg focus-within:border-indigo-500/50 transition-colors cursor-text min-h-[38px]"
                      onClick={() => memberInputRef.current?.focus()}
                    >
                      {selectedMemberIds.map((id) => {
                        const m = members.find((m) => m.userId === id);
                        if (!m) return null;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 bg-indigo-600/25 text-indigo-300 text-xs px-2 py-0.5 rounded-full"
                          >
                            {m.user.displayName}
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); toggleMember(id); }}
                              className="hover:text-white transition-colors"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        );
                      })}
                      <input
                        ref={memberInputRef}
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && memberSearch === '' && selectedMemberIds.length > 0) {
                            toggleMember(selectedMemberIds[selectedMemberIds.length - 1]);
                          }
                        }}
                        placeholder={selectedMemberIds.length === 0 ? 'Type @ to add members…' : ''}
                        className="flex-1 bg-transparent text-xs text-text-primary placeholder-text-muted outline-none min-w-[120px]"
                      />
                    </div>

                    {/* Dropdown suggestions */}
                    {showDropdown && (
                      <div className="mt-1 bg-base-800 border border-border rounded-lg shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                        {suggestions.map((m) => (
                          <button
                            key={m.userId}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              toggleMember(m.userId);
                              setMemberSearch('');
                              memberInputRef.current?.focus();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-xs transition-colors"
                          >
                            <Avatar
                              name={m.user.displayName}
                              avatarUrl={m.user.avatarUrl}
                              status={getStatus(m.userId, m.user.status)}
                              size="xs"
                            />
                            <span className="text-text-primary font-medium">{m.user.displayName}</span>
                            <span className="text-text-muted">@{m.user.username}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-2">
                <button onClick={closeCreateModal} className="nexus-btn-ghost flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleCreateChannel}
                  disabled={creating || !newChannelName.trim()}
                  className="nexus-btn-primary flex-1"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invite modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-base-800 border border-border rounded-xl p-5 w-full max-w-sm animate-scale-in">
              <h2 className="text-sm font-semibold mb-1">Invite people</h2>
              <p className="text-xs text-text-muted mb-4">
                Share this link to invite someone to{' '}
                <span className="text-text-primary">{currentWorkspace?.name}</span>.
              </p>
              {generatingInvite ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                </div>
              ) : (
                <div className="flex gap-2 mb-4">
                  <input
                    readOnly
                    value={inviteLink}
                    className="nexus-input text-xs flex-1"
                  />
                  <button
                    onClick={handleCopyInvite}
                    className={cn(
                      'nexus-btn-primary flex-shrink-0 text-xs px-3',
                      inviteCopied && 'bg-green-600 hover:bg-green-600',
                    )}
                  >
                    {inviteCopied ? <Check className="w-3.5 h-3.5" /> : 'Copy'}
                  </button>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteLink('');
                  }}
                  className="nexus-btn-ghost"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
