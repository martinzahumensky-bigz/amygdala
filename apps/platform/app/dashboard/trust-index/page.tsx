'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, Badge, Button } from '@amygdala/ui';
import {
  Shield,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
  FileText,
  Users,
  CheckCircle,
  Activity,
  Clock,
  Database,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Info,
} from 'lucide-react';
import Link from 'next/link';

interface TrustFactors {
  documentation: number;
  governance: number;
  quality: number;
  usage: number;
  reliability: number;
  freshness: number;
}

interface AssetScore {
  assetId: string;
  assetName: string;
  rawScore: number;
  stars: number;
  factors: TrustFactors;
  fitnessStatus: 'green' | 'amber' | 'red';
  explanation: string;
}

interface TrustIndexData {
  aggregate: {
    overall: number;
    stars: number;
    factorAverages: TrustFactors;
    distribution: { green: number; amber: number; red: number };
  };
  assetScores: AssetScore[];
  factorTrends: Record<string, { trend: string; change: number }>;
  historicalData: any[];
  assetCount: number;
  issueCount: number;
  lastCalculated: string;
}

const factorConfig: Record<
  keyof TrustFactors,
  { label: string; icon: any; weight: number; description: string }
> = {
  documentation: {
    label: 'Documentation',
    icon: FileText,
    weight: 15,
    description: 'Description, business context, and lineage',
  },
  governance: {
    label: 'Governance',
    icon: Users,
    weight: 20,
    description: 'Ownership, stewardship, and classification',
  },
  quality: {
    label: 'Quality',
    icon: CheckCircle,
    weight: 25,
    description: 'Data quality rules and validation',
  },
  usage: {
    label: 'Usage',
    icon: Activity,
    weight: 15,
    description: 'Active consumption and downstream usage',
  },
  reliability: {
    label: 'Reliability',
    icon: Shield,
    weight: 15,
    description: 'Pipeline stability and issue resolution',
  },
  freshness: {
    label: 'Freshness',
    icon: Clock,
    weight: 10,
    description: 'Data recency and update frequency',
  },
};

function TrustGauge({ score, size = 'large' }: { score: number; size?: 'small' | 'large' }) {
  const percentage = Math.round(score * 100);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 70) return '#10b981'; // green
    if (percentage >= 50) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const sizeClass = size === 'large' ? 'h-40 w-40' : 'h-24 w-24';
  const fontSize = size === 'large' ? 'text-4xl' : 'text-xl';

  return (
    <div className={`relative ${sizeClass}`}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          stroke={getColor()}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${fontSize} font-bold text-gray-900 dark:text-white`}>
          {percentage}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">Trust Score</span>
      </div>
    </div>
  );
}

function StarRating({ stars, max = 5 }: { stars: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${
            i < stars
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

function FactorBar({
  factor,
  score,
  trend,
}: {
  factor: keyof TrustFactors;
  score: number;
  trend?: { trend: string; change: number };
}) {
  const config = factorConfig[factor];
  const Icon = config.icon;
  const percentage = Math.round(score * 100);

  const getBarColor = () => {
    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.trend === 'improving') return <ArrowUp className="h-3 w-3 text-green-500" />;
    if (trend.trend === 'declining') return <ArrowDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {config.label}
          </span>
          <span className="text-xs text-gray-400">({config.weight}%)</span>
        </div>
        <div className="flex items-center gap-2">
          {getTrendIcon()}
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {percentage}%
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{config.description}</p>
    </div>
  );
}

export default function TrustIndexPage() {
  const [data, setData] = useState<TrustIndexData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/trust-index');
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch trust index:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const recalculate = async () => {
    try {
      setIsRecalculating(true);
      const res = await fetch('/api/trust-index?recalculate=true');
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Failed to recalculate:', error);
    } finally {
      setIsRecalculating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <>
        <Header title="Data Trust Index" icon={<Shield className="h-5 w-5" />} />
        <main className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </main>
      </>
    );
  }

  if (!data || !data.aggregate) {
    return (
      <>
        <Header title="Data Trust Index" icon={<Shield className="h-5 w-5" />} />
        <main className="p-6">
          <Card className="p-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Trust Data Available
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Add assets to the catalog to calculate trust scores.
            </p>
            <Link href="/dashboard/catalog">
              <Button>
                <Database className="mr-2 h-4 w-4" />
                Go to Catalog
              </Button>
            </Link>
          </Card>
        </main>
      </>
    );
  }

  const { aggregate, assetScores, factorTrends } = data;

  return (
    <>
      <Header
        title="Data Trust Index"
        icon={<Shield className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={recalculate}
              disabled={isRecalculating}
            >
              {isRecalculating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Recalculate
            </Button>
          </div>
        }
      />

      <main className="p-6 space-y-6">
        {/* Main Score Card */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1 p-6">
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Overall Trust Score
              </h3>
              <TrustGauge score={aggregate.overall} />
              <div className="mt-4">
                <StarRating stars={aggregate.stars} />
              </div>
              <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Based on {data.assetCount} data assets
              </p>
            </div>
          </Card>

          {/* Distribution Card */}
          <Card className="lg:col-span-1 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Health Distribution
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Healthy</span>
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {aggregate.distribution.green}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Warning</span>
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {aggregate.distribution.amber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Critical</span>
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {aggregate.distribution.red}
                </span>
              </div>
            </div>

            {/* Distribution Bar */}
            <div className="mt-6 flex h-4 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              {aggregate.distribution.green > 0 && (
                <div
                  className="bg-green-500"
                  style={{
                    width: `${(aggregate.distribution.green / data.assetCount) * 100}%`,
                  }}
                />
              )}
              {aggregate.distribution.amber > 0 && (
                <div
                  className="bg-yellow-500"
                  style={{
                    width: `${(aggregate.distribution.amber / data.assetCount) * 100}%`,
                  }}
                />
              )}
              {aggregate.distribution.red > 0 && (
                <div
                  className="bg-red-500"
                  style={{
                    width: `${(aggregate.distribution.red / data.assetCount) * 100}%`,
                  }}
                />
              )}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="lg:col-span-1 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Key Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Assets</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {data.assetCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Active Issues</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {data.issueCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Avg Quality</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {Math.round(aggregate.factorAverages.quality * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Last Calculated</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(data.lastCalculated).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Factor Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Trust Factor Breakdown
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(factorConfig) as (keyof TrustFactors)[]).map((factor) => (
              <FactorBar
                key={factor}
                factor={factor}
                score={aggregate.factorAverages[factor]}
                trend={factorTrends[factor]}
              />
            ))}
          </div>
        </Card>

        {/* Asset Trust Scores */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Asset Trust Scores
            </h3>
            <Link href="/dashboard/catalog">
              <Button variant="outline" size="sm">
                View Catalog
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Asset
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Health
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Trust Rating
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Summary
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {assetScores.slice(0, 10).map((asset) => (
                  <tr key={asset.assetId} className="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/catalog/${asset.assetId}`}
                        className="font-medium text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
                      >
                        {asset.assetName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                          asset.fitnessStatus === 'green'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : asset.fitnessStatus === 'amber'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {asset.fitnessStatus === 'green'
                          ? 'Healthy'
                          : asset.fitnessStatus === 'amber'
                          ? 'Warning'
                          : 'Critical'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {Math.round(asset.rawScore * 100)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= asset.stars
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {asset.explanation}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {assetScores.length > 10 && (
            <div className="mt-4 text-center">
              <Link href="/dashboard/catalog">
                <Button variant="outline" size="sm">
                  View all {assetScores.length} assets
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Improvement Suggestions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Improvement Recommendations
          </h3>
          <div className="space-y-3">
            {aggregate.factorAverages.documentation < 0.6 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Improve Documentation
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Add descriptions and business context to assets with missing documentation.
                  </p>
                </div>
              </div>
            )}
            {aggregate.factorAverages.governance < 0.6 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <Users className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Strengthen Governance
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Assign owners and stewards to unmanaged assets.
                  </p>
                </div>
              </div>
            )}
            {aggregate.distribution.red > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Address Critical Assets
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {aggregate.distribution.red} assets have critical issues requiring immediate
                    attention.
                  </p>
                </div>
              </div>
            )}
            {aggregate.factorAverages.freshness < 0.5 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <Clock className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Review Data Freshness
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Some assets may have stale data. Review refresh schedules and pipeline health.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </main>
    </>
  );
}
