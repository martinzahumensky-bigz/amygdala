'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { BubbleState, BubblePreferences, VisualAnomaly, TrustData, PageContext } from './types';

interface TrustBubbleContextValue {
  state: BubbleState;
  preferences: BubblePreferences;
  // Actions
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
  setTrustData: (data: TrustData) => void;
  setAnomalies: (anomalies: VisualAnomaly[]) => void;
  addAnomaly: (anomaly: VisualAnomaly) => void;
  setPageContext: (context: PageContext) => void;
  setScanning: (scanning: boolean) => void;
  setError: (error: string | undefined) => void;
  updatePreferences: (prefs: Partial<BubblePreferences>) => void;
}

const defaultPreferences: BubblePreferences = {
  autoScan: true,
  showOnAdminPages: false,
  defaultExpanded: false,
  scanInterval: 30000, // 30 seconds
};

const defaultState: BubbleState = {
  isExpanded: false,
  isScanning: false,
  anomalies: [],
};

const TrustBubbleContext = createContext<TrustBubbleContextValue | undefined>(undefined);

export function TrustBubbleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BubbleState>(defaultState);
  const [preferences, setPreferences] = useState<BubblePreferences>(defaultPreferences);

  const expand = useCallback(() => {
    setState((prev) => ({ ...prev, isExpanded: true }));
  }, []);

  const collapse = useCallback(() => {
    setState((prev) => ({ ...prev, isExpanded: false }));
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => ({ ...prev, isExpanded: !prev.isExpanded }));
  }, []);

  const setTrustData = useCallback((data: TrustData) => {
    setState((prev) => ({ ...prev, trustData: data, error: undefined }));
  }, []);

  const setAnomalies = useCallback((anomalies: VisualAnomaly[]) => {
    setState((prev) => ({
      ...prev,
      anomalies,
      lastScanAt: new Date().toISOString(),
    }));
  }, []);

  const addAnomaly = useCallback((anomaly: VisualAnomaly) => {
    setState((prev) => ({
      ...prev,
      anomalies: [...prev.anomalies, anomaly],
    }));
  }, []);

  const setPageContext = useCallback((context: PageContext) => {
    setState((prev) => ({ ...prev, pageContext: context }));
  }, []);

  const setScanning = useCallback((scanning: boolean) => {
    setState((prev) => ({ ...prev, isScanning: scanning }));
  }, []);

  const setError = useCallback((error: string | undefined) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const updatePreferences = useCallback((prefs: Partial<BubblePreferences>) => {
    setPreferences((prev) => ({ ...prev, ...prefs }));
  }, []);

  const value: TrustBubbleContextValue = {
    state,
    preferences,
    expand,
    collapse,
    toggle,
    setTrustData,
    setAnomalies,
    addAnomaly,
    setPageContext,
    setScanning,
    setError,
    updatePreferences,
  };

  return (
    <TrustBubbleContext.Provider value={value}>
      {children}
    </TrustBubbleContext.Provider>
  );
}

export function useTrustBubble(): TrustBubbleContextValue {
  const context = useContext(TrustBubbleContext);
  if (!context) {
    throw new Error('useTrustBubble must be used within a TrustBubbleProvider');
  }
  return context;
}
