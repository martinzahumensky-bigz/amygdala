'use client';

import { X, Eye, RefreshCw, FileWarning, ExternalLink } from 'lucide-react';
import { TrustData, VisualAnomaly, PageContext, AIAnalysisResult } from './types';
import { TrustScoreDisplay } from './TrustScoreDisplay';
import { AnomalyList } from './AnomalyList';
import { AIAnalysisPanel } from './AIAnalysisPanel';

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
        {/* Page context */}
        {pageContext?.assetName && (
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
        )}

        {/* Trust Score Section */}
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
          href="https://platform-amygdala.vercel.app/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 text-xs text-purple-600 hover:text-purple-700"
        >
          Open Amygdala Platform
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
