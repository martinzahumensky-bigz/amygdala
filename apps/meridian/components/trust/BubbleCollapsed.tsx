'use client';

import { Eye } from 'lucide-react';
import { TrustStatus } from './types';
import { AnomalySummaryBadge } from './AnomalyList';

interface BubbleCollapsedProps {
  status: TrustStatus;
  onClick: () => void;
  anomalyCount?: number;
  criticalCount?: number;
  warningCount?: number;
  isLoading?: boolean;
}

export function BubbleCollapsed({
  status,
  onClick,
  anomalyCount = 0,
  criticalCount = 0,
  warningCount = 0,
  isLoading = false,
}: BubbleCollapsedProps) {
  const statusColors = {
    green: 'border-green-500 shadow-green-500/20',
    amber: 'border-amber-500 shadow-amber-500/20',
    red: 'border-red-500 shadow-red-500/20',
  };

  const iconColors = {
    green: 'text-green-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative
        w-12 h-12
        rounded-full
        bg-white
        border-2 ${statusColors[status]}
        shadow-lg
        flex items-center justify-center
        transition-all duration-200
        hover:scale-110
        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
        ${isLoading ? 'animate-pulse' : ''}
      `}
      aria-label="Open Data Trust bubble"
    >
      <Eye className={`h-5 w-5 ${iconColors[status]}`} />

      {/* Anomaly count badge */}
      <AnomalySummaryBadge total={anomalyCount} critical={criticalCount} warnings={warningCount} />

      {/* Pulse animation for status indication */}
      <span
        className={`
          absolute inset-0
          rounded-full
          border-2 ${statusColors[status]}
          animate-ping
          opacity-30
        `}
        style={{ animationDuration: '2s' }}
      />
    </button>
  );
}
