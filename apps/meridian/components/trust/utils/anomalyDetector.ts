// Anomaly Detector - DOM-based visual anomaly detection

import { VisualAnomaly, AnomalyType, AnomalySeverity } from '../types';

// Patterns that indicate unknown or missing data
const UNKNOWN_PATTERNS = [
  '[UNKNOWN]',
  '[Unknown]',
  'Unknown',
  'N/A',
  'n/a',
  'N/a',
  'Missing',
  'MISSING',
  'Not Available',
  'Not available',
  '--',
  '-',
  'null',
  'undefined',
];

// CSS classes that indicate alert states
const ALERT_CLASSES = {
  amber: ['amber-50', 'amber-100', 'yellow-50', 'yellow-100', 'warning', 'alert-warning'],
  red: ['red-50', 'red-100', 'error', 'alert-error', 'alert-danger'],
};

// Selectors for important data elements
const KPI_SELECTORS = [
  '[data-kpi]',
  '.kpi-value',
  '.metric-value',
  '.stat-value',
  'h3 + p', // Common pattern: label h3 followed by value p
];

const TABLE_SELECTORS = ['table tbody', '.data-table tbody', '[data-table] tbody'];

let anomalyIdCounter = 0;

function generateAnomalyId(): string {
  return `anomaly-${Date.now()}-${++anomalyIdCounter}`;
}

function createAnomaly(
  type: AnomalyType,
  message: string,
  severity: AnomalySeverity,
  element?: string,
  value?: string
): VisualAnomaly {
  return {
    id: generateAnomalyId(),
    type,
    message,
    severity,
    element,
    value,
    detectedAt: new Date().toISOString(),
  };
}

/**
 * Scan for unknown/missing value labels in the DOM
 */
function scanForUnknownValues(): VisualAnomaly[] {
  const anomalies: VisualAnomaly[] = [];

  if (typeof document === 'undefined') return anomalies;

  // Get all text nodes
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);

  const textNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text)) {
    textNodes.push(node);
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent?.trim() || '';

    for (const pattern of UNKNOWN_PATTERNS) {
      if (text === pattern || text.includes(pattern)) {
        // Get parent element for context
        const parent = textNode.parentElement;
        const tagName = parent?.tagName.toLowerCase() || 'unknown';
        const className = parent?.className || '';

        anomalies.push(
          createAnomaly(
            'unknown_value',
            `Unknown or missing value detected: "${pattern}"`,
            'warning',
            `${tagName}.${className.split(' ')[0] || 'element'}`,
            text
          )
        );
        break; // Only report once per text node
      }
    }
  }

  return anomalies;
}

/**
 * Scan for existing alert boxes (amber/red backgrounds)
 */
function scanForAlertBoxes(): VisualAnomaly[] {
  const anomalies: VisualAnomaly[] = [];

  if (typeof document === 'undefined') return anomalies;

  // Scan for amber alerts
  for (const className of ALERT_CLASSES.amber) {
    const elements = document.querySelectorAll(`[class*="${className}"]`);
    elements.forEach((el) => {
      const text = el.textContent?.trim().slice(0, 100) || 'Alert detected';
      anomalies.push(
        createAnomaly(
          'alert_box',
          `Warning alert: ${text}`,
          'warning',
          el.tagName.toLowerCase()
        )
      );
    });
  }

  // Scan for red alerts
  for (const className of ALERT_CLASSES.red) {
    const elements = document.querySelectorAll(`[class*="${className}"]`);
    elements.forEach((el) => {
      const text = el.textContent?.trim().slice(0, 100) || 'Critical alert detected';
      anomalies.push(
        createAnomaly(
          'alert_box',
          `Critical alert: ${text}`,
          'critical',
          el.tagName.toLowerCase()
        )
      );
    });
  }

  return anomalies;
}

/**
 * Scan for freshness badges indicating stale data
 */
function scanForFreshnessBadges(): VisualAnomaly[] {
  const anomalies: VisualAnomaly[] = [];

  if (typeof document === 'undefined') return anomalies;

  // Look for elements containing freshness info
  const freshnessPatterns = [
    /(\d+)\s*(day|days|d)\s*(old|ago)/i,
    /stale/i,
    /outdated/i,
    /last updated:\s*(\d+)\s*(day|days)/i,
    /(\d+)h ago/i,
  ];

  const allElements = document.querySelectorAll('*');
  allElements.forEach((el) => {
    const text = el.textContent?.trim() || '';

    for (const pattern of freshnessPatterns) {
      const match = text.match(pattern);
      if (match) {
        // Check if this is a freshness indicator element (badge, pill, etc.)
        const classList = el.className || '';
        const isBadge =
          classList.includes('badge') ||
          classList.includes('pill') ||
          classList.includes('status') ||
          classList.includes('freshness');

        // Check for stale indicators
        if (pattern.source.includes('stale') || pattern.source.includes('outdated')) {
          anomalies.push(
            createAnomaly(
              'stale_data',
              `Data freshness concern: ${text.slice(0, 50)}`,
              'warning'
            )
          );
        } else if (isBadge && match[1]) {
          const value = parseInt(match[1], 10);
          // If days > 1 or hours > 24, flag as stale
          if (
            (match[2]?.toLowerCase().startsWith('d') && value > 1) ||
            (match[2]?.toLowerCase().startsWith('h') && value > 24)
          ) {
            anomalies.push(
              createAnomaly('stale_data', `Data may be stale: ${text.slice(0, 50)}`, 'warning')
            );
          }
        }
        break;
      }
    }
  });

  return anomalies;
}

/**
 * Scan for zero values in KPI cards
 */
function scanForZeroValues(): VisualAnomaly[] {
  const anomalies: VisualAnomaly[] = [];

  if (typeof document === 'undefined') return anomalies;

  for (const selector of KPI_SELECTORS) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      const text = el.textContent?.trim() || '';

      // Check for zero values (but not in context like "0 issues" which is good)
      if (text === '0' || text === '$0' || text === '0%' || text === '$0.00') {
        // Get label from sibling or parent
        const parent = el.parentElement;
        const label = parent?.querySelector('span, label, h3, h4')?.textContent || 'KPI';

        // Skip if this looks like a "good" zero (like "0 issues")
        const contextText = parent?.textContent?.toLowerCase() || '';
        if (
          contextText.includes('issue') ||
          contextText.includes('error') ||
          contextText.includes('problem')
        ) {
          return; // This is a good zero
        }

        anomalies.push(
          createAnomaly(
            'zero_value',
            `Zero value detected for ${label.trim()}`,
            'info',
            selector,
            text
          )
        );
      }
    });
  }

  return anomalies;
}

/**
 * Scan for empty tables
 */
function scanForEmptyTables(): VisualAnomaly[] {
  const anomalies: VisualAnomaly[] = [];

  if (typeof document === 'undefined') return anomalies;

  for (const selector of TABLE_SELECTORS) {
    const tbodies = document.querySelectorAll(selector);
    tbodies.forEach((tbody) => {
      const rows = tbody.querySelectorAll('tr');
      if (rows.length === 0) {
        // Get table context
        const table = tbody.closest('table');
        const tableId = table?.id || table?.className.split(' ')[0] || 'data-table';

        anomalies.push(
          createAnomaly(
            'empty_table',
            `Empty data table detected (${tableId})`,
            'warning',
            selector
          )
        );
      }
    });
  }

  return anomalies;
}

/**
 * Run all anomaly scans and return combined results
 */
export function scanForAnomalies(): VisualAnomaly[] {
  const allAnomalies: VisualAnomaly[] = [];

  // Run all scanners
  allAnomalies.push(...scanForUnknownValues());
  allAnomalies.push(...scanForAlertBoxes());
  allAnomalies.push(...scanForFreshnessBadges());
  allAnomalies.push(...scanForZeroValues());
  allAnomalies.push(...scanForEmptyTables());

  // Deduplicate by message
  const seen = new Set<string>();
  const deduplicated = allAnomalies.filter((anomaly) => {
    const key = `${anomaly.type}-${anomaly.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by severity (critical first)
  const severityOrder: Record<AnomalySeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return deduplicated.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Get a summary of anomalies for the bubble badge
 */
export function getAnomalySummary(anomalies: VisualAnomaly[]): {
  total: number;
  critical: number;
  warnings: number;
  info: number;
  status: 'green' | 'amber' | 'red';
} {
  const critical = anomalies.filter((a) => a.severity === 'critical').length;
  const warnings = anomalies.filter((a) => a.severity === 'warning').length;
  const info = anomalies.filter((a) => a.severity === 'info').length;

  let status: 'green' | 'amber' | 'red' = 'green';
  if (critical > 0) {
    status = 'red';
  } else if (warnings > 0) {
    status = 'amber';
  }

  return {
    total: anomalies.length,
    critical,
    warnings,
    info,
    status,
  };
}
