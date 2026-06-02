import { useState, useEffect } from 'react';
import { Hash } from 'lucide-react';
import api from '@/lib/api';
import { Channel, User } from '@/types';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import Sidebar from '@/components/layout/Sidebar';
import ChannelView from '@/components/layout/ChannelView';
import DMView from '@/components/layout/DMView';

type View = { type: 'channel'; channel: Channel } | { type: 'dm'; user: User } | null;

export default function ChatPage() {
  const { currentWorkspace } = useWorkspace();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [view, setView] = useState<View>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!currentWorkspace) return;
    setView(null);
    setChannels([]);

    api
      .get(`/workspaces/${currentWorkspace.id}/channels`)
      .then((data: any) => {
        const list = data || [];
        setChannels(list);
        if (list.length > 0) {
          setView({ type: 'channel', channel: list[0] });
          setSidebarOpen(false);
        }
      })
      .catch(() => {});
  }, [currentWorkspace?.id]);

  const activeChannelId = view?.type === 'channel' ? view.channel.id : null;
  const activeDMUserId = view?.type === 'dm' ? view.user.id : null;

  const selectChannel = (ch: Channel) => {
    setView({ type: 'channel', channel: ch });
    setSidebarOpen(false);
  };

  const selectDM = (u: User) => {
    setView({ type: 'dm', user: u });
    setSidebarOpen(false);
  };

  if (!currentWorkspace) return null;

  return (
    <div className="flex h-screen bg-base-950 overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        channels={channels}
        activeChannelId={activeChannelId}
        activeDMUserId={activeDMUserId}
        onSelectChannel={selectChannel}
        onSelectDM={selectDM}
        onChannelsUpdate={setChannels}
      />

      <main className="flex-1 flex overflow-hidden min-w-0">
        {view?.type === 'channel' ? (
          <ChannelView
            key={view.channel.id}
            channel={view.channel}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        ) : view?.type === 'dm' ? (
          <DMView
            key={view.user.id}
            partner={view.user}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-muted">
            <Hash className="w-12 h-12 opacity-20" />
            <p className="text-sm">Select a channel to get started</p>
          </div>
        )}
      </main>
    </div>
  );
}
