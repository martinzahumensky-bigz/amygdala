'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrustData, TrustAPIResponse } from '../types';

interface UseTrustScoreOptions {
  assetName?: string;
  autoFetch?: boolean;
  refetchInterval?: number; // milliseconds
}

interface UseTrustScoreResult {
  trustData: TrustData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTrustScore(options: UseTrustScoreOptions = {}): UseTrustScoreResult {
  const { assetName, autoFetch = true, refetchInterval } = options;

  const [trustData, setTrustData] = useState<TrustData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrustData = useCallback(async () => {
    if (!assetName) {
      setTrustData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/trust?asset=${encodeURIComponent(assetName)}`);
      const result: TrustAPIResponse = await response.json();

      if (result.success && result.data) {
        setTrustData(result.data);
      } else {
        setError(result.error || 'Failed to fetch trust data');
      }
    } catch (err) {
      console.error('Error fetching trust data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trust data');
    } finally {
      setIsLoading(false);
    }
  }, [assetName]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch && assetName) {
      fetchTrustData();
    }
  }, [autoFetch, assetName, fetchTrustData]);

  // Periodic refetch
  useEffect(() => {
    if (!refetchInterval || !assetName || !autoFetch) return;

    const interval = setInterval(fetchTrustData, refetchInterval);
    return () => clearInterval(interval);
  }, [refetchInterval, assetName, autoFetch, fetchTrustData]);

  return {
    trustData,
    isLoading,
    error,
    refetch: fetchTrustData,
  };
}
