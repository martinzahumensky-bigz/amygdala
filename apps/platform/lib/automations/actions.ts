/**
 * Action Handlers for Automation Agent
 * Executes automation actions (update_record, create_record, run_agent, etc.)
 */

import { getAmygdalaClient } from '@/lib/supabase/client';
import { getAgent } from '@/lib/agents';
import {
  AutomationAction,
  UpdateRecordAction,
  CreateRecordAction,
  SendNotificationAction,
  RunAgentAction,
  ExecuteWebhookAction,
  GenerateWithAIAction,
  DelayAction,
  ConditionalBranchAction,
  CheckAtaccamaDQAction,
  AutomationActionResult,
  AutomationEntityType,
} from '@amygdala/database';
import { parseTokensDeep, TokenContext } from './tokenParser';
import { evaluateConditions, EvaluationContext } from './evaluator';
import Anthropic from '@anthropic-ai/sdk';

export interface ActionExecutionContext {
  tokenContext: TokenContext;
  evaluationContext: EvaluationContext;
  previousResults: AutomationActionResult[];
  dryRun?: boolean;
}

/**
 * Execute a single action and return the result
 */
export async function executeAction(
  action: AutomationAction,
  context: ActionExecutionContext,
  actionIndex: number
): Promise<AutomationActionResult> {
  const startTime = Date.now();

  try {
    // Update token context with previous action result if available
    if (context.previousResults.length > 0) {
      const lastResult = context.previousResults[context.previousResults.length - 1];
      context.tokenContext.previous_action = {
        result: lastResult.result,
        status: lastResult.status,
      };
    }

    let result: unknown;

    switch (action.type) {
      case 'update_record':
        result = await executeUpdateRecord(action, context);
        break;

      case 'create_record':
        result = await executeCreateRecord(action, context);
        break;

      case 'send_notification':
        result = await executeSendNotification(action, context);
        break;

      case 'run_agent':
        result = await executeRunAgent(action, context);
        break;

      case 'execute_webhook':
        result = await executeWebhook(action, context);
        break;

      case 'generate_with_ai':
        result = await executeGenerateWithAI(action, context);
        break;

      case 'delay':
        result = await executeDelay(action, context);
        break;

      case 'conditional_branch':
        result = await executeConditionalBranch(action, context, actionIndex);
        break;

      case 'check_ataccama_dq':
        result = await executeCheckAtaccamaDQ(action, context);
        break;

      default:
        throw new Error(`Unknown action type: ${(action as AutomationAction).type}`);
    }

    return {
      actionType: action.type,
      actionIndex,
      status: 'success',
      result,
      duration_ms: Date.now() - startTime,
    };
  } catch (error) {
    return {
      actionType: action.type,
      actionIndex,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - startTime,
    };
  }
}

/**
 * Execute multiple actions in sequence
 */
export async function executeActions(
  actions: AutomationAction[],
  context: ActionExecutionContext
): Promise<AutomationActionResult[]> {
  const results: AutomationActionResult[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const result = await executeAction(action, { ...context, previousResults: results }, i);
    results.push(result);

    // Stop on failure unless configured to continue
    if (result.status === 'failed') {
      break;
    }
  }

  return results;
}

// ============================================
// Individual Action Executors
// ============================================

async function executeUpdateRecord(
  action: UpdateRecordAction,
  context: ActionExecutionContext
): Promise<unknown> {
  if (context.dryRun) {
    return { dryRun: true, action: 'update_record', updates: action.updates };
  }

  const supabase = getAmygdalaClient();

  // Determine target record
  let targetId: string | undefined;
  let entityType: AutomationEntityType = 'asset';

  if (action.target === 'trigger_record') {
    targetId = context.tokenContext.record?.id as string;
    // Infer entity type from trigger data
    entityType = (context.tokenContext.trigger?.data?.entityType as AutomationEntityType) || 'asset';
  } else if (action.relatedRecordQuery) {
    // Find related record (simplified - first match)
    entityType = action.relatedRecordQuery.entityType;
    // This would need more complex query logic for production
    throw new Error('Related record queries not yet implemented');
  }

  if (!targetId) {
    throw new Error('No target record ID found');
  }

  // Parse tokens in updates
  const parsedUpdates: Record<string, unknown> = {};
  for (const update of action.updates) {
    const parsedValue = parseTokensDeep(update.value, context.tokenContext);
    parsedUpdates[update.field] = parsedValue;
  }

  // Execute update based on entity type
  const tableName = getTableName(entityType);
  const { data, error } = await supabase
    .from(tableName)
    .update(parsedUpdates)
    .eq('id', targetId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update ${entityType}: ${error.message}`);
  }

  return { updated: true, entityType, id: targetId, data };
}

async function executeCreateRecord(
  action: CreateRecordAction,
  context: ActionExecutionContext
): Promise<unknown> {
  if (context.dryRun) {
    return { dryRun: true, action: 'create_record', entityType: action.entityType, data: action.data };
  }

  const supabase = getAmygdalaClient();

  // Parse tokens in data
  const parsedData = parseTokensDeep(action.data, context.tokenContext) as Record<string, unknown>;

  // Add created_by if not present
  if (!parsedData.created_by) {
    parsedData.created_by = 'automation';
  }

  const tableName = getTableName(action.entityType);
  const { data, error } = await supabase
    .from(tableName)
    .insert(parsedData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create ${action.entityType}: ${error.message}`);
  }

  return { created: true, entityType: action.entityType, id: data?.id, data };
}

async function executeSendNotification(
  action: SendNotificationAction,
  context: ActionExecutionContext
): Promise<unknown> {
  // Parse tokens in template
  const parsedBody = parseTokensDeep(action.template.body, context.tokenContext) as string;
  const parsedSubject = action.template.subject
    ? (parseTokensDeep(action.template.subject, context.tokenContext) as string)
    : undefined;

  if (context.dryRun) {
    return { dryRun: true, action: 'send_notification', channel: action.channel, body: parsedBody };
  }

  switch (action.channel) {
    case 'webhook':
      if (!action.webhookUrl) {
        throw new Error('Webhook URL is required for webhook notifications');
      }
      const webhookUrl = parseTokensDeep(action.webhookUrl, context.tokenContext) as string;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: parsedBody, subject: parsedSubject }),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      return { sent: true, channel: 'webhook', status: response.status };

    case 'slack':
      // For Slack, use webhookUrl as the Slack webhook
      const slackUrl = action.webhookUrl || process.env.SLACK_WEBHOOK_URL;
      if (!slackUrl) {
        throw new Error('Slack webhook URL is required');
      }

      const slackResponse = await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: parsedBody,
          channel: action.slackChannel,
        }),
      });

      if (!slackResponse.ok) {
        throw new Error(`Slack notification failed: ${slackResponse.status}`);
      }

      return { sent: true, channel: 'slack', slackChannel: action.slackChannel };

    case 'email':
      // Email would require an email service integration (Resend, SendGrid, etc.)
      console.log(`[Email Notification] To: ${action.recipients?.join(', ')}`);
      console.log(`Subject: ${parsedSubject}`);
      console.log(`Body: ${parsedBody}`);

      // For now, just log - would integrate with email service
      return { sent: false, channel: 'email', note: 'Email service not configured' };

    default:
      throw new Error(`Unknown notification channel: ${action.channel}`);
  }
}

async function executeRunAgent(
  action: RunAgentAction,
  context: ActionExecutionContext
): Promise<unknown> {
  if (context.dryRun) {
    return { dryRun: true, action: 'run_agent', agentName: action.agentName };
  }

  // Parse tokens in context
  const parsedContext = action.context
    ? (parseTokensDeep(action.context, context.tokenContext) as Record<string, unknown>)
    : {};

  // Get the agent
  const agentName = action.agentName.toLowerCase() as Parameters<typeof getAgent>[0];
  const agent = getAgent(agentName);

  if (!agent) {
    throw new Error(`Agent not found: ${action.agentName}`);
  }

  // Run the agent
  const result = await agent.run({
    ...parsedContext,
    triggeredBy: 'automation',
  });

  return {
    ran: true,
    agentName: action.agentName,
    runId: result.runId,
    success: result.success,
    stats: result.stats,
  };
}

async function executeWebhook(
  action: ExecuteWebhookAction,
  context: ActionExecutionContext
): Promise<unknown> {
  // Parse tokens in URL, headers, and body
  const parsedUrl = parseTokensDeep(action.url, context.tokenContext) as string;
  const parsedHeaders = action.headers
    ? (parseTokensDeep(action.headers, context.tokenContext) as Record<string, string>)
    : {};
  const parsedBody = action.body
    ? (parseTokensDeep(action.body, context.tokenContext) as Record<string, unknown>)
    : undefined;

  if (context.dryRun) {
    return { dryRun: true, action: 'execute_webhook', url: parsedUrl, method: action.method };
  }

  const fetchOptions: RequestInit = {
    method: action.method,
    headers: {
      'Content-Type': 'application/json',
      ...parsedHeaders,
    },
  };

  if (parsedBody && ['POST', 'PUT', 'PATCH'].includes(action.method)) {
    fetchOptions.body = JSON.stringify(parsedBody);
  }

  let lastError: Error | null = null;
  const maxRetries = action.retryOnFailure ? (action.retryCount || 3) : 1;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(parsedUrl, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let responseData: unknown;
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }

      return {
        executed: true,
        url: parsedUrl,
        method: action.method,
        status: response.status,
        response: responseData,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError || new Error('Webhook execution failed');
}

async function executeGenerateWithAI(
  action: GenerateWithAIAction,
  context: ActionExecutionContext
): Promise<unknown> {
  // Parse tokens in prompt
  const parsedPrompt = parseTokensDeep(action.prompt, context.tokenContext) as string;

  if (context.dryRun) {
    return { dryRun: true, action: 'generate_with_ai', prompt: parsedPrompt };
  }

  const anthropic = new Anthropic();

  let systemPrompt = 'You are a data quality assistant helping with automation tasks.';

  if (action.outputType === 'classification' && action.options?.choices) {
    systemPrompt += ` You must respond with ONLY one of these exact values: ${action.options.choices.join(', ')}. No other text.`;
  } else if (action.outputType === 'json') {
    systemPrompt += ' You must respond with valid JSON only, no markdown or explanation.';
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: action.options?.maxTokens || 256,
    system: systemPrompt,
    messages: [{ role: 'user', content: parsedPrompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from AI');
  }

  let result: unknown = content.text.trim();

  // Parse JSON if expected
  if (action.outputType === 'json') {
    try {
      result = JSON.parse(content.text);
    } catch {
      throw new Error('AI response was not valid JSON');
    }
  }

  // Validate classification
  if (action.outputType === 'classification' && action.options?.choices) {
    const normalizedResult = String(result).toLowerCase().trim();
    const validChoice = action.options.choices.find(
      choice => choice.toLowerCase() === normalizedResult
    );
    if (!validChoice) {
      // Try to find partial match
      const partialMatch = action.options.choices.find(choice =>
        normalizedResult.includes(choice.toLowerCase())
      );
      result = partialMatch || action.options.choices[0]; // Default to first choice
    } else {
      result = validChoice;
    }
  }

  return result;
}

async function executeDelay(
  action: DelayAction,
  context: ActionExecutionContext
): Promise<unknown> {
  if (context.dryRun) {
    return { dryRun: true, action: 'delay', duration: action.duration, unit: action.unit };
  }

  let ms = action.duration;
  switch (action.unit) {
    case 'seconds':
      ms = action.duration * 1000;
      break;
    case 'minutes':
      ms = action.duration * 60 * 1000;
      break;
    case 'hours':
      ms = action.duration * 60 * 60 * 1000;
      break;
  }

  // Cap delay at 5 minutes for safety
  ms = Math.min(ms, 5 * 60 * 1000);

  await new Promise(resolve => setTimeout(resolve, ms));

  return { delayed: true, duration_ms: ms };
}

async function executeConditionalBranch(
  action: ConditionalBranchAction,
  context: ActionExecutionContext,
  actionIndex: number
): Promise<unknown> {
  // Evaluate conditions
  const conditionsMet = evaluateConditions(action.conditions, context.evaluationContext);

  if (context.dryRun) {
    return {
      dryRun: true,
      action: 'conditional_branch',
      conditionsMet,
      branch: conditionsMet ? 'ifTrue' : 'ifFalse',
    };
  }

  // Execute appropriate branch
  const branchActions = conditionsMet ? action.ifTrue : (action.ifFalse || []);

  if (branchActions.length === 0) {
    return { executed: true, branch: conditionsMet ? 'ifTrue' : 'ifFalse', actions: 0 };
  }

  const branchResults = await executeActions(branchActions, context);

  return {
    executed: true,
    branch: conditionsMet ? 'ifTrue' : 'ifFalse',
    actions: branchResults.length,
    results: branchResults,
  };
}

async function executeCheckAtaccamaDQ(
  action: CheckAtaccamaDQAction,
  context: ActionExecutionContext
): Promise<unknown> {
  const { parseTokensDeep } = await import('./tokenParser');

  // Parse tokens in table names (in case they use {{record.name}} etc.)
  const tableNames = action.tables.map(t =>
    typeof t === 'string' ? (parseTokensDeep(t, context.tokenContext) as string) : t
  );

  if (context.dryRun) {
    return {
      dryRun: true,
      action: 'check_ataccama_dq',
      tables: tableNames,
      thresholds: action.thresholds,
    };
  }

  // Use the Analyst agent's mock data for demo
  // In production, this would connect to Ataccama MCP
  const MOCK_DQ_DATA: Record<string, { dqScore: number; source: string; owner?: string; lastProfiled?: string }> = {
    'CUSTOMER_360': { dqScore: 94.2, source: 'Snowflake / PROD_DW', owner: 'data-engineering@acme.com', lastProfiled: '2026-02-05T08:00:00Z' },
    'CUSTOMER_RAW': { dqScore: 78.5, source: 'Snowflake / STAGING', owner: 'ingestion-team@acme.com', lastProfiled: '2026-02-04T06:00:00Z' },
    'TRANSACTIONS_GOLD': { dqScore: 91.8, source: 'Snowflake / PROD_DW', owner: 'finance-data@acme.com', lastProfiled: '2026-02-05T07:00:00Z' },
    'REVENUE_DAILY': { dqScore: 88.3, source: 'Snowflake / PROD_DW', owner: 'bi-team@acme.com', lastProfiled: '2026-02-05T07:30:00Z' },
    'FRAUD_EVENTS': { dqScore: 96.5, source: 'Snowflake / SECURITY_DW', owner: 'security-team@acme.com', lastProfiled: '2026-02-05T08:00:00Z' },
    'BANK_TRANSACTIONS': { dqScore: 89.7, source: 'Snowflake / PROD_DW', owner: 'core-banking@acme.com', lastProfiled: '2026-02-05T06:00:00Z' },
    'CUSTOMER_LEGACY': { dqScore: 52.1, source: 'Oracle / LEGACY_DB', owner: 'legacy-support@acme.com', lastProfiled: '2025-12-15T14:00:00Z' },
  };

  const thresholds = {
    excellent: action.thresholds?.excellent ?? 90,
    good: action.thresholds?.good ?? 75,
    fair: action.thresholds?.fair ?? 60,
  };

  const failureThreshold = action.failureThreshold ?? 60;

  const results: Array<{
    table: string;
    found: boolean;
    dqScore?: number;
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
    source?: string;
    owner?: string;
    lastProfiled?: string;
    trusted: boolean;
  }> = [];

  const issuesCreated: string[] = [];

  for (const tableName of tableNames) {
    const upperName = tableName.toUpperCase();
    const data = MOCK_DQ_DATA[upperName];

    if (!data) {
      results.push({
        table: tableName,
        found: false,
        status: 'unknown',
        trusted: false,
      });
      continue;
    }

    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (data.dqScore >= thresholds.excellent) {
      status = 'excellent';
    } else if (data.dqScore >= thresholds.good) {
      status = 'good';
    } else if (data.dqScore >= thresholds.fair) {
      status = 'fair';
    } else {
      status = 'poor';
    }

    const trusted = data.dqScore >= failureThreshold;

    results.push({
      table: tableName,
      found: true,
      dqScore: data.dqScore,
      status,
      source: data.source,
      owner: data.owner,
      lastProfiled: data.lastProfiled,
      trusted,
    });

    // Create issue if DQ below threshold
    if (action.createIssueOnFailure && !trusted) {
      const supabase = getAmygdalaClient();
      const { data: issue } = await supabase
        .from('issues')
        .insert({
          title: `Low Data Quality: ${tableName} (${data.dqScore}%)`,
          description: `Automated DQ check found that ${tableName} has a data quality score of ${data.dqScore}%, which is below the threshold of ${failureThreshold}%. Source: ${data.source}. Owner: ${data.owner || 'Unknown'}.`,
          severity: data.dqScore < 50 ? 'critical' : 'high',
          issue_type: 'quality_failure',
          affected_assets: [tableName],
          created_by: 'automation',
          status: 'open',
        })
        .select('id')
        .single();

      if (issue) {
        issuesCreated.push(issue.id);
      }
    }
  }

  // Generate summary
  const summary = {
    totalTables: tableNames.length,
    tablesFound: results.filter(r => r.found).length,
    tablesNotFound: results.filter(r => !r.found).length,
    excellent: results.filter(r => r.status === 'excellent').length,
    good: results.filter(r => r.status === 'good').length,
    fair: results.filter(r => r.status === 'fair').length,
    poor: results.filter(r => r.status === 'poor').length,
    allTrusted: results.every(r => r.trusted),
    issuesCreated: issuesCreated.length,
  };

  // Build report text
  const reportLines = [
    `📊 **Data Quality Report** - ${new Date().toLocaleString()}`,
    '',
    `**Summary:** ${summary.tablesFound}/${summary.totalTables} tables checked`,
    `✅ Excellent: ${summary.excellent} | 🟢 Good: ${summary.good} | 🟡 Fair: ${summary.fair} | 🔴 Poor: ${summary.poor}`,
    '',
    '**Details:**',
  ];

  for (const r of results) {
    const icon = r.status === 'excellent' ? '✅' :
      r.status === 'good' ? '🟢' :
        r.status === 'fair' ? '🟡' :
          r.status === 'poor' ? '🔴' : '❓';

    if (r.found) {
      reportLines.push(`${icon} **${r.table}**: ${r.dqScore}% (${r.source})`);
    } else {
      reportLines.push(`❓ **${r.table}**: Not found in Ataccama catalog`);
    }
  }

  if (summary.issuesCreated > 0) {
    reportLines.push('', `⚠️ Created ${summary.issuesCreated} issue(s) for tables below threshold`);
  }

  return {
    checked: true,
    tables: tableNames,
    results,
    summary,
    report: reportLines.join('\n'),
    issuesCreated,
  };
}

// ============================================
// Helpers
// ============================================

function getTableName(entityType: AutomationEntityType | 'issue' | 'data_product'): string {
  switch (entityType) {
    case 'asset':
      return 'assets';
    case 'issue':
      return 'issues';
    case 'data_product':
      return 'data_products';
    case 'quality_rule':
      return 'quality_rules';
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}
