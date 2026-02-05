'use client';

import { Star } from 'lucide-react';
import { TrustData, TrustStatus, TrustLevel } from './types';

interface TrustScoreDisplayProps {
  trustData: TrustData;
  compact?: boolean;
}

// Circular gauge component (adapted from TrustAtGlance)
function TrustGauge({ score, size = 'default' }: { score: number; size?: 'sm' | 'default' }) {
  const percentage = Math.min(100, Math.max(0, score));
  const sizeConfig = {
    sm: { width: 56, strokeWidth: 5, fontSize: 'text-base' },
    default: { width: 72, strokeWidth: 6, fontSize: 'text-xl' },
  };
  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 70) return '#10b981'; // green
    if (percentage >= 50) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: config.width, height: config.width }}
    >
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          stroke={getColor()}
          strokeWidth={config.strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${config.fontSize} font-bold text-gray-900`}>{Math.round(percentage)}</span>
      </div>
    </div>
  );
}

// Star rating component
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-0.5">
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} className={`${sizeClass} text-yellow-400 fill-yellow-400`} />
      ))}

      {/* Half star */}
      {hasHalfStar && (
        <div className="relative">
          <Star className={`${sizeClass} text-gray-300`} />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className={`${sizeClass} text-yellow-400 fill-yellow-400`} />
          </div>
        </div>
      )}

      {/* Empty stars */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} className={`${sizeClass} text-gray-300`} />
      ))}
    </div>
  );
}

// Status badge
function StatusBadge({ status }: { status: TrustStatus }) {
  const config = {
    green: { label: 'Healthy', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    amber: { label: 'Warning', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    red: { label: 'Critical', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  };

  const { label, bg, text, dot } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// Trust level badge
function TrustLevelBadge({ level }: { level: TrustLevel }) {
  const config = {
    excellent: { label: 'Excellent', className: 'bg-green-100 text-green-700' },
    good: { label: 'Good', className: 'bg-blue-100 text-blue-700' },
    moderate: { label: 'Moderate', className: 'bg-yellow-100 text-yellow-700' },
    needs_attention: { label: 'Needs Attention', className: 'bg-orange-100 text-orange-700' },
    critical: { label: 'Critical', className: 'bg-red-100 text-red-700' },
  };

  const { label, className } = config[level];

  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function TrustScoreDisplay({ trustData, compact = false }: TrustScoreDisplayProps) {
  const { score, stars, status, trustLevel, aiSummary, issueCount } = trustData;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <TrustGauge score={score} size="sm" />
        <div className="flex flex-col gap-1">
          <StarRating rating={stars} size="sm" />
          <StatusBadge status={status} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Score and Rating */}
      <div className="flex items-center gap-4">
        <TrustGauge score={score} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <StarRating rating={stars} size="md" />
            <span className="text-sm text-gray-500">{stars.toFixed(1)}/5</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {issueCount > 0 && (
              <span className="text-xs text-gray-500">
                {issueCount} issue{issueCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-100">
          <p className="text-xs text-gray-700 leading-relaxed">{aiSummary}</p>
        </div>
      )}
    </div>
  );
}

export { TrustGauge, StarRating, StatusBadge, TrustLevelBadge };
