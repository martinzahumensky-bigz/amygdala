import { NextResponse } from 'next/server';
import { getAmygdalaClient, getMeridianClient } from '@/lib/supabase/client';
import { calculateTrustIndex } from '@/lib/trust-calculator';

interface RouteParams {
  params: Promise<{ assetId: string }>;
}

interface TrustFactor {
  name: string;
  score: number;
  weight: number;
  status: 'green' | 'amber' | 'red';
  recommendation?: string;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { assetId } = await params;

    const supabase = getAmygdalaClient();
    const meridianClient = getMeridianClient();

    // Fetch the asset
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Calculate trust breakdown
    const trustBreakdown = await calculateTrustBreakdown(asset, supabase);

    // Get open issues affecting this asset
    const { data: issues } = await supabase
      .from('issues')
      .select('*')
      .contains('affected_assets', [asset.name])
      .in('status', ['open', 'investigating', 'in_progress'])
      .order('severity', { ascending: true })
      .limit(10);

    // Get lineage (upstream and downstream assets)
    const lineage = await getLineage(asset, supabase);

    // Get sample data if asset has a source table
    let sampleData = { columns: [] as any[], rows: [] as any[], total: 0 };
    if (asset.source_table) {
      sampleData = await fetchSampleData(meridianClient, asset.source_table);
    }

    // Generate recommendations based on trust factors
    const recommendations = generateRecommendations(trustBreakdown.factors);

    return NextResponse.json({
      asset,
      trustBreakdown: {
        overall: trustBreakdown.overall,
        factors: trustBreakdown.factors,
        recommendations,
      },
      issues: issues || [],
      lineage,
      sampleData,
    });
  } catch (error) {
    console.error('Asset detail error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { assetId } = await params;
    const body = await request.json();
    const { owner, steward, description, business_context, tags } = body;

    const supabase = getAmygdalaClient();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (owner !== undefined) updates.owner = owner;
    if (steward !== undefined) updates.steward = steward;
    if (description !== undefined) updates.description = description;
    if (business_context !== undefined) updates.business_context = business_context;
    if (tags !== undefined) updates.tags = tags;

    const { data, error } = await supabase
      .from('assets')
      .update(updates)
      .eq('id', assetId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update asset: ${error.message}`);
    }

    return NextResponse.json({ asset: data });
  } catch (error) {
    console.error('Asset update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function calculateTrustBreakdown(
  asset: any,
  supabase: any
): Promise<{ overall: number; factors: TrustFactor[] }> {
  // Calculate individual factor scores
  const factors: TrustFactor[] = [];

  // Documentation (15%)
  const docScore = calculateDocumentationScore(asset);
  factors.push({
    name: 'Documentation',
    score: docScore,
    weight: 15,
    status: docScore >= 70 ? 'green' : docScore >= 40 ? 'amber' : 'red',
    recommendation: docScore < 70 ? 'Add description and business context to improve documentation' : undefined,
  });

  // Governance (20%)
  const govScore = calculateGovernanceScore(asset);
  factors.push({
    name: 'Governance',
    score: govScore,
    weight: 20,
    status: govScore >= 70 ? 'green' : govScore >= 40 ? 'amber' : 'red',
    recommendation: govScore < 70 ? 'Assign owner and data steward for governance' : undefined,
  });

  // Quality (25%)
  const qualityScore = asset.quality_score || 50;
  const { count: openIssueCount } = await supabase
    .from('issues')
    .select('*', { count: 'exact', head: true })
    .contains('affected_assets', [asset.name])
    .in('status', ['open', 'investigating', 'in_progress']);

  const adjustedQualityScore = Math.max(0, qualityScore - (openIssueCount || 0) * 5);
  factors.push({
    name: 'Quality',
    score: adjustedQualityScore,
    weight: 25,
    status: adjustedQualityScore >= 70 ? 'green' : adjustedQualityScore >= 40 ? 'amber' : 'red',
    recommendation: adjustedQualityScore < 70
      ? `Resolve ${openIssueCount || 0} open issues affecting this asset`
      : undefined,
  });

  // Usage (15%)
  const usageScore = calculateUsageScore(asset);
  factors.push({
    name: 'Usage',
    score: usageScore,
    weight: 15,
    status: usageScore >= 70 ? 'green' : usageScore >= 40 ? 'amber' : 'red',
    recommendation: usageScore < 70 ? 'Document downstream consumers and usage patterns' : undefined,
  });

  // Reliability (15%)
  const reliabilityScore = asset.fitness_status === 'green' ? 90 : asset.fitness_status === 'amber' ? 60 : 30;
  factors.push({
    name: 'Reliability',
    score: reliabilityScore,
    weight: 15,
    status: reliabilityScore >= 70 ? 'green' : reliabilityScore >= 40 ? 'amber' : 'red',
    recommendation: reliabilityScore < 70 ? 'Investigate recent failures and improve stability' : undefined,
  });

  // Freshness (10%)
  const freshnessScore = calculateFreshnessScore(asset);
  factors.push({
    name: 'Freshness',
    score: freshnessScore,
    weight: 10,
    status: freshnessScore >= 70 ? 'green' : freshnessScore >= 40 ? 'amber' : 'red',
    recommendation: freshnessScore < 70 ? 'Check refresh schedule and data pipeline status' : undefined,
  });

  // Calculate overall score
  const overall = factors.reduce((sum, f) => sum + (f.score * f.weight) / 100, 0);

  return { overall, factors };
}

function calculateDocumentationScore(asset: any): number {
  let score = 0;
  if (asset.description && asset.description.length > 20) score += 40;
  if (asset.business_context && asset.business_context.length > 20) score += 30;
  if (asset.tags && asset.tags.length > 0) score += 15;
  if (asset.upstream_assets && asset.upstream_assets.length > 0) score += 15;
  return Math.min(100, score);
}

function calculateGovernanceScore(asset: any): number {
  let score = 0;
  if (asset.owner) score += 50;
  if (asset.steward) score += 30;
  if (asset.created_by) score += 20;
  return Math.min(100, score);
}

function calculateUsageScore(asset: any): number {
  let score = 30; // Base score
  if (asset.downstream_assets && asset.downstream_assets.length > 0) {
    score += Math.min(40, asset.downstream_assets.length * 10);
  }
  if (asset.layer === 'consumer' || asset.layer === 'gold') score += 30;
  return Math.min(100, score);
}

function calculateFreshnessScore(asset: any): number {
  if (!asset.updated_at) return 50;

  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(asset.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceUpdate < 1) return 100;
  if (daysSinceUpdate < 3) return 85;
  if (daysSinceUpdate < 7) return 70;
  if (daysSinceUpdate < 14) return 50;
  return 30;
}

async function getLineage(
  asset: any,
  supabase: any
): Promise<{ upstream: any[]; downstream: any[] }> {
  const upstream: any[] = [];
  const downstream: any[] = [];

  // Get upstream assets
  if (asset.upstream_assets && asset.upstream_assets.length > 0) {
    const { data } = await supabase
      .from('assets')
      .select('id, name, asset_type, layer, fitness_status')
      .in('name', asset.upstream_assets);
    upstream.push(...(data || []));
  }

  // Get downstream assets
  if (asset.downstream_assets && asset.downstream_assets.length > 0) {
    const { data } = await supabase
      .from('assets')
      .select('id, name, asset_type, layer, fitness_status')
      .in('name', asset.downstream_assets);
    downstream.push(...(data || []));
  }

  // Also find assets that reference this one as upstream
  const { data: referencingAssets } = await supabase
    .from('assets')
    .select('id, name, asset_type, layer, fitness_status')
    .contains('upstream_assets', [asset.name]);

  if (referencingAssets) {
    for (const ref of referencingAssets) {
      if (!downstream.find((d) => d.id === ref.id)) {
        downstream.push(ref);
      }
    }
  }

  return { upstream, downstream };
}

async function fetchSampleData(
  client: any,
  sourceTable: string
): Promise<{ columns: any[]; rows: any[]; total: number }> {
  // Extract table name (remove schema prefix if present)
  const tableName = sourceTable.split('.').pop() || sourceTable;

  try {
    // Get row count
    const { count } = await client
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    // Get sample rows
    const { data: rows, error } = await client
      .from(tableName)
      .select('*')
      .limit(10);

    if (error || !rows) {
      return { columns: [], rows: [], total: 0 };
    }

    // Extract column info from first row
    const columns = rows.length > 0
      ? Object.keys(rows[0]).map((key) => ({
          name: key,
          type: typeof rows[0][key],
        }))
      : [];

    return {
      columns,
      rows,
      total: count || 0,
    };
  } catch {
    return { columns: [], rows: [], total: 0 };
  }
}

function generateRecommendations(factors: TrustFactor[]): string[] {
  return factors
    .filter((f) => f.recommendation)
    .sort((a, b) => a.score - b.score)
    .map((f) => f.recommendation!)
    .slice(0, 5);
}
