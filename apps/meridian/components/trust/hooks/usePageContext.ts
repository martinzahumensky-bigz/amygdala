'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { PageContext } from '../types';
import { classifyPage, shouldShowBubble } from '../utils/pageClassifier';

interface UsePageContextOptions {
  showOnAdminPages?: boolean;
}

interface UsePageContextResult {
  pageContext: PageContext | null;
  isLoading: boolean;
  shouldShow: boolean;
}

export function usePageContext(options: UsePageContextOptions = {}): UsePageContextResult {
  const { showOnAdminPages = false } = options;
  const pathname = usePathname();
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!pathname) {
      setIsLoading(false);
      return;
    }

    // Classify the current page
    const context = classifyPage(pathname);

    // Update page title once DOM is available
    if (typeof document !== 'undefined') {
      context.pageTitle = document.title || 'Meridian Bank';
    }

    setPageContext(context);
    setIsLoading(false);
  }, [pathname]);

  const shouldShow = pathname ? shouldShowBubble(pathname, showOnAdminPages) : false;

  return {
    pageContext,
    isLoading,
    shouldShow,
  };
}
