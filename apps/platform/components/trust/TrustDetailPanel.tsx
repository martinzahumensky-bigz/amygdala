'use client';

import { useState } from 'react';
import { Button, Badge } from '@amygdala/ui';
import { TrustFactors } from '@/lib/trust-calculator';
import { TrustSpiderChart } from './TrustSpiderChart';
import {
  BarChart3,
  Hexagon,
  FileText,
  Shield,
  CheckCircle,
  Activity,
  Clock,
  Users,
  ArrowUp,
  ArrowDown,
  Minus,
  X,
  Lightbulb,
} from 'lucide-react';

interface TrustFactor {
  name: string;
  score: number;
  weight: number;
  status: 'green' | 'amber' | 'red';
  recommendation?: string;
}

interface TrustDetailPanelProps {
  factors: TrustFactor[];
  factorValues: TrustFactors;
  overallScore: number;
  viewMode?: 'spider' | 'bar';
  onViewModeChange?: (mode: 'spider' | 'bar') => void;
  onFixFactor?: (factor: TrustFactor) => void;
  onClose?: () => void;
  trends?: Record<string, { trend: 'improving' | 'declining' | 'stable'; change: number }>;
  showRecommendations?: boolean;
  className?: string;
}

const factorIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Documentation: FileText,
  Governance: Shield,
  Quality: BarChart3,
  Usage: Users,
  Reliability: Activity,
  Freshness: Clock,
};

const factorDescriptions: Record<string, string> = {
  Documentation: 'Description, business context, and lineage documentation',
  Governance: 'Ownership, stewardship, and data classification',
  Quality: 'Data quality rules, validation, and active issues',
  Usage: 'Active consumption and downstream usage',
  Reliability: 'Pipeline stability and issue resolution',
  Freshness: 'Data recency and update frequency',
};

function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: 'spider' | 'bar';
  onChange: (mode: 'spider' | 'bar') => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <button
        onClick={() => onChange('spider')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          mode === 'spider'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        <Hexagon className="h-4 w-4" />
        Spider
      </button>
      <button
        onClick={() => onChange('bar')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          mode === 'bar'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        <BarChart3 className="h-4 w-4" />
        Bar
      </button>
    </div>
  );
}

function TrendIndicator({
  trend,
  change,
}: {
  trend: 'improving' | 'declining' | 'stable';
  change: number;
}) {
  if (trend === 'improving') {
    return (
      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
        <ArrowUp className="h-3 w-3" />
        <span className="text-xs font-medium">+{change.toFixed(0)}%</span>
      </div>
    );
  }
  if (trend === 'declining') {
    return (
      <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
        <ArrowDown className="h-3 w-3" />
        <span className="text-xs font-medium">-{Math.abs(change).toFixed(0)}%</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-gray-400">
      <Minus className="h-3 w-3" />
      <span className="text-xs">Stable</span>
    </div>
  );
}

function FactorBar({
  factor,
  trend,
  onFix,
}: {
  factor: TrustFactor;
  trend?: { trend: 'improving' | 'declining' | 'stable'; change: number };
  onFix?: () => void;
}) {
  const Icon = factorIcons[factor.name] || BarChart3;
  const description = factorDescriptions[factor.name] || '';

  const statusColors = {
    green: 'text-green-500',
    amber: 'text-yellow-500',
    red: 'text-red-500',
  };

  const barColors = {
    green: 'bg-green-500',
    amber: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className="space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${statusColors[factor.status]}`} />
          <span className="font-medium text-gray-900 dark:text-white">{factor.name}</span>
          <span className="text-xs text-gray-400">({factor.weight}%)</span>
        </div>
        <div className="flex items-center gap-3">
          {trend && <TrendIndicator trend={trend.trend} change={trend.change} />}
          <span className={`text-sm font-semibold ${statusColors[factor.status]}`}>
            {factor.score.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColors[factor.status]} transition-all duration-300`}
          style={{ width: `${factor.score}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        {factor.recommendation && onFix && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            onClick={onFix}
          >
            <Lightbulb className="h-3 w-3 mr-1" />
            Fix
          </Button>
        )}
      </div>
    </div>
  );
}

export function TrustDetailPanel({
  factors,
  factorValues,
  overallScore,
  viewMode = 'spider',
  onViewModeChange,
  onFixFactor,
  onClose,
  trends,
  showRecommendations = true,
  className = '',
}: TrustDetailPanelProps) {
  const [mode, setMode] = useState(viewMode);

  const handleModeChange = (newMode: 'spider' | 'bar') => {
    setMode(newMode);
    onViewModeChange?.(newMode);
  };

  // Get factors that need attention (score < 60%)
  const factorsNeedingAttention = factors.filter((f) => f.score < 60 && f.recommendation);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Trust Factor Details</h3>
          <ViewModeToggle mode={mode} onChange={handleModeChange} />
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {mode === 'spider' ? (
          <div className="flex flex-col items-center">
            <TrustSpiderChart
              factors={factorValues}
              size={280}
              showLabels={true}
              showTooltips={true}
              thresholdLine={0.7}
            />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              Dashed line shows 70% threshold. Click on data points for details.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {factors.map((factor) => (
              <FactorBar
                key={factor.name}
                factor={factor}
                trend={trends?.[factor.name.toLowerCase()]}
                onFix={factor.recommendation && onFixFactor ? () => onFixFactor(factor) : undefined}
              />
            ))}
          </div>
        )}

        {/* Overall Score Summary */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Weighted Overall Score
          </span>
          <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {overallScore.toFixed(0)}%
          </span>
        </div>

        {/* Recommendations */}
        {showRecommendations && factorsNeedingAttention.length > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-purple-500" />
              Quick Wins
            </h4>
            <ul className="space-y-2">
              {factorsNeedingAttention.slice(0, 3).map((factor) => (
                <li key={factor.name} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong>{factor.name}:</strong> {factor.recommendation}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Modal wrapper for TrustDetailPanel
export function TrustDetailModal({
  isOpen,
  onClose,
  ...props
}: TrustDetailPanelProps & { isOpen: boolean }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <TrustDetailPanel {...props} onClose={onClose} />
      </div>
    </div>
  );
}
