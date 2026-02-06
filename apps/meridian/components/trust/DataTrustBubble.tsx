'use client';

import { useState, useCallback } from 'react';
import { usePageContext } from './hooks/usePageContext';
import { useTrustScore } from './hooks/useTrustScore';
import { useVisualScan } from './hooks/useVisualScan';
import { useAIAnalysis } from './hooks/useAIAnalysis';
import { BubbleCollapsed } from './BubbleCollapsed';
import { BubbleExpanded } from './BubbleExpanded';
import { IssueReportForm } from './IssueReportForm';
import { TrustStatus } from './types';

interface DataTrustBubbleProps {
  showOnAdminPages?: boolean;
}

export function DataTrustBubble({ showOnAdminPages = false }: DataTrustBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Page context detection
  const { pageContext, shouldShow } = usePageContext({ showOnAdminPages });

  // Trust score fetching
  const {
    trustData,
    isLoading: isTrustLoading,
    refetch: refetchTrust,
  } = useTrustScore({
    assetName: pageContext?.assetName,
    autoFetch: true,
    refetchInterval: 60000, // Refetch every minute
  });

  // Visual anomaly scanning
  const {
    anomalies,
    isScanning,
    summary: anomalySummary,
    scan: scanPage,
  } = useVisualScan({
    autoScan: true,
    scanDelay: 1500, // Wait for page to render
    scanInterval: 0, // No auto-repeat
  });

  // AI Analysis - pass visual anomalies for combined analysis
  const {
    analysis: aiAnalysis,
    isAnalyzing,
    hasComparison,
    runAnalysis,
  } = useAIAnalysis({
    assetName: pageContext?.assetName,
    reportType: pageContext?.reportType,
    visualAnomalies: anomalies,
  });

  // Determine overall status
  const getOverallStatus = useCallback((): TrustStatus => {
    // AI analysis critical issues take priority
    if (aiAnalysis?.trustImpact === 'severe') return 'red';

    // Critical anomalies always result in red
    if (anomalySummary.critical > 0) return 'red';

    // If we have trust data, use its status
    if (trustData) {
      // Combine trust status with anomaly warnings
      if (trustData.status === 'red' || anomalySummary.warnings > 2) return 'red';
      if (
        trustData.status === 'amber' ||
        anomalySummary.warnings > 0 ||
        aiAnalysis?.trustImpact === 'moderate'
      )
        return 'amber';
      return trustData.status;
    }

    // Fallback based on anomalies only
    if (anomalySummary.warnings > 0) return 'amber';
    return 'green';
  }, [trustData, anomalySummary, aiAnalysis]);

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleCollapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const handleRescan = useCallback(async () => {
    await Promise.all([scanPage(), refetchTrust()]);
  }, [scanPage, refetchTrust]);

  const handleReportIssue = useCallback(() => {
    setIsReportModalOpen(true);
  }, []);

  const handleCloseReportModal = useCallback(() => {
    setIsReportModalOpen(false);
  }, []);

  const handleRunAIAnalysis = useCallback(() => {
    runAnalysis();
  }, [runAnalysis]);

  // Don't render if shouldn't show (e.g., admin pages)
  if (!shouldShow) {
    return null;
  }

  const overallStatus = getOverallStatus();

  return (
    <>
      {/* Fixed position container */}
      <div className="fixed bottom-6 right-6 z-50">
        {isExpanded ? (
          <BubbleExpanded
            trustData={trustData}
            anomalies={anomalies}
            pageContext={pageContext}
            isScanning={isScanning}
            isLoading={isTrustLoading}
            aiAnalysis={aiAnalysis}
            isAnalyzing={isAnalyzing}
            hasComparison={hasComparison}
            onClose={handleCollapse}
            onRescan={handleRescan}
            onReportIssue={handleReportIssue}
            onRunAIAnalysis={handleRunAIAnalysis}
          />
        ) : (
          <BubbleCollapsed
            status={overallStatus}
            onClick={handleExpand}
            anomalyCount={anomalySummary.total + (aiAnalysis?.anomalies?.length || 0)}
            criticalCount={
              anomalySummary.critical +
              (aiAnalysis?.anomalies?.filter((a) => a.severity === 'critical').length || 0)
            }
            warningCount={
              anomalySummary.warnings +
              (aiAnalysis?.anomalies?.filter((a) => a.severity === 'warning').length || 0)
            }
            isLoading={isTrustLoading}
          />
        )}
      </div>

      {/* Issue Report Modal */}
      <IssueReportForm
        isOpen={isReportModalOpen}
        onClose={handleCloseReportModal}
        pageContext={pageContext}
        anomalies={anomalies}
      />
    </>
  );
}
