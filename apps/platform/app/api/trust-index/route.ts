import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';
import {
  calculateTrustScore,
  calculateAggregateTrustIndex,
  TrustScore,
} from '@/lib/trust-calculator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');
    const recalculate = searchParams.get('recalculate') === 'true';

    const supabase = getAmygdalaClient();

    // Fetch assets
    let assetsQuery = supabase.from('assets').select('*');
    if (assetId) {
      assetsQuery = assetsQuery.eq('id', assetId);
    }

    const { data: assets, error: assetsError } = await assetsQuery;
    if (assetsError) {
      throw new Error(`Failed to fetch assets: ${assetsError.message}`);
    }

    // Fetch issues for quality scoring
    const { data: issues } = await supabase
      .from('issues')
      .select('*')
      .in('status', ['open', 'investigating', 'in_progress']);

    // Fetch recent agent runs for reliability scoring
    const { data: agentRuns } = await supabase
      .from('agent_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);

    // Calculate trust scores for each asset
    const trustScores: (TrustScore & { assetId: string; assetName: string })[] = [];

    for (const asset of assets || []) {
      const score = calculateTrustScore(asset, issues || [], agentRuns || []);
      trustScores.push({
        ...score,
        assetId: asset.id,
        assetName: asset.name,
      });

      // Optionally update the asset with the new trust score
      if (recalculate) {
        await supabase
          .from('assets')
          .update({
            trust_score_raw: score.rawScore,
            trust_score_stars: score.stars,
            trust_explanation: score.explanation,
            fitness_status: score.fitnessStatus,
          })
          .eq('id', asset.id);
      }
    }

    // Calculate aggregate statistics
    const aggregate = calculateAggregateTrustIndex(trustScores);

    // Get historical data (simplified - would normally query snapshots)
    const historicalData = generateMockHistoricalData();

    // Get factor trends
    const factorTrends = {
      documentation: { trend: 'stable', change: 0 },
      governance: { trend: 'improving', change: 0.05 },
      quality: { trend: 'stable', change: -0.02 },
      usage: { trend: 'improving', change: 0.03 },
      reliability: { trend: 'stable', change: 0 },
      freshness: { trend: 'declining', change: -0.04 },
    };

    return NextResponse.json({
      aggregate,
      assetScores: assetId ? trustScores[0] : trustScores,
      historicalData,
      factorTrends,
      assetCount: assets?.length || 0,
      issueCount: issues?.length || 0,
      lastCalculated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Trust index error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Generate mock historical data for the chart
function generateMockHistoricalData() {
  const data = [];
  const now = new Date();

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Simulate gradual improvement with some noise
    const baseScore = 0.65 + (30 - i) * 0.003;
    const noise = (Math.random() - 0.5) * 0.05;

    data.push({
      date: date.toISOString().split('T')[0],
      score: Math.min(1, Math.max(0, baseScore + noise)),
      documentation: baseScore + noise * 0.5,
      governance: baseScore + 0.05 + noise * 0.3,
      quality: baseScore - 0.05 + noise * 0.8,
      usage: baseScore + 0.02 + noise * 0.4,
      reliability: baseScore + noise * 0.2,
      freshness: baseScore - 0.03 + noise * 0.6,
    });
  }

  return data;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assetIds, recalculate = false } = body;

    const supabase = getAmygdalaClient();

    // Fetch specified assets or all
    let assetsQuery = supabase.from('assets').select('*');
    if (assetIds && assetIds.length > 0) {
      assetsQuery = assetsQuery.in('id', assetIds);
    }

    const { data: assets, error } = await assetsQuery;
    if (error) {
      throw new Error(`Failed to fetch assets: ${error.message}`);
    }

    // Fetch issues
    const { data: issues } = await supabase
      .from('issues')
      .select('*')
      .in('status', ['open', 'investigating', 'in_progress']);

    // Calculate and update trust scores
    let updated = 0;
    const results = [];

    for (const asset of assets || []) {
      const score = calculateTrustScore(asset, issues || []);

      if (recalculate) {
        const { error: updateError } = await supabase
          .from('assets')
          .update({
            trust_score_raw: score.rawScore,
            trust_score_stars: score.stars,
            trust_explanation: score.explanation,
            fitness_status: score.fitnessStatus,
          })
          .eq('id', asset.id);

        if (!updateError) {
          updated++;
        }
      }

      results.push({
        assetId: asset.id,
        assetName: asset.name,
        ...score,
      });
    }

    return NextResponse.json({
      success: true,
      assetsProcessed: assets?.length || 0,
      assetsUpdated: updated,
      results,
    });
  } catch (error) {
    console.error('Trust calculation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
// Tue Jan 27 11:43:26 CET 2026
