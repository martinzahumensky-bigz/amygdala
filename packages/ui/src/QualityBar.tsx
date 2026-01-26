import * as React from 'react';
import { cn } from './utils';

export interface QualityBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

function getQualityColor(value: number): string {
  if (value >= 90) return 'bg-green-500';
  if (value >= 70) return 'bg-lime-500';
  if (value >= 50) return 'bg-yellow-500';
  if (value >= 30) return 'bg-orange-500';
  return 'bg-red-500';
}

export const QualityBar = React.forwardRef<HTMLDivElement, QualityBarProps>(
  ({ className, value, showLabel = true, size = 'md', ...props }, ref) => {
    const clampedValue = Math.max(0, Math.min(100, value));

    return (
      <div ref={ref} className={cn('flex items-center gap-2', className)} {...props}>
        <div
          className={cn('overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700', {
            'h-1.5 w-16': size === 'sm',
            'h-2 w-20': size === 'md',
          })}
        >
          <div
            className={cn('h-full rounded-full transition-all', getQualityColor(clampedValue))}
            style={{ width: `${clampedValue}%` }}
          />
        </div>
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{clampedValue}%</span>
        )}
      </div>
    );
  }
);
QualityBar.displayName = 'QualityBar';
