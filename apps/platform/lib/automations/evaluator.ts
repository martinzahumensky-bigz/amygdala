/**
 * Condition Evaluator for Automation Agent
 * Evaluates conditions against records to determine if actions should execute
 */

import { AutomationCondition, ConditionOperator } from '@amygdala/database';

export interface EvaluationContext {
  record?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Evaluate a single condition against a record
 */
export function evaluateCondition(
  condition: AutomationCondition,
  context: EvaluationContext
): boolean {
  const fieldValue = getFieldValue(context, condition.field);
  const targetValue = condition.value;

  return evaluateOperator(condition.operator, fieldValue, targetValue);
}

/**
 * Evaluate multiple conditions with AND/OR logic
 * Default logic is AND between conditions
 */
export function evaluateConditions(
  conditions: AutomationCondition[],
  context: EvaluationContext
): boolean {
  if (!conditions || conditions.length === 0) {
    return true; // No conditions means always pass
  }

  // Start with the first condition
  let result = evaluateCondition(conditions[0], context);

  // Apply subsequent conditions with their logic operators
  for (let i = 1; i < conditions.length; i++) {
    const condition = conditions[i];
    const conditionResult = evaluateCondition(condition, context);
    const logic = condition.logic || 'and';

    if (logic === 'or') {
      result = result || conditionResult;
    } else {
      result = result && conditionResult;
    }
  }

  return result;
}

/**
 * Get a field value from the context using dot notation
 * Supports: record.name, record.metadata.owner, etc.
 */
function getFieldValue(context: EvaluationContext, field: string): unknown {
  if (!field) return undefined;

  // If field starts with record. but context doesn't have record wrapper,
  // try both with and without the record. prefix
  const parts = field.split('.');
  let current: unknown = context;

  // Try direct path first
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  // If found, return it
  if (current !== undefined) {
    return current;
  }

  // If not found and field starts with "record.", try without it
  if (parts[0] === 'record' && context.record) {
    current = context.record;
    for (let i = 1; i < parts.length; i++) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[parts[i]];
    }
    return current;
  }

  // Also try directly on the record if field doesn't have record. prefix
  if (context.record && !field.startsWith('record.')) {
    current = context.record;
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

  return undefined;
}

/**
 * Evaluate an operator with field value and target value
 */
function evaluateOperator(
  operator: ConditionOperator,
  fieldValue: unknown,
  targetValue: unknown
): boolean {
  switch (operator) {
    case 'equals':
      return isEqual(fieldValue, targetValue);

    case 'not_equals':
      return !isEqual(fieldValue, targetValue);

    case 'contains':
      return contains(fieldValue, targetValue);

    case 'not_contains':
      return !contains(fieldValue, targetValue);

    case 'starts_with':
      return startsWith(fieldValue, targetValue);

    case 'ends_with':
      return endsWith(fieldValue, targetValue);

    case 'matches':
      return matches(fieldValue, targetValue);

    case 'greater_than':
      return greaterThan(fieldValue, targetValue);

    case 'less_than':
      return lessThan(fieldValue, targetValue);

    case 'greater_than_or_equals':
      return greaterThanOrEquals(fieldValue, targetValue);

    case 'less_than_or_equals':
      return lessThanOrEquals(fieldValue, targetValue);

    case 'is_empty':
      return isEmpty(fieldValue);

    case 'is_not_empty':
      return !isEmpty(fieldValue);

    case 'in':
      return isIn(fieldValue, targetValue);

    case 'not_in':
      return !isIn(fieldValue, targetValue);

    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

// Helper functions for operators

function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined) return b === null || b === undefined;
  if (typeof a === 'number' && typeof b === 'string') {
    return a === Number(b);
  }
  if (typeof a === 'string' && typeof b === 'number') {
    return Number(a) === b;
  }
  // Case-insensitive string comparison
  if (typeof a === 'string' && typeof b === 'string') {
    return a.toLowerCase() === b.toLowerCase();
  }
  return String(a) === String(b);
}

function contains(fieldValue: unknown, targetValue: unknown): boolean {
  if (Array.isArray(fieldValue)) {
    return fieldValue.some(item => isEqual(item, targetValue));
  }
  if (typeof fieldValue === 'string' && targetValue !== undefined) {
    return fieldValue.toLowerCase().includes(String(targetValue).toLowerCase());
  }
  return false;
}

function startsWith(fieldValue: unknown, targetValue: unknown): boolean {
  if (typeof fieldValue === 'string' && targetValue !== undefined) {
    return fieldValue.toLowerCase().startsWith(String(targetValue).toLowerCase());
  }
  return false;
}

function endsWith(fieldValue: unknown, targetValue: unknown): boolean {
  if (typeof fieldValue === 'string' && targetValue !== undefined) {
    return fieldValue.toLowerCase().endsWith(String(targetValue).toLowerCase());
  }
  return false;
}

function matches(fieldValue: unknown, targetValue: unknown): boolean {
  if (typeof fieldValue === 'string' && typeof targetValue === 'string') {
    try {
      const regex = new RegExp(targetValue, 'i');
      return regex.test(fieldValue);
    } catch {
      return false;
    }
  }
  return false;
}

function greaterThan(fieldValue: unknown, targetValue: unknown): boolean {
  const a = toNumber(fieldValue);
  const b = toNumber(targetValue);
  if (a !== null && b !== null) {
    return a > b;
  }
  // Fallback to string comparison for dates
  if (typeof fieldValue === 'string' && typeof targetValue === 'string') {
    return fieldValue > targetValue;
  }
  return false;
}

function lessThan(fieldValue: unknown, targetValue: unknown): boolean {
  const a = toNumber(fieldValue);
  const b = toNumber(targetValue);
  if (a !== null && b !== null) {
    return a < b;
  }
  // Fallback to string comparison for dates
  if (typeof fieldValue === 'string' && typeof targetValue === 'string') {
    return fieldValue < targetValue;
  }
  return false;
}

function greaterThanOrEquals(fieldValue: unknown, targetValue: unknown): boolean {
  return greaterThan(fieldValue, targetValue) || isEqual(fieldValue, targetValue);
}

function lessThanOrEquals(fieldValue: unknown, targetValue: unknown): boolean {
  return lessThan(fieldValue, targetValue) || isEqual(fieldValue, targetValue);
}

function isEmpty(fieldValue: unknown): boolean {
  if (fieldValue === null || fieldValue === undefined) return true;
  if (typeof fieldValue === 'string') return fieldValue.trim() === '';
  if (Array.isArray(fieldValue)) return fieldValue.length === 0;
  if (typeof fieldValue === 'object') return Object.keys(fieldValue).length === 0;
  return false;
}

function isIn(fieldValue: unknown, targetValue: unknown): boolean {
  if (!Array.isArray(targetValue)) return false;
  return targetValue.some(item => isEqual(fieldValue, item));
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Filter records that match all conditions
 */
export function filterRecords<T extends Record<string, unknown>>(
  records: T[],
  conditions: AutomationCondition[]
): T[] {
  if (!conditions || conditions.length === 0) {
    return records;
  }

  return records.filter(record =>
    evaluateConditions(conditions, { record })
  );
}

/**
 * Validate condition syntax without evaluating
 */
export function validateCondition(condition: AutomationCondition): { valid: boolean; error?: string } {
  if (!condition.field) {
    return { valid: false, error: 'Field is required' };
  }

  const validOperators: ConditionOperator[] = [
    'equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with',
    'matches', 'greater_than', 'less_than', 'greater_than_or_equals', 'less_than_or_equals',
    'is_empty', 'is_not_empty', 'in', 'not_in'
  ];

  if (!validOperators.includes(condition.operator)) {
    return { valid: false, error: `Invalid operator: ${condition.operator}` };
  }

  // Some operators require a value
  const requiresValue: ConditionOperator[] = [
    'equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with',
    'matches', 'greater_than', 'less_than', 'greater_than_or_equals', 'less_than_or_equals',
    'in', 'not_in'
  ];

  if (requiresValue.includes(condition.operator) && condition.value === undefined) {
    return { valid: false, error: `Operator ${condition.operator} requires a value` };
  }

  // 'in' and 'not_in' require array values
  if ((condition.operator === 'in' || condition.operator === 'not_in') && !Array.isArray(condition.value)) {
    return { valid: false, error: `Operator ${condition.operator} requires an array value` };
  }

  return { valid: true };
}
