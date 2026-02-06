// Data Extractor - Extracts structured data from page DOM for AI analysis

export interface ExtractedKPI {
  label: string;
  value: string;
  rawValue: number | null;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

export interface ExtractedTableRow {
  [key: string]: string | number | null;
}

export interface ExtractedTable {
  id: string;
  headers: string[];
  rows: ExtractedTableRow[];
  rowCount: number;
}

export interface ExtractedChart {
  id: string;
  type: string;
  title?: string;
  dataPoints?: number;
}

export interface PageDataSnapshot {
  pageUrl: string;
  pageTitle: string;
  assetName?: string;
  reportType?: string;
  extractedAt: string;
  kpis: ExtractedKPI[];
  tables: ExtractedTable[];
  charts: ExtractedChart[];
  alerts: string[];
  freshnessIndicators: string[];
  rawTextSummary: string;
}

/**
 * Parse a string value to extract numeric value and unit
 */
function parseNumericValue(text: string): { value: number | null; unit?: string } {
  const cleaned = text.trim();

  // Currency patterns: $1,234.56, €1.234,56
  const currencyMatch = cleaned.match(/^[$€£¥]?\s*([\d,.\s]+)\s*([KMBkmb])?$/);
  if (currencyMatch) {
    let numStr = currencyMatch[1].replace(/[,\s]/g, '');
    let num = parseFloat(numStr);
    const suffix = currencyMatch[2]?.toUpperCase();
    if (suffix === 'K') num *= 1000;
    if (suffix === 'M') num *= 1000000;
    if (suffix === 'B') num *= 1000000000;
    const unit = cleaned.match(/^[$€£¥]/)?.[0] || '';
    return { value: isNaN(num) ? null : num, unit };
  }

  // Percentage patterns: 45.6%, -12%
  const percentMatch = cleaned.match(/^([+-]?\d+\.?\d*)\s*%$/);
  if (percentMatch) {
    return { value: parseFloat(percentMatch[1]), unit: '%' };
  }

  // Plain numbers: 1,234 or 1234.56
  const numMatch = cleaned.match(/^([+-]?\d[\d,.\s]*)$/);
  if (numMatch) {
    const num = parseFloat(numMatch[1].replace(/[,\s]/g, ''));
    return { value: isNaN(num) ? null : num };
  }

  return { value: null };
}

/**
 * Extract KPIs from common card/metric patterns
 */
function extractKPIs(): ExtractedKPI[] {
  const kpis: ExtractedKPI[] = [];

  if (typeof document === 'undefined') return kpis;

  // Pattern 1: Cards with label span and value (common in dashboards)
  const cards = document.querySelectorAll('[class*="card"], [class*="metric"], [class*="kpi"], [class*="stat"]');
  cards.forEach((card) => {
    // Look for label (usually in a span, h3, h4, or small text)
    const labelEl = card.querySelector('span[class*="label"], span[class*="title"], h3, h4, .text-sm, .text-gray-500');
    const label = labelEl?.textContent?.trim();

    // Look for value (usually the largest/boldest text)
    const valueEl = card.querySelector('p[class*="text-3xl"], p[class*="text-2xl"], .font-bold, [class*="value"]');
    const valueText = valueEl?.textContent?.trim();

    if (label && valueText && label.length < 50) {
      const { value, unit } = parseNumericValue(valueText);

      // Look for trend indicator
      let trend: 'up' | 'down' | 'stable' | undefined;
      let trendValue: string | undefined;
      const trendEl = card.querySelector('[class*="trend"], [class*="change"], .text-green-600, .text-red-600');
      if (trendEl) {
        const trendText = trendEl.textContent?.trim() || '';
        if (trendText.includes('+') || trendText.includes('↑') || trendEl.classList.contains('text-green-600')) {
          trend = 'up';
        } else if (trendText.includes('-') || trendText.includes('↓') || trendEl.classList.contains('text-red-600')) {
          trend = 'down';
        }
        trendValue = trendText;
      }

      kpis.push({ label, value: valueText, rawValue: value, unit, trend, trendValue });
    }
  });

  // Pattern 2: Definition lists (dt/dd pairs)
  const dts = document.querySelectorAll('dt');
  dts.forEach((dt) => {
    const dd = dt.nextElementSibling;
    if (dd?.tagName === 'DD') {
      const label = dt.textContent?.trim();
      const valueText = dd.textContent?.trim();
      if (label && valueText && label.length < 50) {
        const { value, unit } = parseNumericValue(valueText);
        kpis.push({ label, value: valueText, rawValue: value, unit });
      }
    }
  });

  // Deduplicate by label
  const seen = new Set<string>();
  return kpis.filter((kpi) => {
    const key = kpi.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extract table data
 */
function extractTables(): ExtractedTable[] {
  const tables: ExtractedTable[] = [];

  if (typeof document === 'undefined') return tables;

  const tableElements = document.querySelectorAll('table');
  tableElements.forEach((table, index) => {
    const headers: string[] = [];
    const rows: ExtractedTableRow[] = [];

    // Extract headers
    const headerCells = table.querySelectorAll('thead th, thead td');
    headerCells.forEach((cell) => {
      headers.push(cell.textContent?.trim() || '');
    });

    // If no thead, try first row
    if (headers.length === 0) {
      const firstRow = table.querySelector('tr');
      firstRow?.querySelectorAll('th, td').forEach((cell) => {
        headers.push(cell.textContent?.trim() || '');
      });
    }

    // Extract data rows (limit to first 20 for performance)
    const bodyRows = table.querySelectorAll('tbody tr');
    const rowLimit = Math.min(bodyRows.length, 20);

    for (let i = 0; i < rowLimit; i++) {
      const row = bodyRows[i];
      const rowData: ExtractedTableRow = {};
      const cells = row.querySelectorAll('td');

      cells.forEach((cell, cellIndex) => {
        const header = headers[cellIndex] || `col_${cellIndex}`;
        const text = cell.textContent?.trim() || '';
        const { value } = parseNumericValue(text);
        rowData[header] = value !== null ? value : text;
      });

      if (Object.keys(rowData).length > 0) {
        rows.push(rowData);
      }
    }

    if (headers.length > 0 || rows.length > 0) {
      tables.push({
        id: table.id || `table_${index}`,
        headers,
        rows,
        rowCount: bodyRows.length,
      });
    }
  });

  return tables;
}

/**
 * Extract chart information (basic - just identifies presence)
 */
function extractCharts(): ExtractedChart[] {
  const charts: ExtractedChart[] = [];

  if (typeof document === 'undefined') return charts;

  // Look for common chart containers
  const chartSelectors = [
    '[class*="chart"]',
    '[class*="graph"]',
    'canvas',
    'svg[class*="recharts"]',
    '[data-chart]',
  ];

  chartSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el, index) => {
      const parent = el.closest('[class*="card"], section, div');
      const title = parent?.querySelector('h3, h4, [class*="title"]')?.textContent?.trim();

      charts.push({
        id: el.id || `chart_${index}`,
        type: el.tagName.toLowerCase() === 'canvas' ? 'canvas' : 'svg',
        title,
      });
    });
  });

  return charts;
}

/**
 * Extract alert/warning messages
 */
function extractAlerts(): string[] {
  const alerts: string[] = [];

  if (typeof document === 'undefined') return alerts;

  const alertSelectors = [
    '[class*="alert"]',
    '[class*="warning"]',
    '[class*="error"]',
    '[role="alert"]',
    '.bg-amber-50',
    '.bg-red-50',
    '.bg-yellow-50',
  ];

  alertSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 10 && text.length < 500) {
        alerts.push(text);
      }
    });
  });

  // Deduplicate
  return [...new Set(alerts)];
}

/**
 * Extract freshness indicators
 */
function extractFreshnessIndicators(): string[] {
  const indicators: string[] = [];

  if (typeof document === 'undefined') return indicators;

  // Look for date/time indicators
  const patterns = [
    /updated?\s*(at|on)?\s*:?\s*[\d\/\-:\s]+/i,
    /last\s+refresh/i,
    /as\s+of/i,
    /\d+\s*(hours?|days?|minutes?)\s+ago/i,
  ];

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text)) {
    const text = node.textContent?.trim() || '';
    for (const pattern of patterns) {
      if (pattern.test(text) && text.length < 100) {
        indicators.push(text);
        break;
      }
    }
  }

  return [...new Set(indicators)].slice(0, 5);
}

/**
 * Get a summary of visible text for context
 */
function getRawTextSummary(): string {
  if (typeof document === 'undefined') return '';

  // Get main content area
  const main = document.querySelector('main') || document.body;
  const text = main.textContent || '';

  // Clean and truncate
  const cleaned = text
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);

  return cleaned;
}

/**
 * Extract all data from the current page
 */
export function extractPageData(assetName?: string, reportType?: string): PageDataSnapshot {
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const pageTitle = typeof document !== 'undefined' ? document.title : '';

  return {
    pageUrl,
    pageTitle,
    assetName,
    reportType,
    extractedAt: new Date().toISOString(),
    kpis: extractKPIs(),
    tables: extractTables(),
    charts: extractCharts(),
    alerts: extractAlerts(),
    freshnessIndicators: extractFreshnessIndicators(),
    rawTextSummary: getRawTextSummary(),
  };
}

/**
 * Compare two snapshots and identify differences
 */
export function compareSnapshots(
  current: PageDataSnapshot,
  previous: PageDataSnapshot
): {
  kpiChanges: Array<{ label: string; previous: string; current: string; change?: number }>;
  newAlerts: string[];
  resolvedAlerts: string[];
  tableRowChanges: Array<{ tableId: string; previousRows: number; currentRows: number }>;
} {
  const kpiChanges: Array<{ label: string; previous: string; current: string; change?: number }> = [];

  // Compare KPIs
  const prevKpiMap = new Map(previous.kpis.map((k) => [k.label.toLowerCase(), k]));
  for (const curr of current.kpis) {
    const prev = prevKpiMap.get(curr.label.toLowerCase());
    if (prev && prev.value !== curr.value) {
      let change: number | undefined;
      if (prev.rawValue !== null && curr.rawValue !== null && prev.rawValue !== 0) {
        change = ((curr.rawValue - prev.rawValue) / prev.rawValue) * 100;
      }
      kpiChanges.push({
        label: curr.label,
        previous: prev.value,
        current: curr.value,
        change,
      });
    }
  }

  // Compare alerts
  const prevAlertSet = new Set(previous.alerts);
  const currAlertSet = new Set(current.alerts);
  const newAlerts = current.alerts.filter((a) => !prevAlertSet.has(a));
  const resolvedAlerts = previous.alerts.filter((a) => !currAlertSet.has(a));

  // Compare table row counts
  const tableRowChanges: Array<{ tableId: string; previousRows: number; currentRows: number }> = [];
  const prevTableMap = new Map(previous.tables.map((t) => [t.id, t]));
  for (const curr of current.tables) {
    const prev = prevTableMap.get(curr.id);
    if (prev && prev.rowCount !== curr.rowCount) {
      tableRowChanges.push({
        tableId: curr.id,
        previousRows: prev.rowCount,
        currentRows: curr.rowCount,
      });
    }
  }

  return { kpiChanges, newAlerts, resolvedAlerts, tableRowChanges };
}
