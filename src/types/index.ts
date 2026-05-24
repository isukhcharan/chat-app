export type UserStatus = 'ONLINE' | 'AWAY' | 'OFFLINE';
export type ChannelType = 'PUBLIC' | 'PRIVATE';
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: UserStatus;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: ChannelType;
  _count?: { members: number };
  members?: ChannelMember[];
}

export interface ChannelMember {
  userId: string;
  channelId: string;
  role: MemberRole;
  lastRead: string;
  user?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'status'>;
}

export interface MessageUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Reaction {
  id: string;
  emoji: string;
  user: { id: string; username: string };
}

export interface Message {
  id: string;
  content: string;
  isAI: boolean;
  createdAt: string;
  editedAt?: string;
  parentId?: string;
  channelId: string;
  user: MessageUser;
  reactions: Reaction[];
  _count: { replies: number };
}

export interface TypingUser {
  userId: string;
  username: string;
  typing: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}
