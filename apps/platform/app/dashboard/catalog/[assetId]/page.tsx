'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Card, CardContent, Badge, Button } from '@amygdala/ui';
import Link from 'next/link';
import { useChat } from '@/contexts/ChatContext';
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
  GitBranch,
  Code2,
  ChevronDown,
  ChevronUp,
  Workflow,
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

function TrustFactorBreakdown({
  factors,
  onFixFactor
}: {
  factors: TrustFactor[];
  onFixFactor?: (factor: TrustFactor) => void;
}) {
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
    <div className="space-y-3 pl-4 border-l-2 border-purple-200 dark:border-purple-800">
      {factors.map((factor) => {
        const Icon = factorIcons[factor.name] || BarChart3;

        return (
          <div key={factor.name} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`h-3.5 w-3.5 ${statusColors[factor.status]}`} />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {factor.name}
                </span>
                <span className="text-xs text-gray-400">({factor.weight}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${statusColors[factor.status]}`}>
                  {factor.score.toFixed(0)}%
                </span>
                {factor.recommendation && onFixFactor && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    onClick={() => onFixFactor(factor)}
                  >
                    Fix
                  </Button>
                )}
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full rounded-full ${barColors[factor.status]} transition-all duration-300`}
                style={{ width: `${factor.score}%` }}
              />
            </div>
            {factor.recommendation && (
              <p className="text-xs text-gray-500 dark:text-gray-400 pl-5">
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

interface PipelineInfo {
  id: string;
  name: string;
  description?: string;
  source_table?: string;
  target_table?: string;
  schedule?: string;
  is_active: boolean;
  transformation_logic?: string;
}

interface Consumer {
  id: string;
  name: string;
  description: string;
  type: string;
  app: string;
}

interface LineageData {
  upstream: { assets: LineageAsset[]; pipelines: PipelineInfo[]; sqlSourceTables?: string[] };
  downstream: { assets: LineageAsset[]; pipelines: PipelineInfo[]; consumers?: Consumer[] };
}

function LineageCard({
  asset,
  lineage,
  layerColors,
}: {
  asset: Asset;
  lineage: { upstream: LineageAsset[]; downstream: LineageAsset[] };
  layerColors: Record<string, string>;
}) {
  const [expandedPipeline, setExpandedPipeline] = useState<string | null>(null);
  const [lineageData, setLineageData] = useState<LineageData | null>(null);
  const [isLoadingLineage, setIsLoadingLineage] = useState(false);

  // Fetch detailed lineage with pipeline info
  useEffect(() => {
    const fetchLineage = async () => {
      setIsLoadingLineage(true);
      try {
        const res = await fetch(`/api/assets/${asset.id}/lineage`);
        if (res.ok) {
          const data = await res.json();
          setLineageData(data);
        }
      } catch (err) {
        console.error('Failed to fetch lineage:', err);
      } finally {
        setIsLoadingLineage(false);
      }
    };
    fetchLineage();
  }, [asset.id]);

  const upstreamAssets = lineageData?.upstream?.assets || lineage.upstream;
  const downstreamAssets = lineageData?.downstream?.assets || lineage.downstream;
  const incomingPipelines = lineageData?.upstream?.pipelines || [];
  const outgoingPipelines = lineageData?.downstream?.pipelines || [];
  const consumers = lineageData?.downstream?.consumers || [];
  const sqlSourceTables = lineageData?.upstream?.sqlSourceTables || [];

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-blue-500" />
          Data Lineage & Pipelines
          {isLoadingLineage && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </h3>

        {/* Visual Flow Diagram */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {/* Upstream Sources */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4" />
              Upstream Sources ({upstreamAssets.length})
            </h4>
            {upstreamAssets.length > 0 ? (
              <div className="space-y-2">
                {upstreamAssets.map((upAsset) => (
                  <Link
                    key={upAsset.id || upAsset.name}
                    href={upAsset.id ? `/dashboard/catalog/${upAsset.id}` : '#'}
                    className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {upAsset.name}
                      </span>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          upAsset.fitness_status === 'green'
                            ? 'bg-green-500'
                            : upAsset.fitness_status === 'amber'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                      />
                    </div>
                    <Badge className={`mt-1 text-xs ${layerColors[upAsset.layer] || ''}`}>
                      {upAsset.layer}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-center">
                <p className="text-sm text-gray-400 italic">No upstream sources</p>
                <p className="text-xs text-gray-400 mt-1">This may be a source table</p>
              </div>
            )}
          </div>

          {/* Current Asset with Pipelines */}
          <div className="flex flex-col items-center justify-center">
            {/* Incoming Pipeline Arrow */}
            {incomingPipelines.length > 0 && (
              <div className="mb-2 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-blue-500">
                  <Workflow className="h-3 w-3" />
                  <span className="font-mono">{incomingPipelines[0]?.name}</span>
                </div>
                <ArrowDownRight className="h-5 w-5 text-blue-400 mx-auto" />
              </div>
            )}

            {/* Current Asset Box */}
            <div className="p-4 rounded-lg border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-center min-w-[150px]">
              <Database className="h-8 w-8 mx-auto text-purple-500 mb-2" />
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{asset.name}</p>
              <Badge className={`mt-1 ${layerColors[asset.layer]}`}>{asset.layer}</Badge>
            </div>

            {/* Outgoing Pipeline Arrow */}
            {outgoingPipelines.length > 0 && (
              <div className="mt-2 text-center">
                <ArrowUpRight className="h-5 w-5 text-green-400 mx-auto" />
                <div className="flex items-center justify-center gap-1 text-xs text-green-500">
                  <Workflow className="h-3 w-3" />
                  <span className="font-mono">{outgoingPipelines[0]?.name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Downstream Consumers */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Downstream Consumers ({downstreamAssets.length + consumers.length})
            </h4>
            {(downstreamAssets.length > 0 || consumers.length > 0) ? (
              <div className="space-y-2">
                {/* Data Asset Consumers */}
                {downstreamAssets.map((downAsset) => (
                  <Link
                    key={downAsset.id || downAsset.name}
                    href={downAsset.id ? `/dashboard/catalog/${downAsset.id}` : '#'}
                    className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {downAsset.name}
                      </span>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          downAsset.fitness_status === 'green'
                            ? 'bg-green-500'
                            : downAsset.fitness_status === 'amber'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                      />
                    </div>
                    <Badge className={`mt-1 text-xs ${layerColors[downAsset.layer] || ''}`}>
                      {downAsset.layer}
                    </Badge>
                  </Link>
                ))}
                {/* Application/Report Consumers */}
                {consumers.map((consumer) => (
                  <div
                    key={consumer.id}
                    className="p-3 rounded-lg border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {consumer.name}
                      </span>
                      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-xs">
                        {consumer.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {consumer.description}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      {consumer.app}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-center">
                <p className="text-sm text-gray-400 italic">No downstream consumers</p>
                <p className="text-xs text-gray-400 mt-1">This may be a terminal asset</p>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Details */}
        {(incomingPipelines.length > 0 || outgoingPipelines.length > 0) && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              Transformation Pipelines
            </h4>
            <div className="space-y-2">
              {[...incomingPipelines, ...outgoingPipelines].map((pipeline) => (
                <div
                  key={pipeline.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedPipeline(expandedPipeline === pipeline.id ? null : pipeline.id)
                    }
                    className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Workflow className="h-4 w-4 text-blue-500" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {pipeline.name}
                        </p>
                        <p className="text-xs text-gray-500">{pipeline.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pipeline.schedule && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {pipeline.schedule}
                        </Badge>
                      )}
                      {pipeline.is_active ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 text-xs">
                          Inactive
                        </Badge>
                      )}
                      {expandedPipeline === pipeline.id ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </button>
                  {expandedPipeline === pipeline.id && pipeline.transformation_logic && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-500 mb-2 font-medium">Transformation Logic:</p>
                      <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 font-mono">
                        {pipeline.transformation_logic}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No lineage message */}
        {upstreamAssets.length === 0 &&
          downstreamAssets.length === 0 &&
          incomingPipelines.length === 0 &&
          outgoingPipelines.length === 0 && (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <GitBranch className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm">No lineage information available</p>
              <p className="text-xs mt-1">
                Run the Documentarist agent to discover data lineage
              </p>
            </div>
          )}
      </CardContent>
    </Card>
  );
}

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = use(params);
  const router = useRouter();
  const { openChat } = useChat();
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
            <Button
              size="sm"
              className="gap-2"
              onClick={() =>
                openChat({
                  type: 'asset',
                  id: asset.id,
                  title: asset.name,
                  prefilledPrompt: `Tell me about the data asset "${asset.name}" - its purpose, quality status, and any recommendations for improvement.`,
                })
              }
            >
              <MessageSquare className="h-4 w-4" />
              Ask AI
            </Button>
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

              {/* Overall Trust Score - Full Width Header */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    Overall Trust Score
                  </span>
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {trustBreakdown.overall.toFixed(0)}%
                  </span>
                </div>
                <div className="h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      trustBreakdown.overall >= 70
                        ? 'bg-gradient-to-r from-green-500 to-green-400'
                        : trustBreakdown.overall >= 40
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                        : 'bg-gradient-to-r from-red-500 to-red-400'
                    }`}
                    style={{ width: `${trustBreakdown.overall}%` }}
                  />
                </div>
              </div>

              {/* Factor Breakdown - Indented under overall */}
              <div className="mt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide font-medium">
                  Factor Breakdown
                </p>
                <TrustFactorBreakdown
                  factors={trustBreakdown.factors}
                  onFixFactor={(factor) => {
                    openChat({
                      type: 'asset',
                      id: asset.id,
                      title: asset.name,
                      prefilledPrompt: `Help me improve the ${factor.name} score for "${asset.name}". Current score: ${factor.score.toFixed(0)}%. ${factor.recommendation || ''}`,
                      autoSend: true,
                    });
                  }}
                />
              </div>
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
        <LineageCard asset={asset} lineage={lineage} layerColors={layerColors} />

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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-purple-600 hover:text-purple-700"
                        onClick={() =>
                          openChat({
                            type: 'recommendation',
                            id: asset.id,
                            title: asset.name,
                            prefilledPrompt: `Help me implement this recommendation for "${asset.name}": ${rec}`,
                            autoSend: true,
                          })
                        }
                      >
                        Fix with AI
                      </Button>
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
