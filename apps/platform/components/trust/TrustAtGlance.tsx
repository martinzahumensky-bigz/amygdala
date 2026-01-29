'use client';

import { useState } from 'react';
import { Button, Badge } from '@amygdala/ui';
import { TrustInsight, TrustFactors } from '@/lib/trust-calculator';
import { StarRating } from './StarRating';
import {
  FileText,
  Shield,
  GitBranch,
  Tag,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface TrustAtGlanceProps {
  score: number; // 0-100
  stars: number; // 0-5
  trustInsight: TrustInsight;
  onViewDetails?: () => void;
  onChat?: () => void;
  compact?: boolean;
  className?: string;
}

// Circular gauge component
function TrustGauge({
  score,
  size = 'default',
}: {
  score: number;
  size?: 'sm' | 'default' | 'lg';
}) {
  const percentage = Math.min(100, Math.max(0, score));
  const sizeConfig = {
    sm: { width: 64, strokeWidth: 6, fontSize: 'text-lg' },
    default: { width: 88, strokeWidth: 8, fontSize: 'text-2xl' },
    lg: { width: 120, strokeWidth: 10, fontSize: 'text-3xl' },
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
          className="text-gray-200 dark:text-gray-700"
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
        <span className={`${config.fontSize} font-bold text-gray-900 dark:text-white`}>
          {Math.round(percentage)}
        </span>
      </div>
    </div>
  );
}

// Trust level badge
function TrustLevelBadge({ level }: { level: TrustInsight['trustLevel'] }) {
  const config = {
    excellent: {
      label: 'Excellent',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    good: {
      label: 'Good',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    moderate: {
      label: 'Moderate',
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    needs_attention: {
      label: 'Needs Attention',
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    },
    critical: {
      label: 'Critical',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
  };

  const { label, className } = config[level];

  return <Badge className={className}>{label}</Badge>;
}

// Static trust indicator
function StaticTrustIndicator({
  label,
  icon: Icon,
  isActive,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon
        className={`h-3.5 w-3.5 ${
          isActive ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'
        }`}
      />
      <span
        className={`text-xs ${
          isActive ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        {label}
      </span>
      {isActive && <CheckCircle className="h-3 w-3 text-green-500" />}
    </div>
  );
}

// Live status badge
function LiveStatusBadge({
  status,
  isFresh,
  issueCount,
  lastRefresh,
}: {
  status: 'green' | 'amber' | 'red';
  isFresh: boolean;
  issueCount: number;
  lastRefresh?: string;
}) {
  const statusConfig = {
    green: {
      color: 'bg-green-500',
      label: 'Green',
      textColor: 'text-green-700 dark:text-green-400',
    },
    amber: {
      color: 'bg-yellow-500',
      label: 'Amber',
      textColor: 'text-yellow-700 dark:text-yellow-400',
    },
    red: {
      color: 'bg-red-500',
      label: 'Red',
      textColor: 'text-red-700 dark:text-red-400',
    },
  };

  const { color, label, textColor } = statusConfig[status];

  const getRefreshText = () => {
    if (!lastRefresh) return 'Unknown';
    const date = new Date(lastRefresh);
    const now = new Date();
    const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className={`text-sm font-medium ${textColor}`}>{label}</span>
      </div>
      <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          {isFresh ? (
            <span className="text-green-600 dark:text-green-400">Fresh ({getRefreshText()})</span>
          ) : (
            <span className="text-yellow-600 dark:text-yellow-400">Stale ({getRefreshText()})</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          {issueCount === 0 ? (
            <span className="text-green-600 dark:text-green-400">No issues</span>
          ) : (
            <span className="text-yellow-600 dark:text-yellow-400">{issueCount} issue{issueCount > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TrustAtGlance({
  score,
  stars,
  trustInsight,
  onViewDetails,
  onChat,
  compact = false,
  className = '',
}: TrustAtGlanceProps) {
  const { staticTrust, liveTrust, aiSummary, trustLevel } = trustInsight;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}
      >
        <TrustGauge score={score} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StarRating rating={stars} size="sm" />
            <TrustLevelBadge level={trustLevel} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{aiSummary}</p>
        </div>
        {onViewDetails && (
          <Button variant="ghost" size="sm" onClick={onViewDetails}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-500" />
          Data Trust Index
        </h3>
        {onViewDetails && (
          <Button variant="ghost" size="sm" onClick={onViewDetails}>
            View details
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="p-5">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: Score & Rating */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <TrustGauge score={score} />
            <div className="flex flex-col items-center md:items-start gap-1">
              <StarRating rating={stars} size="md" />
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stars.toFixed(1)}/5
                </span>
                <TrustLevelBadge level={trustLevel} />
              </div>
            </div>
          </div>

          {/* Right: AI Summary */}
          <div className="flex-1">
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {aiSummary}
                </p>
              </div>
            </div>

            {onChat && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={onChat}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Ask about trust score
              </Button>
            )}
          </div>
        </div>

        {/* Trust Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Static Trust */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Static Trust ({Math.round(staticTrust.score * 100)}%)
            </p>
            <div className="space-y-2">
              <StaticTrustIndicator
                label="Documented"
                icon={FileText}
                isActive={staticTrust.documented}
              />
              <StaticTrustIndicator
                label="Governed"
                icon={Shield}
                isActive={staticTrust.governed}
              />
              <StaticTrustIndicator
                label="Lineage"
                icon={GitBranch}
                isActive={staticTrust.hasLineage}
              />
              <StaticTrustIndicator
                label="Classified"
                icon={Tag}
                isActive={staticTrust.classified}
              />
            </div>
          </div>

          {/* Live Trust */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Live Status
            </p>
            <LiveStatusBadge
              status={liveTrust.status}
              isFresh={liveTrust.isFresh}
              issueCount={liveTrust.issueCount}
              lastRefresh={liveTrust.lastRefresh}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact card version for dashboard widgets
export function TrustAtGlanceCard({
  score,
  stars,
  trustInsight,
  onClick,
}: {
  score: number;
  stars: number;
  trustInsight: TrustInsight;
  onClick?: () => void;
}) {
  return (
    <div
      className={`p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 ${
        onClick ? 'cursor-pointer hover:border-purple-300 dark:hover:border-purple-600 transition-colors' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Trust Index</h4>
        <TrustLevelBadge level={trustInsight.trustLevel} />
      </div>
      <div className="flex items-center gap-4">
        <TrustGauge score={score} size="sm" />
        <div>
          <StarRating rating={stars} size="sm" />
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${
              trustInsight.liveTrust.status === 'green' ? 'bg-green-500' :
              trustInsight.liveTrust.status === 'amber' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {trustInsight.liveTrust.status === 'green' ? 'Healthy' :
               trustInsight.liveTrust.status === 'amber' ? 'Warning' : 'Critical'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
