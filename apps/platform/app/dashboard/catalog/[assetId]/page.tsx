'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Card, CardContent, Badge, Button } from '@amygdala/ui';
import Link from 'next/link';
import {
  Database,
  ArrowLeft,
  Star,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  User,
  Clock,
  FileText,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  XCircle,
  Edit,
  Lightbulb,
  BarChart3,
  Shield,
  RefreshCw,
  Users,
  Activity,
} from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  layer: string;
  description?: string;
  business_context?: string;
  tags: string[];
  owner?: string;
  steward?: string;
  upstream_assets: string[];
  downstream_assets: string[];
  quality_score?: number;
  trust_score_stars?: number;
  trust_score_raw?: number;
  fitness_status: 'green' | 'amber' | 'red';
  created_at: string;
  updated_at: string;
}

interface TrustFactor {
  name: string;
  score: number;
  weight: number;
  status: 'green' | 'amber' | 'red';
  recommendation?: string;
}

interface LineageAsset {
  id: string;
  name: string;
  asset_type: string;
  layer: string;
  fitness_status: string;
}

interface AssetDetail {
  asset: Asset;
  trustBreakdown: {
    overall: number;
    factors: TrustFactor[];
    recommendations: string[];
  };
  issues: any[];
  lineage: {
    upstream: LineageAsset[];
    downstream: LineageAsset[];
  };
  sampleData: {
    columns: { name: string; type: string }[];
    rows: Record<string, unknown>[];
    total: number;
  };
}

const layerColors: Record<string, string> = {
  consumer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  gold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  silver: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  bronze: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  raw: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const factorIcons: Record<string, any> = {
  Documentation: FileText,
  Governance: Shield,
  Quality: BarChart3,
  Usage: Users,
  Reliability: Activity,
  Freshness: RefreshCw,
};

function TrustFactorBreakdown({ factors }: { factors: TrustFactor[] }) {
  return (
    <div className="space-y-4">
      {factors.map((factor) => {
        const Icon = factorIcons[factor.name] || BarChart3;
        const statusColors = {
          green: 'text-green-500',
          amber: 'text-yellow-500',
          red: 'text-red-500',
        };
        const barColors = {
          green: 'bg-green-500',
          amber: 'bg-yellow-500',
          red: 'bg-red-500',
        };

        return (
          <div key={factor.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${statusColors[factor.status]}`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {factor.name}
                </span>
                <span className="text-xs text-gray-400">({factor.weight}%)</span>
              </div>
              <span className={`text-sm font-semibold ${statusColors[factor.status]}`}>
                {factor.score.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full rounded-full ${barColors[factor.status]} transition-all duration-300`}
                style={{ width: `${factor.score}%` }}
              />
            </div>
            {factor.recommendation && (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                {factor.recommendation}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${
            i <= stars
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<AssetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAsset = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/assets/${assetId}`);
      if (!res.ok) {
        throw new Error('Asset not found');
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load asset');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAsset();
  }, [assetId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <>
        <Header
          title="Asset Details"
          icon={<Database className="h-5 w-5" />}
          actions={
            <Link href="/dashboard/catalog">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Catalog
              </Button>
            </Link>
          }
        />
        <main className="p-6">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        </main>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Header
          title="Asset Details"
          icon={<Database className="h-5 w-5" />}
          actions={
            <Link href="/dashboard/catalog">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Catalog
              </Button>
            </Link>
          }
        />
        <main className="p-6">
          <Card className="p-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {error || 'Asset not found'}
            </h3>
            <Link href="/dashboard/catalog">
              <Button>Return to Catalog</Button>
            </Link>
          </Card>
        </main>
      </>
    );
  }

  const { asset, trustBreakdown, issues, lineage, sampleData } = data;

  return (
    <>
      <Header
        title={asset.name}
        icon={<Database className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/catalog">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Link href={`/dashboard/chat?context=asset&id=${asset.id}`}>
              <Button size="sm" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Ask AI
              </Button>
            </Link>
          </div>
        }
      />

      <main className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={layerColors[asset.layer] || layerColors.silver}>
                {asset.layer}
              </Badge>
              <Badge variant="outline">{asset.asset_type}</Badge>
              <div
                className={`w-3 h-3 rounded-full ${
                  asset.fitness_status === 'green'
                    ? 'bg-green-500'
                    : asset.fitness_status === 'amber'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              />
            </div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
              {asset.description || 'No description available'}
            </p>
            {asset.business_context && (
              <p className="text-sm text-gray-500 dark:text-gray-500">
                <strong>Business Context:</strong> {asset.business_context}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <StarRating stars={asset.trust_score_stars || 0} />
            <span className="text-sm text-gray-500">
              Trust Score: {(trustBreakdown.overall).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Metadata Row */}
        <div className="flex flex-wrap gap-4 text-sm">
          {asset.owner && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <User className="h-4 w-4" />
              <span>Owner: {asset.owner}</span>
            </div>
          )}
          {asset.steward && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Shield className="h-4 w-4" />
              <span>Steward: {asset.steward}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>Updated: {formatDate(asset.updated_at)}</span>
          </div>
        </div>

        {/* Tags */}
        {asset.tags && asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {asset.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Trust Factor Breakdown */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                Trust Index Breakdown
              </h3>
              <div className="mb-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Overall Trust Score
                  </span>
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {trustBreakdown.overall.toFixed(0)}%
                  </span>
                </div>
                <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      trustBreakdown.overall >= 70
                        ? 'bg-green-500'
                        : trustBreakdown.overall >= 40
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${trustBreakdown.overall}%` }}
                  />
                </div>
              </div>
              <TrustFactorBreakdown factors={trustBreakdown.factors} />
            </CardContent>
          </Card>

          {/* Open Issues */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Open Issues ({issues.length})
              </h3>
              {issues.length > 0 ? (
                <div className="space-y-3">
                  {issues.map((issue) => (
                    <Link
                      key={issue.id}
                      href={`/dashboard/issues/${issue.id}`}
                      className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {issue.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {issue.issue_type.replace('_', ' ')}
                          </p>
                        </div>
                        <Badge
                          className={
                            issue.severity === 'critical'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : issue.severity === 'high'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }
                        >
                          {issue.severity}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-2" />
                  <p>No open issues</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lineage */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-blue-500" />
              Data Lineage
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Upstream */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4" />
                  Upstream Sources ({lineage.upstream.length})
                </h4>
                {lineage.upstream.length > 0 ? (
                  <div className="space-y-2">
                    {lineage.upstream.map((asset) => (
                      <Link
                        key={asset.id}
                        href={`/dashboard/catalog/${asset.id}`}
                        className="block p-2 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {asset.name}
                          </span>
                          <div
                            className={`w-2 h-2 rounded-full ${
                              asset.fitness_status === 'green'
                                ? 'bg-green-500'
                                : asset.fitness_status === 'amber'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{asset.layer}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No upstream sources</p>
                )}
              </div>

              {/* Current Asset */}
              <div className="flex items-center justify-center">
                <div className="p-4 rounded-lg border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-center">
                  <Database className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                  <p className="font-semibold text-gray-900 dark:text-white">{asset.name}</p>
                  <Badge className={layerColors[asset.layer]}>{asset.layer}</Badge>
                </div>
              </div>

              {/* Downstream */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Downstream Consumers ({lineage.downstream.length})
                </h4>
                {lineage.downstream.length > 0 ? (
                  <div className="space-y-2">
                    {lineage.downstream.map((asset) => (
                      <Link
                        key={asset.id}
                        href={`/dashboard/catalog/${asset.id}`}
                        className="block p-2 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {asset.name}
                          </span>
                          <div
                            className={`w-2 h-2 rounded-full ${
                              asset.fitness_status === 'green'
                                ? 'bg-green-500'
                                : asset.fitness_status === 'amber'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{asset.layer}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No downstream consumers</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Data */}
        {sampleData.rows.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500" />
                Sample Data ({sampleData.total.toLocaleString()} total rows)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {sampleData.columns.slice(0, 8).map((col) => (
                        <th
                          key={col.name}
                          className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400"
                        >
                          {col.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleData.rows.slice(0, 5).map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        {Object.entries(row)
                          .slice(0, 8)
                          .map(([key, value]) => (
                            <td
                              key={key}
                              className={`py-2 px-3 ${
                                value === null
                                  ? 'text-red-500 italic'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {value === null
                                ? 'NULL'
                                : String(value).slice(0, 30)}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {trustBreakdown.recommendations.length > 0 && (
          <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Recommendations to Improve Trust
              </h3>
              <ul className="space-y-3">
                {trustBreakdown.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center text-xs font-medium text-purple-700 dark:text-purple-300">
                      {idx + 1}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{rec}</p>
                      <Link href={`/dashboard/chat?context=asset&id=${asset.id}&prompt=${encodeURIComponent(rec)}`}>
                        <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
                          Fix with AI
                        </Button>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
