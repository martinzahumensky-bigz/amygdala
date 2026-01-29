// Trust Score Calculator
// Based on AMYGDALA_SPECIFICATION.md trust factors

export interface TrustFactors {
  documentation: number;
  governance: number;
  quality: number;
  usage: number;
  reliability: number;
  freshness: number;
}

export interface TrustScore {
  rawScore: number;
  stars: number;
  factors: TrustFactors;
  factorDetails: Record<string, { score: number; reasons: string[] }>;
  fitnessStatus: 'green' | 'amber' | 'red';
  explanation: string;
  trustInsight?: TrustInsight;
}

// Static Trust: factors that rarely change (inherent data asset quality)
// Live Trust: factors that change often (current operational state)
export interface TrustInsight {
  staticTrust: {
    score: number; // 0-1
    documented: boolean;
    governed: boolean;
    hasLineage: boolean;
    classified: boolean;
  };
  liveTrust: {
    status: 'green' | 'amber' | 'red';
    isFresh: boolean;
    hasIssues: boolean;
    qualityValidated: boolean;
    lastRefresh?: string;
    issueCount: number;
  };
  aiSummary: string;
  trustLevel: 'excellent' | 'good' | 'moderate' | 'needs_attention' | 'critical';
}

export interface Asset {
  id: string;
  name: string;
  description?: string;
  business_context?: string;
  owner?: string;
  steward?: string;
  upstream_assets?: string[];
  downstream_assets?: string[];
  quality_score?: number;
  fitness_status?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Factor weights as per specification
const FACTOR_WEIGHTS = {
  documentation: 0.15,
  governance: 0.20,
  quality: 0.25,
  usage: 0.15,
  reliability: 0.15,
  freshness: 0.10,
};

export function calculateTrustScore(
  asset: Asset,
  issues?: any[],
  agentRuns?: any[]
): TrustScore {
  const factorDetails: Record<string, { score: number; reasons: string[] }> = {};

  // 1. Documentation Factor (15%)
  const docResult = scoreDocumentation(asset);
  factorDetails.documentation = docResult;

  // 2. Governance Factor (20%)
  const govResult = scoreGovernance(asset);
  factorDetails.governance = govResult;

  // 3. Quality Factor (25%)
  const qualResult = scoreQuality(asset, issues);
  factorDetails.quality = qualResult;

  // 4. Usage Factor (15%)
  const usageResult = scoreUsage(asset);
  factorDetails.usage = usageResult;

  // 5. Reliability Factor (15%)
  const reliabilityResult = scoreReliability(asset, issues, agentRuns);
  factorDetails.reliability = reliabilityResult;

  // 6. Freshness Factor (10%)
  const freshnessResult = scoreFreshness(asset);
  factorDetails.freshness = freshnessResult;

  // Calculate weighted score
  const factors: TrustFactors = {
    documentation: docResult.score,
    governance: govResult.score,
    quality: qualResult.score,
    usage: usageResult.score,
    reliability: reliabilityResult.score,
    freshness: freshnessResult.score,
  };

  const rawScore =
    factors.documentation * FACTOR_WEIGHTS.documentation +
    factors.governance * FACTOR_WEIGHTS.governance +
    factors.quality * FACTOR_WEIGHTS.quality +
    factors.usage * FACTOR_WEIGHTS.usage +
    factors.reliability * FACTOR_WEIGHTS.reliability +
    factors.freshness * FACTOR_WEIGHTS.freshness;

  // Convert to 5-star scale
  const stars = Math.round(rawScore * 5);

  // Determine fitness status
  const fitnessStatus = determineFitnessStatus(rawScore, factors, issues);

  // Generate explanation
  const explanation = generateExplanation(asset, factors, factorDetails, fitnessStatus);

  // Generate trust insight (static vs live trust)
  const trustInsight = generateTrustInsight(asset, factors, factorDetails, fitnessStatus, issues);

  return {
    rawScore,
    stars,
    factors,
    factorDetails,
    fitnessStatus,
    explanation,
    trustInsight,
  };
}

function scoreDocumentation(asset: Asset): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Has description
  if (asset.description && asset.description.length > 20) {
    score += 0.4;
    reasons.push('Has detailed description');
  } else if (asset.description) {
    score += 0.2;
    reasons.push('Has basic description');
  } else {
    reasons.push('Missing description');
  }

  // Has business context
  if (asset.business_context && asset.business_context.length > 20) {
    score += 0.3;
    reasons.push('Has business context documented');
  } else {
    reasons.push('Missing business context');
  }

  // Has lineage (upstream/downstream)
  if (asset.upstream_assets && asset.upstream_assets.length > 0) {
    score += 0.15;
    reasons.push(`Has ${asset.upstream_assets.length} upstream dependencies`);
  }
  if (asset.downstream_assets && asset.downstream_assets.length > 0) {
    score += 0.15;
    reasons.push(`Used by ${asset.downstream_assets.length} downstream assets`);
  }

  return { score: Math.min(score, 1), reasons };
}

function scoreGovernance(asset: Asset): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Has owner
  if (asset.owner) {
    score += 0.4;
    reasons.push(`Owned by ${asset.owner}`);
  } else {
    reasons.push('No owner assigned');
  }

  // Has steward
  if (asset.steward) {
    score += 0.3;
    reasons.push(`Steward: ${asset.steward}`);
  } else {
    reasons.push('No data steward assigned');
  }

  // Has classification/tags
  if (asset.tags && asset.tags.length > 0) {
    score += 0.2;
    reasons.push(`Classified with ${asset.tags.length} tags`);
  } else {
    reasons.push('Not classified with tags');
  }

  // Reviewed recently (placeholder - would check audit trail)
  score += 0.1;
  reasons.push('Governance baseline established');

  return { score: Math.min(score, 1), reasons };
}

function scoreQuality(asset: Asset, issues?: any[]): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Quality score from profiling
  if (asset.quality_score !== undefined && asset.quality_score !== null) {
    const qualityPercent = asset.quality_score / 100;
    score += qualityPercent * 0.6;
    reasons.push(`Quality score: ${asset.quality_score}%`);
  } else {
    score += 0.3; // Neutral if not profiled
    reasons.push('Quality not profiled yet');
  }

  // Active issues
  const assetIssues = issues?.filter(
    (i) => i.affected_assets?.includes(asset.name) && i.status !== 'resolved' && i.status !== 'closed'
  ) || [];

  if (assetIssues.length === 0) {
    score += 0.4;
    reasons.push('No active quality issues');
  } else {
    const criticalIssues = assetIssues.filter((i) => i.severity === 'critical').length;
    const highIssues = assetIssues.filter((i) => i.severity === 'high').length;

    if (criticalIssues > 0) {
      reasons.push(`${criticalIssues} critical issues`);
    } else if (highIssues > 0) {
      score += 0.2;
      reasons.push(`${highIssues} high severity issues`);
    } else {
      score += 0.3;
      reasons.push(`${assetIssues.length} minor issues`);
    }
  }

  return { score: Math.min(score, 1), reasons };
}

function scoreUsage(asset: Asset): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Used by downstream assets
  const downstreamCount = asset.downstream_assets?.length || 0;
  if (downstreamCount > 3) {
    score += 0.5;
    reasons.push(`Highly used - ${downstreamCount} downstream consumers`);
  } else if (downstreamCount > 0) {
    score += 0.3;
    reasons.push(`Used by ${downstreamCount} downstream assets`);
  } else {
    score += 0.1;
    reasons.push('No tracked downstream usage');
  }

  // Check metadata for usage metrics
  const viewers = asset.metadata?.viewers || asset.metadata?.activeUsers;
  if (viewers && viewers > 50) {
    score += 0.5;
    reasons.push(`${viewers} active users/viewers`);
  } else if (viewers && viewers > 10) {
    score += 0.3;
    reasons.push(`${viewers} users/viewers`);
  } else {
    score += 0.2;
    reasons.push('Usage metrics not tracked');
  }

  return { score: Math.min(score, 1), reasons };
}

function scoreReliability(
  asset: Asset,
  issues?: any[],
  agentRuns?: any[]
): { score: number; reasons: string[] } {
  let score = 0.6; // Base score
  const reasons: string[] = [];

  // Check for recent issues
  const recentIssues = issues?.filter((i) => {
    const created = new Date(i.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return created > weekAgo && i.affected_assets?.includes(asset.name);
  }) || [];

  if (recentIssues.length === 0) {
    score += 0.2;
    reasons.push('No issues in past week');
  } else {
    score -= recentIssues.length * 0.1;
    reasons.push(`${recentIssues.length} issues in past week`);
  }

  // Pipeline stability (from metadata)
  if (asset.metadata?.pipelineStatus === 'healthy') {
    score += 0.2;
    reasons.push('Pipeline running smoothly');
  } else {
    reasons.push('Pipeline status unknown');
  }

  return { score: Math.max(0, Math.min(score, 1)), reasons };
}

function scoreFreshness(asset: Asset): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Check last refresh from metadata
  const lastRefresh = asset.metadata?.lastRefresh;
  if (lastRefresh) {
    const refreshDate = new Date(lastRefresh);
    const now = new Date();
    const hoursSinceRefresh = (now.getTime() - refreshDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceRefresh < 24) {
      score += 0.6;
      reasons.push('Data refreshed within 24 hours');
    } else if (hoursSinceRefresh < 72) {
      score += 0.4;
      reasons.push('Data refreshed within 3 days');
    } else if (hoursSinceRefresh < 168) {
      score += 0.2;
      reasons.push('Data refreshed within a week');
    } else {
      reasons.push('Data may be stale');
    }
  } else {
    score += 0.3;
    reasons.push('Refresh schedule not tracked');
  }

  // Check expected refresh frequency
  const frequency = asset.metadata?.refreshFrequency;
  if (frequency) {
    score += 0.4;
    reasons.push(`Expected refresh: ${frequency}`);
  }

  return { score: Math.min(score, 1), reasons };
}

function determineFitnessStatus(
  rawScore: number,
  factors: TrustFactors,
  issues?: any[]
): 'green' | 'amber' | 'red' {
  // Critical issues always result in red
  const criticalIssues = issues?.filter((i) => i.severity === 'critical' && i.status === 'open').length || 0;
  if (criticalIssues > 0) {
    return 'red';
  }

  // Low quality or governance score
  if (factors.quality < 0.4 || factors.governance < 0.3) {
    return 'red';
  }

  // Overall low score
  if (rawScore < 0.4) {
    return 'red';
  }

  // Medium issues or moderate concerns
  if (rawScore < 0.7 || factors.quality < 0.6 || factors.freshness < 0.4) {
    return 'amber';
  }

  return 'green';
}

function generateExplanation(
  asset: Asset,
  factors: TrustFactors,
  factorDetails: Record<string, { score: number; reasons: string[] }>,
  fitnessStatus: 'green' | 'amber' | 'red'
): string {
  const parts: string[] = [];

  // Headline
  if (fitnessStatus === 'green') {
    parts.push(`${asset.name} is in good health with strong trust indicators.`);
  } else if (fitnessStatus === 'amber') {
    parts.push(`${asset.name} has some areas requiring attention.`);
  } else {
    parts.push(`${asset.name} has critical issues that need resolution.`);
  }

  // Highlight strengths
  const strengths = Object.entries(factors)
    .filter(([_, score]) => score >= 0.7)
    .map(([factor]) => factor);

  if (strengths.length > 0) {
    parts.push(`Strengths: ${strengths.join(', ')}.`);
  }

  // Highlight concerns
  const concerns = Object.entries(factors)
    .filter(([_, score]) => score < 0.5)
    .map(([factor]) => factor);

  if (concerns.length > 0) {
    parts.push(`Areas to improve: ${concerns.join(', ')}.`);
  }

  return parts.join(' ');
}

// Generate trust insight with static vs live trust separation
function generateTrustInsight(
  asset: Asset,
  factors: TrustFactors,
  factorDetails: Record<string, { score: number; reasons: string[] }>,
  fitnessStatus: 'green' | 'amber' | 'red',
  issues?: any[]
): TrustInsight {
  // Static trust factors (rarely change)
  const documented = !!(asset.description && asset.description.length > 20);
  const governed = !!(asset.owner && asset.steward);
  const hasLineage =
    (asset.upstream_assets && asset.upstream_assets.length > 0) ||
    (asset.downstream_assets && asset.downstream_assets.length > 0);
  const classified = !!(asset.tags && asset.tags.length > 0);

  // Calculate static trust score (weighted)
  const staticTrustScore =
    (documented ? 0.3 : 0) +
    (governed ? 0.35 : 0) +
    (hasLineage ? 0.2 : 0) +
    (classified ? 0.15 : 0);

  // Live trust factors (change frequently)
  const activeIssues =
    issues?.filter(
      (i) =>
        i.affected_assets?.includes(asset.name) &&
        i.status !== 'resolved' &&
        i.status !== 'closed'
    ) || [];
  const hasIssues = activeIssues.length > 0;
  const issueCount = activeIssues.length;

  // Check freshness
  const lastRefresh = asset.metadata?.lastRefresh;
  let isFresh = false;
  if (lastRefresh) {
    const refreshDate = new Date(lastRefresh);
    const now = new Date();
    const hoursSinceRefresh = (now.getTime() - refreshDate.getTime()) / (1000 * 60 * 60);
    isFresh = hoursSinceRefresh < 48; // Fresh if updated within 48 hours
  } else {
    isFresh = factors.freshness >= 0.5;
  }

  // Quality validated (has quality score or rules)
  const qualityValidated = asset.quality_score !== undefined && asset.quality_score !== null;

  // Determine live trust status
  let liveTrustStatus: 'green' | 'amber' | 'red' = 'green';
  const criticalIssues = activeIssues.filter((i) => i.severity === 'critical').length;
  const highIssues = activeIssues.filter((i) => i.severity === 'high').length;

  if (criticalIssues > 0 || !isFresh) {
    liveTrustStatus = 'red';
  } else if (highIssues > 0 || issueCount > 2) {
    liveTrustStatus = 'amber';
  }

  // Determine overall trust level
  const overallScore = (staticTrustScore + (liveTrustStatus === 'green' ? 1 : liveTrustStatus === 'amber' ? 0.5 : 0.2)) / 2;
  let trustLevel: TrustInsight['trustLevel'];
  if (overallScore >= 0.8) {
    trustLevel = 'excellent';
  } else if (overallScore >= 0.65) {
    trustLevel = 'good';
  } else if (overallScore >= 0.5) {
    trustLevel = 'moderate';
  } else if (overallScore >= 0.3) {
    trustLevel = 'needs_attention';
  } else {
    trustLevel = 'critical';
  }

  // Generate AI summary (Trustpilot-style)
  const aiSummary = generateAISummary(
    asset,
    factors,
    documented,
    governed,
    hasLineage,
    isFresh,
    hasIssues,
    issueCount,
    qualityValidated,
    trustLevel
  );

  return {
    staticTrust: {
      score: staticTrustScore,
      documented,
      governed,
      hasLineage,
      classified,
    },
    liveTrust: {
      status: liveTrustStatus,
      isFresh,
      hasIssues,
      qualityValidated,
      lastRefresh: lastRefresh || undefined,
      issueCount,
    },
    aiSummary,
    trustLevel,
  };
}

// Generate Trustpilot-style AI summary
function generateAISummary(
  asset: Asset,
  factors: TrustFactors,
  documented: boolean,
  governed: boolean,
  hasLineage: boolean,
  isFresh: boolean,
  hasIssues: boolean,
  issueCount: number,
  qualityValidated: boolean,
  trustLevel: TrustInsight['trustLevel']
): string {
  const summaryParts: string[] = [];

  // Opening based on trust level
  switch (trustLevel) {
    case 'excellent':
      summaryParts.push('Highly trustworthy dataset with excellent governance.');
      break;
    case 'good':
      summaryParts.push('Well-maintained dataset with good trust indicators.');
      break;
    case 'moderate':
      summaryParts.push('Dataset has reasonable trust, but could be improved.');
      break;
    case 'needs_attention':
      summaryParts.push('Dataset requires attention to improve trustworthiness.');
      break;
    case 'critical':
      summaryParts.push('Dataset has critical trust issues that need resolution.');
      break;
  }

  // Static trust commentary
  const staticStrengths: string[] = [];
  const staticWeaknesses: string[] = [];

  if (documented) {
    staticStrengths.push('well-documented');
  } else {
    staticWeaknesses.push('lacks documentation');
  }

  if (governed) {
    staticStrengths.push('properly governed');
  } else {
    staticWeaknesses.push('needs ownership assignment');
  }

  if (hasLineage) {
    staticStrengths.push('has clear lineage');
  }

  if (staticStrengths.length > 0) {
    const strengthText = staticStrengths.slice(0, 2).join(' and ');
    summaryParts.push(`Data is ${strengthText}.`);
  }

  // Live trust commentary
  if (isFresh && !hasIssues && qualityValidated) {
    summaryParts.push('Currently fresh with no active issues.');
  } else {
    const liveIssues: string[] = [];
    if (!isFresh) {
      liveIssues.push('data may be stale');
    }
    if (hasIssues) {
      liveIssues.push(`${issueCount} active issue${issueCount > 1 ? 's' : ''}`);
    }
    if (!qualityValidated) {
      liveIssues.push('quality not validated');
    }
    if (liveIssues.length > 0) {
      summaryParts.push(`Note: ${liveIssues.join(', ')}.`);
    }
  }

  return summaryParts.join(' ');
}

// Calculate aggregate trust index across all assets
export function calculateAggregateTrustIndex(
  trustScores: TrustScore[]
): {
  overall: number;
  stars: number;
  factorAverages: TrustFactors;
  distribution: { green: number; amber: number; red: number };
} {
  if (trustScores.length === 0) {
    return {
      overall: 0,
      stars: 0,
      factorAverages: {
        documentation: 0,
        governance: 0,
        quality: 0,
        usage: 0,
        reliability: 0,
        freshness: 0,
      },
      distribution: { green: 0, amber: 0, red: 0 },
    };
  }

  const factorSums: TrustFactors = {
    documentation: 0,
    governance: 0,
    quality: 0,
    usage: 0,
    reliability: 0,
    freshness: 0,
  };

  const distribution = { green: 0, amber: 0, red: 0 };
  let totalScore = 0;

  for (const score of trustScores) {
    totalScore += score.rawScore;
    distribution[score.fitnessStatus]++;

    for (const factor of Object.keys(factorSums) as (keyof TrustFactors)[]) {
      factorSums[factor] += score.factors[factor];
    }
  }

  const count = trustScores.length;
  const overall = totalScore / count;

  const factorAverages: TrustFactors = {
    documentation: factorSums.documentation / count,
    governance: factorSums.governance / count,
    quality: factorSums.quality / count,
    usage: factorSums.usage / count,
    reliability: factorSums.reliability / count,
    freshness: factorSums.freshness / count,
  };

  return {
    overall,
    stars: Math.round(overall * 5),
    factorAverages,
    distribution,
  };
}
