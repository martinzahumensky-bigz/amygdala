import { NextResponse } from 'next/server';

const PLATFORM_URL = process.env.PLATFORM_URL || 'http://localhost:3002';

export const dynamic = 'force-dynamic';

interface AnalysisRequest {
  currentSnapshot: any;
  previousSnapshot?: any;
  assetName?: string;
  reportType?: string;
}

interface AIAnomaly {
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  details?: string;
  affectedData?: string;
}

interface AnalysisResult {
  anomalies: AIAnomaly[];
  summary: string;
  trustImpact: 'none' | 'minor' | 'moderate' | 'severe';
  recommendations: string[];
  comparisonInsights?: string[];
}

export async function POST(request: Request) {
  try {
    const body: AnalysisRequest = await request.json();
    const { currentSnapshot, previousSnapshot, assetName, reportType } = body;

    if (!currentSnapshot) {
      return NextResponse.json(
        { error: 'currentSnapshot is required' },
        { status: 400 }
      );
    }

    // Build the analysis prompt
    const prompt = buildAnalysisPrompt(currentSnapshot, previousSnapshot, assetName, reportType);

    // Call the Platform's chat API for AI analysis
    try {
      const response = await fetch(`${PLATFORM_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          context: {
            type: 'visual_analysis',
            assetName,
          },
        }),
      });

      if (response.ok) {
        const chatResult = await response.json();
        const aiResponse = chatResult.response || chatResult.message || '';

        // Parse the AI response into structured format
        const analysis = parseAIResponse(aiResponse, currentSnapshot, previousSnapshot);

        return NextResponse.json({
          success: true,
          analysis,
        });
      }
    } catch (apiError) {
      console.error('Platform API error:', apiError);
    }

    // Fallback: Run basic heuristic analysis if AI is unavailable
    const fallbackAnalysis = runHeuristicAnalysis(currentSnapshot, previousSnapshot);

    return NextResponse.json({
      success: true,
      analysis: fallbackAnalysis,
      note: 'AI analysis unavailable, using heuristic analysis',
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

function buildAnalysisPrompt(
  currentSnapshot: any,
  previousSnapshot: any | undefined,
  assetName: string | undefined,
  reportType: string | undefined
): string {
  let prompt = `You are a data quality analyst reviewing a business report. Analyze the following extracted data for anomalies, suspicious patterns, or data quality issues.

## Report Context
- Report Type: ${reportType || 'Unknown'}
- Data Asset: ${assetName || 'Unknown'}
- Page Title: ${currentSnapshot.pageTitle || 'Unknown'}
- Extraction Time: ${currentSnapshot.extractedAt}

## Current KPIs (${currentSnapshot.kpis?.length || 0} found)
${JSON.stringify(currentSnapshot.kpis || [], null, 2)}

## Tables Summary (${currentSnapshot.tables?.length || 0} tables)
${currentSnapshot.tables?.map((t: any) => `- ${t.id}: ${t.rowCount} rows, columns: ${t.headers.join(', ')}`).join('\n') || 'No tables'}

## Active Alerts on Page
${currentSnapshot.alerts?.length > 0 ? currentSnapshot.alerts.join('\n') : 'No alerts detected'}

## Freshness Indicators
${currentSnapshot.freshnessIndicators?.join('\n') || 'None detected'}
`;

  if (previousSnapshot) {
    prompt += `
## COMPARISON WITH PREVIOUS SNAPSHOT
Previous snapshot from: ${previousSnapshot.extractedAt}

### Previous KPIs
${JSON.stringify(previousSnapshot.kpis || [], null, 2)}

### Previous Alerts
${previousSnapshot.alerts?.join('\n') || 'None'}

Please compare the current data with the previous snapshot and identify:
1. Significant changes in KPI values (especially drops or spikes > 20%)
2. New alerts that appeared
3. Changes in data freshness
4. Any suspicious patterns when comparing the two snapshots
`;
  }

  prompt += `
## ANALYSIS TASK
Please analyze this data and respond with a JSON object containing:
{
  "anomalies": [
    {
      "severity": "critical|warning|info",
      "type": "value_spike|value_drop|missing_data|stale_data|unknown_reference|data_inconsistency",
      "message": "Brief description of the issue",
      "details": "More detailed explanation",
      "affectedData": "Which KPI or data point is affected"
    }
  ],
  "summary": "1-2 sentence summary of data quality status",
  "trustImpact": "none|minor|moderate|severe",
  "recommendations": ["List of recommended actions"],
  "comparisonInsights": ["Insights from comparing with previous snapshot (if available)"]
}

Focus on finding:
- Unusually high or low values (outliers)
- Suspicious patterns (like all zeros, negative values where unexpected)
- Missing or incomplete data indicators
- Signs of stale or outdated data
- Any [UNKNOWN] or N/A values that might indicate data quality issues
- Sudden large changes compared to previous snapshot

Respond ONLY with the JSON object, no additional text.`;

  return prompt;
}

function parseAIResponse(
  aiResponse: string,
  currentSnapshot: any,
  previousSnapshot: any | undefined
): AnalysisResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        anomalies: parsed.anomalies || [],
        summary: parsed.summary || 'Analysis complete.',
        trustImpact: parsed.trustImpact || 'none',
        recommendations: parsed.recommendations || [],
        comparisonInsights: parsed.comparisonInsights,
      };
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }

  // Return a basic analysis if parsing fails
  return runHeuristicAnalysis(currentSnapshot, previousSnapshot);
}

function runHeuristicAnalysis(
  currentSnapshot: any,
  previousSnapshot: any | undefined
): AnalysisResult {
  const anomalies: AIAnomaly[] = [];
  const recommendations: string[] = [];
  const comparisonInsights: string[] = [];

  // Check for suspicious KPI values
  for (const kpi of currentSnapshot.kpis || []) {
    // Check for zero values in revenue/amount KPIs
    if (
      kpi.rawValue === 0 &&
      (kpi.label.toLowerCase().includes('revenue') ||
        kpi.label.toLowerCase().includes('amount') ||
        kpi.label.toLowerCase().includes('total'))
    ) {
      anomalies.push({
        severity: 'warning',
        type: 'value_drop',
        message: `Zero value detected for ${kpi.label}`,
        details: 'A zero value in a financial metric may indicate missing data or a data pipeline issue.',
        affectedData: kpi.label,
      });
    }

    // Check for negative values where unexpected
    if (
      kpi.rawValue !== null &&
      kpi.rawValue < 0 &&
      !kpi.label.toLowerCase().includes('change') &&
      !kpi.label.toLowerCase().includes('variance')
    ) {
      anomalies.push({
        severity: 'info',
        type: 'data_inconsistency',
        message: `Negative value (${kpi.value}) for ${kpi.label}`,
        affectedData: kpi.label,
      });
    }
  }

  // Check alerts
  if (currentSnapshot.alerts?.length > 0) {
    for (const alert of currentSnapshot.alerts) {
      if (alert.toLowerCase().includes('unknown') || alert.toLowerCase().includes('missing')) {
        anomalies.push({
          severity: 'warning',
          type: 'unknown_reference',
          message: 'Unknown or missing data detected',
          details: alert.slice(0, 200),
        });
      }
    }
  }

  // Compare with previous snapshot
  if (previousSnapshot) {
    const prevKpiMap = new Map(
      (previousSnapshot.kpis || []).map((k: any) => [k.label.toLowerCase(), k])
    );

    for (const kpi of currentSnapshot.kpis || []) {
      const prevKpi = prevKpiMap.get(kpi.label.toLowerCase());
      if (prevKpi && prevKpi.rawValue !== null && kpi.rawValue !== null && prevKpi.rawValue !== 0) {
        const changePercent = ((kpi.rawValue - prevKpi.rawValue) / Math.abs(prevKpi.rawValue)) * 100;

        if (Math.abs(changePercent) > 50) {
          anomalies.push({
            severity: changePercent < -50 ? 'critical' : 'warning',
            type: changePercent < 0 ? 'value_drop' : 'value_spike',
            message: `${kpi.label} changed by ${changePercent.toFixed(1)}%`,
            details: `Previous: ${prevKpi.value}, Current: ${kpi.value}`,
            affectedData: kpi.label,
          });
          comparisonInsights.push(
            `${kpi.label}: ${prevKpi.value} → ${kpi.value} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%)`
          );
        }
      }
    }

    // Check for new alerts
    const prevAlertSet = new Set(previousSnapshot.alerts || []);
    const newAlerts = (currentSnapshot.alerts || []).filter((a: string) => !prevAlertSet.has(a));
    if (newAlerts.length > 0) {
      comparisonInsights.push(`${newAlerts.length} new alert(s) appeared since last check`);
    }
  }

  // Determine trust impact
  let trustImpact: 'none' | 'minor' | 'moderate' | 'severe' = 'none';
  const criticalCount = anomalies.filter((a) => a.severity === 'critical').length;
  const warningCount = anomalies.filter((a) => a.severity === 'warning').length;

  if (criticalCount > 0) {
    trustImpact = 'severe';
  } else if (warningCount > 2) {
    trustImpact = 'moderate';
  } else if (warningCount > 0) {
    trustImpact = 'minor';
  }

  // Generate recommendations
  if (anomalies.length === 0) {
    recommendations.push('Data appears healthy. Continue regular monitoring.');
  } else {
    if (anomalies.some((a) => a.type === 'value_drop')) {
      recommendations.push('Investigate significant value changes with data engineering team.');
    }
    if (anomalies.some((a) => a.type === 'unknown_reference')) {
      recommendations.push('Review reference data for completeness.');
    }
    if (anomalies.some((a) => a.type === 'stale_data')) {
      recommendations.push('Check data pipeline freshness and scheduling.');
    }
  }

  // Build summary
  let summary = '';
  if (anomalies.length === 0) {
    summary = 'No significant data quality issues detected.';
  } else if (criticalCount > 0) {
    summary = `Found ${criticalCount} critical issue(s) requiring immediate attention.`;
  } else {
    summary = `Found ${anomalies.length} potential data quality concern(s).`;
  }

  return {
    anomalies,
    summary,
    trustImpact,
    recommendations,
    comparisonInsights: comparisonInsights.length > 0 ? comparisonInsights : undefined,
  };
}
