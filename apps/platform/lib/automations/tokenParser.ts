/**
 * Token Parser for Automation Agent
 * Handles {{token}} interpolation with support for dot notation and transformations
 */

export interface TokenContext {
  record?: Record<string, unknown>;
  trigger?: {
    type: string;
    timestamp: string;
    data?: Record<string, unknown>;
  };
  automation?: {
    name: string;
    id: string;
  };
  previous_action?: {
    result?: unknown;
    status?: string;
  };
  env?: Record<string, string>;
}

/**
 * Parse a string and replace all {{token}} patterns with their values
 */
export function parseTokens(template: string, context: TokenContext): string {
  if (!template || typeof template !== 'string') {
    return template;
  }

  // Match {{token}} or {{token | transform:arg}}
  const tokenPattern = /\{\{([^}]+)\}\}/g;

  return template.replace(tokenPattern, (match, tokenExpression) => {
    try {
      const result = evaluateTokenExpression(tokenExpression.trim(), context);
      return result !== undefined && result !== null ? String(result) : '';
    } catch {
      console.warn(`Failed to parse token: ${match}`);
      return match; // Return original if parsing fails
    }
  });
}

/**
 * Parse tokens in any value type (string, object, array)
 */
export function parseTokensDeep(value: unknown, context: TokenContext): unknown {
  if (typeof value === 'string') {
    return parseTokens(value, context);
  }

  if (Array.isArray(value)) {
    return value.map(item => parseTokensDeep(item, context));
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = parseTokensDeep(val, context);
    }
    return result;
  }

  return value;
}

/**
 * Evaluate a single token expression like "record.name" or "record.name | uppercase"
 */
function evaluateTokenExpression(expression: string, context: TokenContext): unknown {
  // Check for transformation pipe
  const pipeIndex = expression.indexOf('|');
  let path: string;
  let transform: string | null = null;

  if (pipeIndex !== -1) {
    path = expression.substring(0, pipeIndex).trim();
    transform = expression.substring(pipeIndex + 1).trim();
  } else {
    path = expression;
  }

  // Get the raw value
  let value = getNestedValue(context, path);

  // Apply transformation if specified
  if (transform && value !== undefined) {
    value = applyTransform(value, transform);
  }

  return value;
}

/**
 * Get a nested value from an object using dot notation
 * Supports: record.name, record.metadata.owner, etc.
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || !path) return undefined;

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== 'object') {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Apply a transformation function to a value
 * Supports: uppercase, lowercase, truncate:N, date:FORMAT, default:VALUE, relative
 */
function applyTransform(value: unknown, transform: string): unknown {
  // Parse transform name and optional argument
  const colonIndex = transform.indexOf(':');
  let transformName: string;
  let arg: string | null = null;

  if (colonIndex !== -1) {
    transformName = transform.substring(0, colonIndex).trim().toLowerCase();
    arg = transform.substring(colonIndex + 1).trim();
    // Remove quotes from arg if present
    if ((arg.startsWith("'") && arg.endsWith("'")) || (arg.startsWith('"') && arg.endsWith('"'))) {
      arg = arg.slice(1, -1);
    }
  } else {
    transformName = transform.trim().toLowerCase();
  }

  switch (transformName) {
    case 'uppercase':
      return String(value).toUpperCase();

    case 'lowercase':
      return String(value).toLowerCase();

    case 'truncate':
      const maxLength = arg ? parseInt(arg, 10) : 50;
      const str = String(value);
      if (str.length > maxLength) {
        return str.substring(0, maxLength - 3) + '...';
      }
      return str;

    case 'date':
      const date = new Date(String(value));
      if (isNaN(date.getTime())) return value;
      const format = arg || 'YYYY-MM-DD';
      return formatDate(date, format);

    case 'relative':
      const relDate = new Date(String(value));
      if (isNaN(relDate.getTime())) return value;
      return formatRelativeTime(relDate);

    case 'default':
      if (value === null || value === undefined || value === '') {
        return arg || '';
      }
      return value;

    case 'json':
      return JSON.stringify(value);

    case 'first':
      if (Array.isArray(value)) {
        return value[0];
      }
      return value;

    case 'last':
      if (Array.isArray(value)) {
        return value[value.length - 1];
      }
      return value;

    case 'count':
      if (Array.isArray(value)) {
        return value.length;
      }
      return 1;

    default:
      console.warn(`Unknown transform: ${transformName}`);
      return value;
  }
}

/**
 * Format a date using a simple format string
 */
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return formatDate(date, 'YYYY-MM-DD');
  }
}

/**
 * Extract all token paths from a template string
 * Useful for validation and documentation
 */
export function extractTokenPaths(template: string): string[] {
  if (!template || typeof template !== 'string') {
    return [];
  }

  const tokenPattern = /\{\{([^}|]+)/g;
  const paths: string[] = [];
  let match;

  while ((match = tokenPattern.exec(template)) !== null) {
    const path = match[1].trim();
    if (!paths.includes(path)) {
      paths.push(path);
    }
  }

  return paths;
}

/**
 * Validate that all required tokens are present in the context
 */
export function validateTokens(template: string, context: TokenContext): { valid: boolean; missing: string[] } {
  const paths = extractTokenPaths(template);
  const missing: string[] = [];

  for (const path of paths) {
    const value = getNestedValue(context, path);
    if (value === undefined) {
      missing.push(path);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
