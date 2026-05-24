import { useState, useEffect } from 'react';
import { Hash } from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Channel, UserStatus } from '@/types';
import Sidebar from '@/components/layout/Sidebar';
import ChannelView from '@/components/layout/ChannelView';

export default function ChatPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, UserStatus>>({});

  useEffect(() => {
    api.get('/channels').then((data: any) => {
      const list = data || [];
      setChannels(list);
      if (list.length > 0 && !activeChannel) setActiveChannel(list[0]);
    }).catch(() => {});

    const socket = getSocket();
    socket.on('user:status', ({ userId, status }: { userId: string; status: UserStatus }) => {
      setOnlineUsers((prev) => ({ ...prev, [userId]: status }));
    });

    return () => {
      socket.off('user:status');
    };
  }, []);

  return (
    <div className="flex h-screen bg-base-950 overflow-hidden">
      <Sidebar
        channels={channels}
        activeChannelId={activeChannel?.id ?? null}
        onSelectChannel={setActiveChannel}
        onChannelsUpdate={setChannels}
        onlineUsers={onlineUsers}
      />

      <main className="flex-1 flex overflow-hidden">
        {activeChannel ? (
          <ChannelView key={activeChannel.id} channel={activeChannel} />
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
