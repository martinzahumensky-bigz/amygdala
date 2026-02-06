'use client';

import { useState, useCallback } from 'react';
import { AIAnalysisResult, SnapshotData, VisualAnomaly } from '../types';
import { extractPageData, PageDataSnapshot } from '../utils/dataExtractor';

interface UseAIAnalysisOptions {
  assetName?: string;
  reportType?: string;
  visualAnomalies?: VisualAnomaly[];
}

interface UseAIAnalysisResult {
  analysis: AIAnalysisResult | null;
  previousSnapshot: SnapshotData | null;
  currentSnapshot: PageDataSnapshot | null;
  isAnalyzing: boolean;
  error: string | null;
  runAnalysis: () => Promise<void>;
  hasComparison: boolean;
}

export function useAIAnalysis(options: UseAIAnalysisOptions = {}): UseAIAnalysisResult {
  const { assetName, reportType, visualAnomalies = [] } = options;

  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<SnapshotData | null>(null);
  const [currentSnapshot, setCurrentSnapshot] = useState<PageDataSnapshot | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    if (typeof document === 'undefined') return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Step 1: Extract current page data
      const extracted = extractPageData(assetName, reportType);
      setCurrentSnapshot(extracted);

      // Step 2: Fetch previous snapshot for comparison
      let prevSnapshot: SnapshotData | null = null;
      try {
        const snapshotRes = await fetch(
          `/api/trust/snapshot?asset=${encodeURIComponent(assetName || '')}&pageUrl=${encodeURIComponent(extracted.pageUrl)}`
        );
        if (snapshotRes.ok) {
          const snapshotData = await snapshotRes.json();
          if (snapshotData.snapshot) {
            prevSnapshot = {
              ...snapshotData.snapshot,
              ...snapshotData.snapshot.snapshot_data,
            };
            setPreviousSnapshot(prevSnapshot);
          }
        }
      } catch (e) {
        console.log('No previous snapshot available');
      }

      // Step 3: Run AI analysis
      const analysisRes = await fetch('/api/trust/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSnapshot: extracted,
          previousSnapshot: prevSnapshot?.kpis ? prevSnapshot : undefined,
          assetName,
          reportType,
          visualAnomalies: visualAnomalies.length > 0 ? visualAnomalies : undefined,
        }),
      });

      if (analysisRes.ok) {
        const result = await analysisRes.json();
        if (result.success && result.analysis) {
          setAnalysis(result.analysis);
        } else {
          setError(result.error || 'Analysis failed');
        }
      } else {
        setError('Failed to run analysis');
      }

      // Step 4: Save current snapshot for future comparison
      try {
        await fetch('/api/trust/snapshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageUrl: extracted.pageUrl,
            pageTitle: extracted.pageTitle,
            assetName,
            reportType,
            snapshot: extracted,
          }),
        });
      } catch (e) {
        console.log('Failed to save snapshot:', e);
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [assetName, reportType, visualAnomalies]);

  return {
    analysis,
    previousSnapshot,
    currentSnapshot,
    isAnalyzing,
    error,
    runAnalysis,
    hasComparison: !!previousSnapshot,
  };
}
