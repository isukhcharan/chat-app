import { cn, getInitials } from '@/lib/utils';
import { UserStatus } from '@/types';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  status?: UserStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

const statusColors: Record<UserStatus, string> = {
  ONLINE: 'bg-emerald-500',
  AWAY: 'bg-yellow-500',
  OFFLINE: 'bg-base-500',
};

const statusSizes = {
  xs: 'w-1.5 h-1.5 border',
  sm: 'w-2 h-2 border',
  md: 'w-2.5 h-2.5 border-2',
  lg: 'w-3 h-3 border-2',
};

export default function Avatar({ name, avatarUrl, status, size = 'md', className }: AvatarProps) {
  return (
    <div className={cn('relative flex-shrink-0', className)}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={cn(sizes[size], 'rounded-full object-cover')}
        />
      ) : (
        <div
          className={cn(
            sizes[size],
            'rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center font-medium text-indigo-300',
          )}
        >
          {getInitials(name)}
        </div>
      )}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-base-900',
            statusColors[status],
            statusSizes[size],
          )}
        />
      )}
    </div>
  );
}
