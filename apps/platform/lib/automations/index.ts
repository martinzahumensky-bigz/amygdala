/**
 * Automation Agent Module
 * FEAT-023: Custom Trigger-Action Workflows
 */

export { AutomationEngine, getAutomationEngine } from './engine';
export type { AutomationEngineOptions } from './engine';

export { parseTokens, parseTokensDeep, extractTokenPaths, validateTokens } from './tokenParser';
export type { TokenContext } from './tokenParser';

export { evaluateCondition, evaluateConditions, filterRecords, validateCondition } from './evaluator';
export type { EvaluationContext } from './evaluator';

export { executeAction, executeActions } from './actions';
export type { ActionExecutionContext } from './actions';
