'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { PageContext, CatalogReport } from '../types';
import { classifyPage, shouldShowBubble } from '../utils/pageClassifier';

interface UsePageContextOptions {
  showOnAdminPages?: boolean;
}

interface UsePageContextResult {
  pageContext: PageContext | null;
  isLoading: boolean;
  shouldShow: boolean;
  refetchReport: () => Promise<void>;
}

export function usePageContext(options: UsePageContextOptions = {}): UsePageContextResult {
  const { showOnAdminPages = false } = options;
  const pathname = usePathname();
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCatalogReport = useCallback(async (appUrl: string): Promise<CatalogReport | undefined> => {
    try {
      const response = await fetch(`/api/trust/report-catalog?appUrl=${encodeURIComponent(appUrl)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.report) {
          return data.report as CatalogReport;
        }
      }
    } catch (error) {
      console.log('Could not fetch report from catalog:', error);
    }
    return undefined;
  }, []);

  const loadContext = useCallback(async () => {
    if (!pathname) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Classify the current page
    const context = classifyPage(pathname);

    // Update page title once DOM is available
    if (typeof document !== 'undefined') {
      context.pageTitle = document.title || 'Meridian Bank';
    }

    // Fetch report from Amygdala catalog
    if (context.isReportPage || context.isCRMPage) {
      const catalogReport = await fetchCatalogReport(pathname);
      if (catalogReport) {
        context.catalogReport = catalogReport;
        // Override assetName with report ID for better linking
        context.assetId = catalogReport.id;
      }
    }

    setPageContext(context);
    setIsLoading(false);
  }, [pathname, fetchCatalogReport]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const shouldShow = pathname ? shouldShowBubble(pathname, showOnAdminPages) : false;

  return {
    pageContext,
    isLoading,
    shouldShow,
    refetchReport: loadContext,
  };
}
