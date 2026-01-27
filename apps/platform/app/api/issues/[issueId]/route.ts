import { NextResponse } from 'next/server';
import { getAmygdalaClient, getMeridianClient } from '@/lib/supabase/client';

interface RouteParams {
  params: Promise<{ issueId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { issueId } = await params;

    const supabase = getAmygdalaClient();
    const meridianClient = getMeridianClient();

    // Fetch the issue
    const { data: issue, error: issueError } = await supabase
      .from('issues')
      .select('*')
      .eq('id', issueId)
      .single();

    if (issueError || !issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Get agent logs related to this issue (from the run that created it)
    const { data: relatedLogs } = await supabase
      .from('agent_logs')
      .select('*')
      .eq('agent_name', issue.created_by)
      .ilike('summary', `%${issue.title.split(' ').slice(0, 3).join('%')}%`)
      .order('timestamp', { ascending: false })
      .limit(10);

    // Extract agent reasoning from the issue metadata or logs
    const agentReasoning = extractAgentReasoning(issue, relatedLogs || []);

    // Fetch sample records if issue has metadata with table info
    let sampleRecords: Record<string, unknown>[] = [];
    if (issue.metadata?.table || issue.affected_assets?.[0]) {
      const tableName = issue.metadata?.table || issue.affected_assets?.[0];
      const checkType = issue.metadata?.checkType;

      try {
        sampleRecords = await fetchSampleRecords(meridianClient, tableName, checkType, issue.metadata);
      } catch (e) {
        console.error('Failed to fetch sample records:', e);
      }
    }

    // Get affected assets details
    const affectedAssetIds = issue.affected_assets || [];
    let affectedAssets: any[] = [];
    if (affectedAssetIds.length > 0) {
      const { data: assets } = await supabase
        .from('assets')
        .select('id, name, asset_type, layer, fitness_status, quality_score')
        .in('name', affectedAssetIds);
      affectedAssets = assets || [];
    }

    // Get activity history (simulated from status changes)
    const activities = generateActivityHistory(issue);

    // Generate recommendations based on issue type
    const recommendations = generateRecommendations(issue);

    return NextResponse.json({
      issue,
      agentReasoning,
      sampleRecords,
      affectedAssets,
      relatedLogs: relatedLogs || [],
      activities,
      recommendations,
    });
  } catch (error) {
    console.error('Issue detail error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { issueId } = await params;
    const body = await request.json();
    const { status, assigned_to, resolution, severity } = body;

    const supabase = getAmygdalaClient();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updates.status = status;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (resolution !== undefined) updates.resolution = resolution;
    if (severity) updates.severity = severity;

    if (status === 'resolved' || status === 'closed') {
      updates.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('issues')
      .update(updates)
      .eq('id', issueId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update issue: ${error.message}`);
    }

    return NextResponse.json({ issue: data });
  } catch (error) {
    console.error('Issue update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function extractAgentReasoning(issue: any, logs: any[]) {
  const metadata = issue.metadata || {};

  return {
    detectedBy: issue.created_by,
    checkType: metadata.checkType || issue.issue_type,
    threshold: metadata.threshold,
    actualValue: metadata.value,
    column: metadata.column,
    table: metadata.table || issue.affected_assets?.[0],
    detectionMethod: getDetectionMethod(metadata.checkType || issue.issue_type),
    details: metadata,
  };
}

function getDetectionMethod(checkType: string): string {
  switch (checkType) {
    case 'null_rate':
      return 'Column null percentage analysis';
    case 'outlier':
      return 'Statistical outlier detection (z-score)';
    case 'invalid_reference':
      return 'Foreign key validation';
    case 'freshness':
      return 'Data freshness monitoring';
    case 'quality_failure':
      return 'Data quality rule check';
    case 'missing_data':
      return 'Data completeness analysis';
    case 'missing_reference':
      return 'Reference integrity check';
    default:
      return 'Automated anomaly detection';
  }
}

async function fetchSampleRecords(
  client: any,
  tableName: string,
  checkType: string,
  metadata: any
): Promise<Record<string, unknown>[]> {
  // Clean table name (remove schema prefix if present)
  const cleanTableName = tableName.split('.').pop() || tableName;

  try {
    let query = client.from(cleanTableName).select('*').limit(5);

    // Add filters based on check type
    if (checkType === 'null_rate' && metadata?.column) {
      query = query.is(metadata.column, null);
    } else if (checkType === 'invalid_reference' && metadata?.column === 'branch_id') {
      // Get records with unknown branches
      const { data } = await client.from(cleanTableName).select('*').limit(1000);
      const { data: validBranches } = await client.from('ref_branches').select('branch_id');

      if (data && validBranches) {
        const validIds = new Set(validBranches.map((b: any) => b.branch_id));
        return data
          .filter((row: any) => row.branch_id && !validIds.has(row.branch_id))
          .slice(0, 5);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  } catch {
    return [];
  }
}

function generateActivityHistory(issue: any) {
  const activities = [
    {
      id: '1',
      action: 'Issue created',
      actor: issue.created_by,
      timestamp: issue.created_at,
      details: `Detected by ${issue.created_by} agent`,
    },
  ];

  if (issue.status === 'investigating' || ['in_progress', 'resolved', 'closed'].includes(issue.status)) {
    activities.push({
      id: '2',
      action: 'Status changed to investigating',
      actor: issue.assigned_to || 'System',
      timestamp: issue.updated_at,
      details: 'Investigation started',
    });
  }

  if (['in_progress', 'resolved', 'closed'].includes(issue.status)) {
    activities.push({
      id: '3',
      action: 'Status changed to in progress',
      actor: issue.assigned_to || 'System',
      timestamp: issue.updated_at,
      details: 'Work in progress',
    });
  }

  if (['resolved', 'closed'].includes(issue.status)) {
    activities.push({
      id: '4',
      action: 'Issue resolved',
      actor: issue.resolved_by || issue.assigned_to || 'System',
      timestamp: issue.resolved_at || issue.updated_at,
      details: issue.resolution || 'Issue resolved',
    });
  }

  return activities;
}

function generateRecommendations(issue: any): string[] {
  const recommendations: string[] = [];
  const checkType = issue.metadata?.checkType || issue.issue_type;

  switch (checkType) {
    case 'null_rate':
      recommendations.push('Review data ingestion pipelines for this column');
      recommendations.push('Consider adding NOT NULL constraint or default value');
      recommendations.push('Check upstream data sources for missing data');
      break;
    case 'outlier':
      recommendations.push('Investigate individual outlier records');
      recommendations.push('Review business rules for acceptable value ranges');
      recommendations.push('Consider adding data validation at ingestion');
      break;
    case 'invalid_reference':
      recommendations.push('Sync reference data with source systems');
      recommendations.push('Add foreign key constraints to prevent future issues');
      recommendations.push('Review data integration mappings');
      break;
    case 'freshness':
      recommendations.push('Check pipeline execution logs for failures');
      recommendations.push('Verify source data availability');
      recommendations.push('Review pipeline scheduling configuration');
      break;
    case 'ownership_missing':
      recommendations.push('Assign a data owner from the business team');
      recommendations.push('Designate a technical steward for data quality');
      recommendations.push('Document business context and usage');
      break;
    default:
      recommendations.push('Review data quality metrics for affected assets');
      recommendations.push('Consult with data engineering team');
  }

  return recommendations;
}
