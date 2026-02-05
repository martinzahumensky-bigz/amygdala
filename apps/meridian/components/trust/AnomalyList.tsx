'use client';

import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { VisualAnomaly, AnomalySeverity } from './types';

interface AnomalyListProps {
  anomalies: VisualAnomaly[];
  isScanning?: boolean;
  maxItems?: number;
}

function getSeverityIcon(severity: AnomalySeverity) {
  switch (severity) {
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'info':
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function getSeverityBg(severity: AnomalySeverity) {
  switch (severity) {
    case 'critical':
      return 'bg-red-50 border-red-100';
    case 'warning':
      return 'bg-amber-50 border-amber-100';
    case 'info':
      return 'bg-blue-50 border-blue-100';
  }
}

export function AnomalyList({ anomalies, isScanning = false, maxItems = 5 }: AnomalyListProps) {
  const displayAnomalies = anomalies.slice(0, maxItems);
  const remainingCount = anomalies.length - maxItems;

  if (isScanning) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          Scanning page...
        </div>
      </div>
    );
  }

  if (anomalies.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 px-3 bg-green-50 rounded-lg border border-green-100">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span className="text-sm text-green-700">No visual anomalies detected</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayAnomalies.map((anomaly) => (
        <div
          key={anomaly.id}
          className={`flex items-start gap-2 p-2.5 rounded-lg border ${getSeverityBg(anomaly.severity)}`}
        >
          <div className="flex-shrink-0 mt-0.5">{getSeverityIcon(anomaly.severity)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 leading-snug">{anomaly.message}</p>
            {anomaly.value && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">Value: {anomaly.value}</p>
            )}
          </div>
        </div>
      ))}

      {remainingCount > 0 && (
        <p className="text-xs text-gray-500 text-center py-1">
          +{remainingCount} more anomal{remainingCount === 1 ? 'y' : 'ies'}
        </p>
      )}
    </div>
  );
}

// Compact summary for collapsed state
export function AnomalySummaryBadge({
  total,
  critical,
  warnings,
}: {
  total: number;
  critical: number;
  warnings: number;
}) {
  if (total === 0) {
    return null;
  }

  const bgColor = critical > 0 ? 'bg-red-500' : warnings > 0 ? 'bg-amber-500' : 'bg-blue-500';

  return (
    <span
      className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white ${bgColor}`}
    >
      {total}
    </span>
  );
}
