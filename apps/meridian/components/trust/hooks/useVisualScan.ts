'use client';

import { useState, useCallback, useEffect } from 'react';
import { VisualAnomaly } from '../types';
import { scanForAnomalies, getAnomalySummary } from '../utils/anomalyDetector';

interface UseVisualScanOptions {
  autoScan?: boolean;
  scanDelay?: number; // Delay before first scan (ms)
  scanInterval?: number; // Interval between scans (ms), 0 = no repeat
}

interface UseVisualScanResult {
  anomalies: VisualAnomaly[];
  isScanning: boolean;
  lastScanAt: string | null;
  summary: {
    total: number;
    critical: number;
    warnings: number;
    info: number;
    status: 'green' | 'amber' | 'red';
  };
  scan: () => Promise<void>;
}

export function useVisualScan(options: UseVisualScanOptions = {}): UseVisualScanResult {
  const { autoScan = true, scanDelay = 1000, scanInterval = 0 } = options;

  const [anomalies, setAnomalies] = useState<VisualAnomaly[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanAt, setLastScanAt] = useState<string | null>(null);

  const scan = useCallback(async () => {
    if (typeof document === 'undefined') return;

    setIsScanning(true);

    // Small delay to let the UI update
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      const detected = scanForAnomalies();
      setAnomalies(detected);
      setLastScanAt(new Date().toISOString());
    } catch (err) {
      console.error('Error scanning for anomalies:', err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Initial scan with delay
  useEffect(() => {
    if (!autoScan) return;

    const timeout = setTimeout(scan, scanDelay);
    return () => clearTimeout(timeout);
  }, [autoScan, scanDelay, scan]);

  // Periodic scanning
  useEffect(() => {
    if (!scanInterval || scanInterval <= 0) return;

    const interval = setInterval(scan, scanInterval);
    return () => clearInterval(interval);
  }, [scanInterval, scan]);

  const summary = getAnomalySummary(anomalies);

  return {
    anomalies,
    isScanning,
    lastScanAt,
    summary,
    scan,
  };
}
