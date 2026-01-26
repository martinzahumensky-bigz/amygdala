import * as React from 'react';
import { cn } from './utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  initials?: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const colorMap: Record<string, string> = {
  A: 'bg-red-500',
  B: 'bg-orange-500',
  C: 'bg-amber-500',
  D: 'bg-yellow-500',
  E: 'bg-lime-500',
  F: 'bg-green-500',
  G: 'bg-emerald-500',
  H: 'bg-teal-500',
  I: 'bg-cyan-500',
  J: 'bg-sky-500',
  K: 'bg-blue-500',
  L: 'bg-indigo-500',
  M: 'bg-violet-500',
  N: 'bg-purple-500',
  O: 'bg-fuchsia-500',
  P: 'bg-pink-500',
  Q: 'bg-rose-500',
  R: 'bg-red-400',
  S: 'bg-orange-400',
  T: 'bg-amber-400',
  U: 'bg-yellow-400',
  V: 'bg-lime-400',
  W: 'bg-green-400',
  X: 'bg-emerald-400',
  Y: 'bg-teal-400',
  Z: 'bg-cyan-400',
};

function getColorFromInitials(initials: string): string {
  const firstLetter = initials.charAt(0).toUpperCase();
  return colorMap[firstLetter] || 'bg-gray-500';
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, initials, src, size = 'md', color, ...props }, ref) => {
    const bgColor = color || (initials ? getColorFromInitials(initials) : 'bg-gray-500');

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full font-medium text-white',
          bgColor,
          {
            'h-6 w-6 text-xs': size === 'sm',
            'h-8 w-8 text-sm': size === 'md',
            'h-10 w-10 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {src ? (
          <img src={src} alt={initials || 'Avatar'} className="h-full w-full rounded-full object-cover" />
        ) : (
          initials?.toUpperCase()
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';
