import { BaseAgent, AgentContext, AgentRunResult, DetectedIssue } from './base';
import { calculateTrustScore, TrustScore } from '../trust-calculator';

export interface TrustChangeEvent {
  assetId: string;
  assetName: string;
  previousScore: number;
  newScore: number;
  previousStars: number;
  newStars: number;
  change: number;
  changePercent: number;
  significantFactorChanges: {
    factor: string;
    previousValue: number;
    newValue: number;
    change: number;
  }[];
}

export interface TrustAgentRunContext extends AgentContext {
  forceRecalculate?: boolean;
  thresholds?: {
    dropAlertPercent?: number; // Alert if trust drops by this % (default 15)
    criticalDropPercent?: number; // Critical if drops by this % (default 25)
    lowTrustThreshold?: number; // Alert for assets below this (default 0.4)
  };
}

export class TrustAgent extends BaseAgent {
  constructor() {
    super('Trust', 'Calculates and monitors trust scores for data assets');
  }

  get systemPrompt(): string {
    return `You are the Trust Agent for Amygdala, responsible for monitoring data trust across the organization.

Your role is to:
1. Calculate trust scores for all data assets based on 6 factors
2. Detect significant changes in trust (drops or improvements)
3. Create issues when trust drops below thresholds
4. Generate recommendations for improving trust

Trust Factors (weighted):
- Documentation (15%): Description, business context, lineage
- Governance (20%): Owner, steward, classification
- Quality (25%): Quality scores, active issues
- Usage (15%): Downstream consumption, active users
- Reliability (15%): Pipeline stability, issue history
- Freshness (10%): Data recency, refresh schedules

Fitness Status:
- GREEN (≥75%): Asset is fit for use
- AMBER (50-74%): Use with caution, some improvements needed
- RED (<50%): Not recommended for critical decisions

When analyzing trust changes, consider:
- What factors contributed most to the change?
- Is this a temporary issue or systemic problem?
- What actions would most improve the score?`;
  }

  async run(context?: TrustAgentRunContext): Promise<AgentRunResult> {
    const startTime = Date.now();
    const runId = await this.startRun(context);

    const stats = {
      assets_evaluated: 0,
      scores_updated: 0,
      trust_drops_detected: 0,
      trust_improvements_detected: 0,
      issues_created: 0,
      low_trust_assets: 0,
      average_trust: 0,
    };

    const errors: string[] = [];
    let issuesCreated = 0;

    const thresholds = {
      dropAlertPercent: context?.thresholds?.dropAlertPercent ?? 15,
      criticalDropPercent: context?.thresholds?.criticalDropPercent ?? 25,
      lowTrustThreshold: context?.thresholds?.lowTrustThreshold ?? 0.4,
    };

    try {
      await this.log('run_started', 'Trust agent run started', { thresholds });

      // Fetch all assets with their current trust scores
      const { data: assets, error: assetsError } = await this.supabase
        .from('assets')
        .select('*');

      if (assetsError) {
        throw new Error(`Failed to fetch assets: ${assetsError.message}`);
      }

      if (!assets || assets.length === 0) {
        await this.log('no_assets', 'No assets found to evaluate');
        await this.completeRun(runId, { stats }, true);
        return {
          success: true,
          runId,
          stats,
          issuesCreated: 0,
          errors: [],
          duration: Date.now() - startTime,
        };
      }

      // Fetch active issues for quality scoring
      const { data: issues } = await this.supabase
        .from('issues')
        .select('*')
        .in('status', ['open', 'investigating', 'in_progress']);

      // Fetch recent agent runs for reliability scoring
      const { data: agentRuns } = await this.supabase
        .from('agent_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      const trustChanges: TrustChangeEvent[] = [];
      let totalTrust = 0;

      // Calculate trust for each asset
      for (const asset of assets) {
        stats.assets_evaluated++;

        const previousScore = asset.trust_score_raw ?? 0;
        const previousStars = asset.trust_score_stars ?? 0;

        // Calculate new trust score
        const newTrustScore = calculateTrustScore(asset, issues || [], agentRuns || []);
        totalTrust += newTrustScore.rawScore;

        // Check if score changed significantly
        const change = newTrustScore.rawScore - previousScore;
        const changePercent = previousScore > 0
          ? Math.abs(change / previousScore) * 100
          : (newTrustScore.rawScore > 0 ? 100 : 0);

        // Detect significant changes
        if (Math.abs(changePercent) >= 5 || previousScore === 0) {
          const significantFactorChanges = this.detectSignificantFactorChanges(
            asset,
            newTrustScore
          );

          trustChanges.push({
            assetId: asset.id,
            assetName: asset.name,
            previousScore,
            newScore: newTrustScore.rawScore,
            previousStars,
            newStars: newTrustScore.stars,
            change,
            changePercent,
            significantFactorChanges,
          });

          if (change < 0) {
            stats.trust_drops_detected++;
          } else if (change > 0) {
            stats.trust_improvements_detected++;
          }
        }

        // Update asset with new trust score
        const { error: updateError } = await this.supabase
          .from('assets')
          .update({
            trust_score_raw: newTrustScore.rawScore,
            trust_score_stars: newTrustScore.stars,
            trust_explanation: newTrustScore.explanation,
            fitness_status: newTrustScore.fitnessStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', asset.id);

        if (!updateError) {
          stats.scores_updated++;
        }

        // Check for low trust
        if (newTrustScore.rawScore < thresholds.lowTrustThreshold) {
          stats.low_trust_assets++;
        }

        // Create issues for significant drops
        if (change < 0 && changePercent >= thresholds.dropAlertPercent) {
          const severity = changePercent >= thresholds.criticalDropPercent ? 'critical' : 'high';

          try {
            await this.createTrustDropIssue(asset, newTrustScore, previousScore, changePercent, severity);
            stats.issues_created++;
            issuesCreated++;
          } catch (error) {
            errors.push(`Failed to create issue for ${asset.name}: ${error}`);
          }
        }

        // Create issue for persistently low trust
        if (newTrustScore.rawScore < thresholds.lowTrustThreshold && previousScore < thresholds.lowTrustThreshold) {
          // Check if there's already an open issue for this
          const { data: existingIssue } = await this.supabase
            .from('issues')
            .select('id')
            .eq('issue_type', 'low_trust')
            .contains('affected_assets', [asset.name])
            .in('status', ['open', 'investigating', 'in_progress'])
            .single();

          if (!existingIssue) {
            try {
              await this.createLowTrustIssue(asset, newTrustScore);
              stats.issues_created++;
              issuesCreated++;
            } catch (error) {
              errors.push(`Failed to create low trust issue for ${asset.name}: ${error}`);
            }
          }
        }
      }

      stats.average_trust = Math.round((totalTrust / assets.length) * 100);

      // Log summary
      await this.log('trust_evaluated', `Evaluated trust for ${stats.assets_evaluated} assets`, {
        averageTrust: stats.average_trust,
        trustDrops: stats.trust_drops_detected,
        trustImprovements: stats.trust_improvements_detected,
        lowTrustAssets: stats.low_trust_assets,
        changes: trustChanges.slice(0, 10), // Log first 10 changes
      });

      // Generate AI analysis if there were significant changes
      if (trustChanges.length > 0) {
        await this.generateTrustAnalysis(trustChanges);
      }

      // Create snapshot for historical tracking
      await this.createTrustSnapshot(stats, trustChanges);

      await this.completeRun(runId, { stats, trustChanges: trustChanges.length }, true);

      return {
        success: errors.length === 0,
        runId,
        stats,
        issuesCreated,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.failRun(runId, errorMessage);

      return {
        success: false,
        runId,
        stats,
        issuesCreated,
        errors: [errorMessage],
        duration: Date.now() - startTime,
      };
    }
  }

  private detectSignificantFactorChanges(
    asset: any,
    newScore: TrustScore
  ): TrustChangeEvent['significantFactorChanges'] {
    const changes: TrustChangeEvent['significantFactorChanges'] = [];

    // Compare with metadata if available
    const previousFactors = asset.metadata?.trustFactors || {};

    for (const [factor, newValue] of Object.entries(newScore.factors)) {
      const previousValue = previousFactors[factor] ?? 0;
      const change = (newValue as number) - previousValue;

      if (Math.abs(change) >= 0.1) { // 10% change in factor
        changes.push({
          factor,
          previousValue,
          newValue: newValue as number,
          change,
        });
      }
    }

    return changes;
  }

  private async createTrustDropIssue(
    asset: any,
    newScore: TrustScore,
    previousScore: number,
    changePercent: number,
    severity: 'critical' | 'high'
  ): Promise<void> {
    const weakestFactors = Object.entries(newScore.factors)
      .sort(([, a], [, b]) => (a as number) - (b as number))
      .slice(0, 2)
      .map(([factor]) => factor);

    const issue: DetectedIssue = {
      title: `Trust score dropped ${Math.round(changePercent)}% for ${asset.name}`,
      description: `The trust score for ${asset.name} has dropped significantly from ${Math.round(previousScore * 100)}% to ${Math.round(newScore.rawScore * 100)}%.

Current fitness status: ${newScore.fitnessStatus.toUpperCase()}

Weakest factors: ${weakestFactors.join(', ')}

${newScore.explanation}

Recommended actions:
${weakestFactors.map(f => `- Improve ${f} factor`).join('\n')}`,
      severity,
      issueType: 'quality_failure',
      affectedAssets: [asset.name],
      metadata: {
        trustDrop: true,
        previousScore,
        newScore: newScore.rawScore,
        changePercent,
        factors: newScore.factors,
        weakestFactors,
      },
    };

    await this.createIssue(issue);
  }

  private async createLowTrustIssue(asset: any, score: TrustScore): Promise<void> {
    const weakestFactors = Object.entries(score.factors)
      .sort(([, a], [, b]) => (a as number) - (b as number))
      .slice(0, 3)
      .map(([factor, value]) => ({ factor, score: Math.round((value as number) * 100) }));

    const issue: DetectedIssue = {
      title: `Low trust score for ${asset.name} (${score.stars}/5 stars)`,
      description: `${asset.name} has a persistently low trust score of ${Math.round(score.rawScore * 100)}%.

Fitness Status: ${score.fitnessStatus.toUpperCase()} - ${score.fitnessStatus === 'red' ? 'Not recommended for critical decisions' : 'Use with caution'}

Lowest scoring factors:
${weakestFactors.map(f => `- ${f.factor}: ${f.score}%`).join('\n')}

${score.explanation}

This asset needs attention to improve its trustworthiness.`,
      severity: score.fitnessStatus === 'red' ? 'high' : 'medium',
      issueType: 'quality_failure',
      affectedAssets: [asset.name],
      metadata: {
        lowTrust: true,
        trustScore: score.rawScore,
        stars: score.stars,
        fitnessStatus: score.fitnessStatus,
        factors: score.factors,
        weakestFactors,
      },
    };

    // Mark as low_trust type for tracking
    const { data, error } = await this.supabase
      .from('issues')
      .insert({
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        issue_type: 'low_trust',
        affected_assets: issue.affectedAssets,
        created_by: this.getName(),
        status: 'open',
        metadata: issue.metadata,
      })
      .select('id')
      .single();

    if (!error && data) {
      await this.log('issue_created', `Created low trust issue for ${asset.name}`, {
        issueId: data.id,
        trustScore: score.rawScore,
      });
    }
  }

  private async generateTrustAnalysis(changes: TrustChangeEvent[]): Promise<void> {
    const drops = changes.filter(c => c.change < 0);
    const improvements = changes.filter(c => c.change > 0);

    if (drops.length === 0 && improvements.length === 0) return;

    const analysisPrompt = `Analyze these trust score changes and provide brief insights:

Trust Drops (${drops.length}):
${drops.slice(0, 5).map(d => `- ${d.assetName}: ${Math.round(d.previousScore * 100)}% → ${Math.round(d.newScore * 100)}% (${d.changePercent.toFixed(1)}% drop)`).join('\n')}

Trust Improvements (${improvements.length}):
${improvements.slice(0, 5).map(i => `- ${i.assetName}: ${Math.round(i.previousScore * 100)}% → ${Math.round(i.newScore * 100)}% (${i.changePercent.toFixed(1)}% improvement)`).join('\n')}

Provide:
1. Key pattern or trend observed
2. Most concerning changes
3. Top recommendation`;

    try {
      const analysis = await this.analyzeWithClaude(analysisPrompt, { drops, improvements });
      await this.log('trust_analysis', 'Generated trust trend analysis', { analysis });
    } catch (error) {
      // Non-critical, just log
      console.error('Failed to generate trust analysis:', error);
    }
  }

  private async createTrustSnapshot(
    stats: Record<string, number>,
    changes: TrustChangeEvent[]
  ): Promise<void> {
    try {
      await this.supabase.from('snapshots').insert({
        type: 'trust_index',
        data: {
          stats,
          changesCount: changes.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      // Non-critical
      console.error('Failed to create trust snapshot:', error);
    }
  }

  // Get trust trend for an asset over time
  async getTrustTrend(assetId: string, days: number = 30): Promise<any[]> {
    const { data } = await this.supabase
      .from('snapshots')
      .select('data, created_at')
      .eq('type', 'trust_index')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    return data || [];
  }
}

// Singleton instance
let trustAgentInstance: TrustAgent | null = null;

export function getTrustAgent(): TrustAgent {
  if (!trustAgentInstance) {
    trustAgentInstance = new TrustAgent();
  }
  return trustAgentInstance;
}
