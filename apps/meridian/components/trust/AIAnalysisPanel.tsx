'use client';

import {
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingDown,
  TrendingUp,
  CheckCircle,
  History,
  Lightbulb,
} from 'lucide-react';
import { AIAnalysisResult, AIAnomaly } from './types';

interface AIAnalysisPanelProps {
  analysis: AIAnalysisResult | null;
  isAnalyzing: boolean;
  hasComparison: boolean;
  onRunAnalysis: () => void;
}

function getSeverityIcon(severity: AIAnomaly['severity']) {
  switch (severity) {
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'info':
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function getSeverityBg(severity: AIAnomaly['severity']) {
  switch (severity) {
    case 'critical':
      return 'bg-red-50 border-red-100';
    case 'warning':
      return 'bg-amber-50 border-amber-100';
    case 'info':
      return 'bg-blue-50 border-blue-100';
  }
}

function getTrustImpactBadge(impact: AIAnalysisResult['trustImpact']) {
  const config = {
    none: { label: 'No Impact', bg: 'bg-green-100 text-green-700' },
    minor: { label: 'Minor Impact', bg: 'bg-blue-100 text-blue-700' },
    moderate: { label: 'Moderate Impact', bg: 'bg-amber-100 text-amber-700' },
    severe: { label: 'Severe Impact', bg: 'bg-red-100 text-red-700' },
  };
  const { label, bg } = config[impact];
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${bg}`}>{label}</span>;
}

export function AIAnalysisPanel({
  analysis,
  isAnalyzing,
  hasComparison,
  onRunAnalysis,
}: AIAnalysisPanelProps) {
  if (isAnalyzing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-700">AI Analysis</span>
        </div>
        <div className="flex flex-col items-center justify-center py-6 bg-purple-50 rounded-lg border border-purple-100">
          <div className="h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm text-purple-700">Analyzing page data...</p>
          <p className="text-xs text-purple-500 mt-1">Extracting KPIs and comparing with history</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">AI Analysis</span>
          </div>
        </div>
        <button
          onClick={onRunAnalysis}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all shadow-sm"
        >
          <Sparkles className="h-4 w-4" />
          Run AI Analysis
        </button>
        <p className="text-xs text-gray-500 text-center">
          AI will analyze page data, compare with history, and detect suspicious patterns
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with trust impact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700">AI Analysis</span>
        </div>
        {getTrustImpactBadge(analysis.trustImpact)}
      </div>

      {/* Summary */}
      <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
        <p className="text-sm text-gray-700">{analysis.summary}</p>
      </div>

      {/* Comparison badge if available */}
      {hasComparison && analysis.comparisonInsights && analysis.comparisonInsights.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <History className="h-3.5 w-3.5" />
            Compared with previous snapshot
          </div>
          <div className="space-y-1.5">
            {analysis.comparisonInsights.slice(0, 3).map((insight, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded border border-gray-100"
              >
                {insight.includes('→') ? (
                  insight.includes('-') ? (
                    <TrendingDown className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  )
                ) : (
                  <Info className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                )}
                <span className="text-gray-600">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anomalies */}
      {analysis.anomalies.length > 0 ? (
        <div className="space-y-2">
          <span className="text-xs font-medium text-gray-500 uppercase">
            Issues Found ({analysis.anomalies.length})
          </span>
          {analysis.anomalies.slice(0, 4).map((anomaly, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 p-2.5 rounded-lg border ${getSeverityBg(anomaly.severity)}`}
            >
              <div className="flex-shrink-0 mt-0.5">{getSeverityIcon(anomaly.severity)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 leading-snug">{anomaly.message}</p>
                {anomaly.details && (
                  <p className="text-xs text-gray-500 mt-0.5">{anomaly.details}</p>
                )}
              </div>
            </div>
          ))}
          {analysis.anomalies.length > 4 && (
            <p className="text-xs text-gray-500 text-center">
              +{analysis.anomalies.length - 4} more issues
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-700">No issues detected by AI analysis</span>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Lightbulb className="h-3.5 w-3.5" />
            Recommendations
          </div>
          <ul className="space-y-1">
            {analysis.recommendations.slice(0, 2).map((rec, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                <span className="text-purple-500 mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Re-run button */}
      <button
        onClick={onRunAnalysis}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-purple-600 hover:bg-purple-50 rounded transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Re-run Analysis
      </button>
    </div>
  );
}
