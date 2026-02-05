// Data Trust Bubble Types

export type TrustStatus = 'green' | 'amber' | 'red';
export type TrustLevel = 'excellent' | 'good' | 'moderate' | 'needs_attention' | 'critical';

export interface TrustData {
  score: number; // 0-100
  stars: number; // 0-5
  status: TrustStatus;
  trustLevel: TrustLevel;
  lastRefresh?: string;
  issueCount: number;
  factors?: TrustFactors;
  aiSummary?: string;
}

export interface TrustFactors {
  documentation: number;
  governance: number;
  quality: number;
  usage: number;
  reliability: number;
  freshness: number;
}

export type AnomalyType =
  | 'unknown_value'
  | 'missing_data'
  | 'stale_data'
  | 'alert_box'
  | 'zero_value'
  | 'empty_table';

export type AnomalySeverity = 'info' | 'warning' | 'critical';

export interface VisualAnomaly {
  id: string;
  type: AnomalyType;
  message: string;
  severity: AnomalySeverity;
  element?: string; // CSS selector or description
  value?: string;
  detectedAt: string;
}

export type IssueType = 'incorrect' | 'missing' | 'stale' | 'other';

export interface IssueReport {
  type: IssueType;
  description: string;
  confidence: 'low' | 'medium' | 'high';
  pageUrl: string;
  pageTitle: string;
  assetName?: string;
  anomalies: VisualAnomaly[];
  timestamp: string;
  screenshot?: string; // Base64 encoded (future)
}

export interface PageContext {
  route: string;
  pageTitle: string;
  reportType?: string;
  assetName?: string;
  assetId?: string;
  isReportPage: boolean;
  isCRMPage: boolean;
  isAdminPage: boolean;
}

export interface BubbleState {
  isExpanded: boolean;
  isScanning: boolean;
  lastScanAt?: string;
  trustData?: TrustData;
  anomalies: VisualAnomaly[];
  pageContext?: PageContext;
  error?: string;
}

export interface BubblePreferences {
  autoScan: boolean;
  showOnAdminPages: boolean;
  defaultExpanded: boolean;
  scanInterval: number; // milliseconds
}

// API Response types
export interface TrustAPIResponse {
  success: boolean;
  data?: TrustData;
  error?: string;
}

export interface ReportAPIResponse {
  success: boolean;
  issueId?: string;
  error?: string;
}
