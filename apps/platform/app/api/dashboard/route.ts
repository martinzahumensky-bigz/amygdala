import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';
import { calculateTrustScore, calculateAggregateTrustIndex } from '@/lib/trust-calculator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = getAmygdalaClient();

    // Fetch assets count and stats
    const { data: assets, count: assetsCount, error: assetsError } = await supabase
      .from('assets')
      .select('*', { count: 'exact' });

    if (assetsError) {
      console.error('Assets fetch error:', assetsError);
    }

    // Calculate average quality - handle case where no assets have quality scores
    const assetsWithQuality = (assets || []).filter(a => a.quality_score !== null && a.quality_score !== undefined);
    const avgQuality = assetsWithQuality.length > 0
      ? assetsWithQuality.reduce((sum, a) => sum + (a.quality_score || 0), 0) / assetsWithQuality.length
      : 0;

    // Fetch issues stats
    const { data: issues, count: issuesCount } = await supabase
      .from('issues')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    const openIssues = issues?.filter(i => i.status === 'open' || i.status === 'investigating' || i.status === 'in_progress').length || 0;

    // Fetch agent runs to determine running agents
    const { data: runningRuns } = await supabase
      .from('agent_runs')
      .select('agent_name')
      .eq('status', 'running');

    const runningAgents = new Set(runningRuns?.map(r => r.agent_name) || []);

    // Get recent runs for agent stats
    const { data: recentRuns } = await supabase
      .from('agent_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);

    // Calculate trust index if we have assets
    let trustIndex = null;
    if (assets && assets.length > 0) {
      // Use stored trust scores if available, otherwise calculate
      const trustScores = assets.map(asset => {
        // If asset has stored trust score, use it for faster loading
        if (asset.trust_score_raw !== null && asset.trust_score_raw !== undefined) {
          return {
            rawScore: asset.trust_score_raw,
            stars: asset.trust_score_stars || Math.round(asset.trust_score_raw * 5),
            factors: {
              documentation: asset.trust_score_raw * 0.9,
              governance: asset.owner ? 0.8 : 0.3,
              quality: (asset.quality_score || 70) / 100,
              usage: asset.downstream_assets?.length > 0 ? 0.7 : 0.4,
              reliability: asset.fitness_status === 'green' ? 0.85 : asset.fitness_status === 'amber' ? 0.6 : 0.3,
              freshness: 0.65,
            },
            fitnessStatus: asset.fitness_status || 'amber',
          };
        }
        return calculateTrustScore(asset, issues || []);
      });
      trustIndex = calculateAggregateTrustIndex(trustScores);
    }

    // Get recent issues (top 5)
    const recentIssues = (issues || []).slice(0, 5).map(issue => ({
      id: issue.id,
      title: issue.title,
      asset: issue.affected_assets?.[0] || 'Unknown',
      severity: issue.severity,
      status: issue.status,
      agent: issue.created_by,
      created_at: issue.created_at,
    }));

    // Get agent status
    const agentConfigs = [
      { name: 'spotter', displayName: 'Spotter', description: 'Detects anomalies in reports', color: 'bg-cyan-500' },
      { name: 'debugger', displayName: 'Debugger', description: 'Investigates and finds root causes', color: 'bg-orange-500' },
    ];

    const agentStatus = agentConfigs.map(config => {
      const lastRun = recentRuns?.find(r => r.agent_name === config.name);
      return {
        ...config,
        isRunning: runningAgents.has(config.name),
        lastRun: lastRun ? {
          started_at: lastRun.started_at,
          status: lastRun.status,
          issuesCreated: lastRun.results?.issuesCreated || 0,
        } : null,
      };
    });

    // Get top assets by quality issues (lowest quality)
    const topAssets = (assets || [])
      .filter(a => a.quality_score !== null)
      .sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0))
      .slice(0, 5)
      .map(asset => ({
        id: asset.id,
        name: asset.name,
        layer: asset.layer,
        quality: asset.quality_score,
        fitnessStatus: asset.fitness_status,
        tags: asset.tags || [],
      }));

    // Fitness distribution
    const fitnessDistribution = {
      green: assets?.filter(a => a.fitness_status === 'green').length || 0,
      amber: assets?.filter(a => a.fitness_status === 'amber').length || 0,
      red: assets?.filter(a => a.fitness_status === 'red').length || 0,
    };

    return NextResponse.json({
      stats: {
        totalAssets: assetsCount || 0,
        openIssues,
        totalIssues: issuesCount || 0,
        runningAgents: runningAgents.size,
        avgQuality: Math.round(avgQuality || 0),
      },
      trustIndex,
      recentIssues,
      agentStatus,
      topAssets,
      fitnessDistribution,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
// Tue Jan 27 11:43:31 CET 2026
