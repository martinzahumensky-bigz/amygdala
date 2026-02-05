// Data Trust Bubble - Public API

export { DataTrustBubble } from './DataTrustBubble';
export { TrustBubbleProvider, useTrustBubble } from './TrustBubbleProvider';

// Types
export type {
  TrustStatus,
  TrustLevel,
  TrustData,
  TrustFactors,
  AnomalyType,
  AnomalySeverity,
  VisualAnomaly,
  IssueType,
  IssueReport,
  PageContext,
  BubbleState,
  BubblePreferences,
} from './types';

// Components (for advanced usage)
export { BubbleCollapsed } from './BubbleCollapsed';
export { BubbleExpanded } from './BubbleExpanded';
export { TrustScoreDisplay, TrustGauge, StarRating, StatusBadge } from './TrustScoreDisplay';
export { AnomalyList, AnomalySummaryBadge } from './AnomalyList';
export { IssueReportForm } from './IssueReportForm';

// Hooks
export { usePageContext } from './hooks/usePageContext';
export { useTrustScore } from './hooks/useTrustScore';
export { useVisualScan } from './hooks/useVisualScan';

// Utilities
export { classifyPage, getAssetNameForRoute, shouldShowBubble } from './utils/pageClassifier';
export { scanForAnomalies, getAnomalySummary } from './utils/anomalyDetector';
