'use client';

import {
  X,
  Eye,
  RefreshCw,
  FileWarning,
  ExternalLink,
  Database,
  Star,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  FileText,
  LayoutDashboard,
  Layers,
} from 'lucide-react';
import { TrustData, VisualAnomaly, PageContext, AIAnalysisResult, CatalogReport } from './types';
import { TrustScoreDisplay } from './TrustScoreDisplay';
import { AnomalyList } from './AnomalyList';
import { AIAnalysisPanel } from './AIAnalysisPanel';

const PLATFORM_URL = 'https://platform-amygdala.vercel.app';

const typeIcons = {
  report: FileText,
  dashboard: LayoutDashboard,
  application_screen: Layers,
};

const fitnessConfig = {
  green: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: 'Healthy' },
  amber: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Warning' },
  red: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Critical' },
};

interface BubbleExpandedProps {
  trustData: TrustData | null;
  anomalies: VisualAnomaly[];
  pageContext: PageContext | null;
  isScanning: boolean;
  isLoading: boolean;
  aiAnalysis: AIAnalysisResult | null;
  isAnalyzing: boolean;
  hasComparison: boolean;
  onClose: () => void;
  onRescan: () => void;
  onReportIssue: () => void;
  onRunAIAnalysis: () => void;
}

export function BubbleExpanded({
  trustData,
  anomalies,
  pageContext,
  isScanning,
  isLoading,
  aiAnalysis,
  isAnalyzing,
  hasComparison,
  onClose,
  onRescan,
  onReportIssue,
  onRunAIAnalysis,
}: BubbleExpandedProps) {
  return (
    <div className="w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Data Trust</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Report Catalog Info */}
        {pageContext?.catalogReport ? (
          <ReportCatalogCard report={pageContext.catalogReport} />
        ) : pageContext?.assetName ? (
          <div className="flex items-center gap-2 text-xs text-gray-500 pb-2 border-b border-gray-100">
            <span>Asset:</span>
            <span className="font-medium text-gray-700">{pageContext.assetName}</span>
            {pageContext.reportType && (
              <>
                <span className="text-gray-300">|</span>
                <span>{pageContext.reportType}</span>
              </>
            )}
          </div>
        ) : null}

        {/* Trust Score Section - show if no catalog report or as fallback */}
        {!pageContext?.catalogReport && (
          <div>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading trust data...
                </div>
              </div>
            ) : trustData ? (
              <TrustScoreDisplay trustData={trustData} />
            ) : (
              <div className="text-center py-4 text-sm text-gray-500">
                {pageContext?.assetName
                  ? 'Unable to load trust data'
                  : 'No data asset detected for this page'}
              </div>
            )}
          </div>
        )}

        {/* AI Analysis Section */}
        <div className="pt-2 border-t border-gray-100">
          <AIAnalysisPanel
            analysis={aiAnalysis}
            isAnalyzing={isAnalyzing}
            hasComparison={hasComparison}
            onRunAnalysis={onRunAIAnalysis}
          />
        </div>

        {/* Page Scan Section (Basic DOM scan) */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <FileWarning className="h-4 w-4 text-gray-500" />
              Quick Scan
            </h4>
            {!isScanning && (
              <span className="text-xs text-gray-400">{anomalies.length} found</span>
            )}
          </div>
          <AnomalyList anomalies={anomalies} isScanning={isScanning} maxItems={3} />
        </div>
      </div>

      {/* Actions Footer */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100">
        <button
          onClick={onRescan}
          disabled={isScanning}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
          Rescan
        </button>
        <button
          onClick={onReportIssue}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <FileWarning className="h-4 w-4" />
          Report Issue
        </button>
      </div>

      {/* Platform link */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <a
          href={
            pageContext?.catalogReport
              ? `${PLATFORM_URL}/dashboard/catalog/${pageContext.catalogReport.id}`
              : `${PLATFORM_URL}/dashboard/catalog/reports`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 text-xs text-purple-600 hover:text-purple-700"
        >
          {pageContext?.catalogReport ? 'View in Amygdala Catalog' : 'Open Amygdala Platform'}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

// Report Catalog Card Component
function ReportCatalogCard({ report }: { report: CatalogReport }) {
  const TypeIcon = typeIcons[report.asset_type] || FileText;
  const fitness = fitnessConfig[report.fitness_status];
  const FitnessIcon = fitness.icon;

  return (
    <div className={`rounded-lg border ${fitness.bg} border-gray-100 p-3 space-y-3`}>
      {/* Report Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-white/80">
            <TypeIcon className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <a
              href={`${PLATFORM_URL}/dashboard/catalog/${report.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-gray-900 hover:text-purple-600 flex items-center gap-1"
            >
              {report.name}
              <ExternalLink className="h-3 w-3" />
            </a>
            <div className="flex items-center gap-1.5 mt-0.5">
              <FitnessIcon className={`h-3.5 w-3.5 ${fitness.color}`} />
              <span className={`text-xs ${fitness.color}`}>{fitness.label}</span>
            </div>
          </div>
        </div>
        {/* Trust Stars */}
        {report.trust_score_stars !== undefined && report.trust_score_stars !== null && (
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-3 w-3 ${
                  star <= (report.trust_score_stars || 0)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      {report.description && (
        <p className="text-xs text-gray-600 line-clamp-2">{report.description}</p>
      )}

      {/* Source Data Assets */}
      {report.sourceAssets && report.sourceAssets.length > 0 && (
        <div className="pt-2 border-t border-gray-200/50">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
            <Database className="h-3 w-3" />
            <span>Source Data ({report.sourceAssets.length})</span>
          </div>
          <div className="space-y-1">
            {report.sourceAssets.slice(0, 3).map((asset) => {
              const assetFitness = fitnessConfig[asset.fitness_status];
              const AssetFitnessIcon = assetFitness.icon;
              return (
                <a
                  key={asset.id}
                  href={`${PLATFORM_URL}/dashboard/catalog/${asset.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-xs p-1.5 rounded bg-white/60 hover:bg-white transition-colors"
                >
                  <span className="text-gray-700">{asset.name}</span>
                  <div className="flex items-center gap-2">
                    <AssetFitnessIcon className={`h-3 w-3 ${assetFitness.color}`} />
                    {asset.trust_score_stars !== undefined && asset.trust_score_stars !== null && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-2.5 w-2.5 ${
                              star <= (asset.trust_score_stars || 0)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </a>
              );
            })}
            {report.sourceAssets.length > 3 && (
              <p className="text-xs text-gray-400 pl-1.5">
                +{report.sourceAssets.length - 3} more sources
              </p>
            )}
          </div>
        </div>
      )}

      {/* Owner */}
      {(report.owner || report.steward) && (
        <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
          {report.owner && <span>Owner: {report.owner}</span>}
          {report.owner && report.steward && <span>•</span>}
          {report.steward && <span>Steward: {report.steward}</span>}
        </div>
      )}
    </div>
  );
}
