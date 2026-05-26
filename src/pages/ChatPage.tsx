import { useState, useEffect } from 'react';
import { Hash } from 'lucide-react';
import api from '@/lib/api';
import { Channel, User } from '@/types';
import Sidebar from '@/components/layout/Sidebar';
import ChannelView from '@/components/layout/ChannelView';
import DMView from '@/components/layout/DMView';

type View = { type: 'channel'; channel: Channel } | { type: 'dm'; user: User } | null;

export default function ChatPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [view, setView] = useState<View>(null);

  useEffect(() => {
    api.get('/channels').then((data: any) => {
      const list = data || [];
      setChannels(list);
      if (list.length > 0) setView({ type: 'channel', channel: list[0] });
    }).catch(() => {});
  }, []);

  const activeChannelId = view?.type === 'channel' ? view.channel.id : null;
  const activeDMUserId = view?.type === 'dm' ? view.user.id : null;

  return (
    <div className="flex h-screen bg-base-950 overflow-hidden">
      <Sidebar
        channels={channels}
        activeChannelId={activeChannelId}
        activeDMUserId={activeDMUserId}
        onSelectChannel={(ch) => setView({ type: 'channel', channel: ch })}
        onSelectDM={(u) => setView({ type: 'dm', user: u })}
        onChannelsUpdate={setChannels}
      />

      <main className="flex-1 flex overflow-hidden">
        {view?.type === 'channel' ? (
          <ChannelView key={view.channel.id} channel={view.channel} />
        ) : view?.type === 'dm' ? (
          <DMView key={view.user.id} partner={view.user} />
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
