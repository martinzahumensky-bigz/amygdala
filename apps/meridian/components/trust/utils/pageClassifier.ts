// Page Classifier - maps Meridian routes to data assets

import { PageContext } from '../types';

// Mapping of Meridian routes to Platform data assets
const ROUTE_ASSET_MAP: Record<string, { assetName: string; assetId?: string; reportType: string }> = {
  '/reports/revenue': {
    assetName: 'gold_daily_revenue',
    reportType: 'Daily Revenue Report',
  },
  '/reports/branch-performance': {
    assetName: 'gold_branch_metrics',
    reportType: 'Branch Performance Report',
  },
  '/crm/customer-360': {
    assetName: 'silver_customers',
    reportType: 'Customer 360 View',
  },
  '/crm/transactions': {
    assetName: 'silver_transactions',
    reportType: 'Transaction History',
  },
};

// Page type patterns
const ADMIN_PATTERNS = ['/admin', '/settings', '/config'];
const REPORT_PATTERNS = ['/reports', '/dashboard', '/analytics'];
const CRM_PATTERNS = ['/crm', '/customer', '/client'];

export function classifyPage(pathname: string): PageContext {
  // Normalize pathname
  const route = pathname.toLowerCase().replace(/\/$/, '') || '/';

  // Check for admin pages
  const isAdminPage = ADMIN_PATTERNS.some((pattern) => route.includes(pattern));

  // Check for report pages
  const isReportPage = REPORT_PATTERNS.some((pattern) => route.includes(pattern));

  // Check for CRM pages
  const isCRMPage = CRM_PATTERNS.some((pattern) => route.includes(pattern));

  // Look up asset mapping
  const assetMapping = ROUTE_ASSET_MAP[route];

  // Get page title from document if available
  let pageTitle = 'Unknown Page';
  if (typeof document !== 'undefined') {
    pageTitle = document.title || 'Meridian Bank';
  }

  return {
    route,
    pageTitle,
    reportType: assetMapping?.reportType,
    assetName: assetMapping?.assetName,
    assetId: assetMapping?.assetId,
    isReportPage,
    isCRMPage,
    isAdminPage,
  };
}

export function getAssetNameForRoute(pathname: string): string | undefined {
  const normalizedPath = pathname.toLowerCase().replace(/\/$/, '');
  return ROUTE_ASSET_MAP[normalizedPath]?.assetName;
}

export function getReportTypeForRoute(pathname: string): string | undefined {
  const normalizedPath = pathname.toLowerCase().replace(/\/$/, '');
  return ROUTE_ASSET_MAP[normalizedPath]?.reportType;
}

export function shouldShowBubble(pathname: string, showOnAdminPages: boolean): boolean {
  const context = classifyPage(pathname);

  // Never show on home page (optional)
  if (pathname === '/') {
    return true; // Show on home for demo purposes
  }

  // Check admin page preference
  if (context.isAdminPage && !showOnAdminPages) {
    return false;
  }

  return true;
}
