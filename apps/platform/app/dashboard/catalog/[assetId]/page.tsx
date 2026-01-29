'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Card, CardContent, Badge, Button } from '@amygdala/ui';
import Link from 'next/link';
import { useChat, AgentCompleteEvent } from '@/contexts/ChatContext';
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
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  XCircle,
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
  Eye,
  Table2,
  Sparkles,
  Lock,
  Tag,
  Building2,
  Hash,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Percent,
  Box,
  Layers,
} from 'lucide-react';
import { DataStructureTab } from '@/components/catalog';
import { InlineTextEdit, InlineSelectEdit } from '@/components/catalog';

// ========== TYPES ==========
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
  source_table?: string;
  quality_score?: number;
  trust_score_stars?: number;
  trust_score_raw?: number;
  fitness_status: 'green' | 'amber' | 'red';
  metadata?: AssetMetadata;
  created_at: string;
  updated_at: string;
}

interface AssetMetadata {
  sensitive_columns?: string[];
  business_terms?: Record<string, string>;
  data_classification?: 'public' | 'internal' | 'confidential' | 'restricted';
  refresh_schedule?: string;
  last_refresh?: string;
  row_count?: number;
  column_count?: number;
  pipeline?: {
    name: string;
    description?: string;
    schedule?: string;
    is_active: boolean;
  };
}

interface TrustFactor {
  name: string;
  score: number;
  weight: number;
  status: 'green' | 'amber' | 'red';
  recommendation?: string;
}

interface ColumnProfile {
  name: string;
  data_type: string;
  inferred_semantic_type?: string;
  null_count: number;
  null_percentage: number;
  distinct_count: number;
  distinct_percentage: number;
  min_value?: any;
  max_value?: any;
  mean_value?: number;
  std_dev?: number;
  top_values?: { value: string; count: number }[];
  patterns?: string[];
  ai_insight?: string;
  is_sensitive?: boolean;
}

interface QualityRule {
  id: string;
  name: string;
  rule_type: string;
  expression: string;
  severity: string;
  threshold: number;
  pass_rate?: number;
  last_executed?: string;
  is_active: boolean;
}

interface LineageAsset {
  id: string;
  name: string;
  asset_type: string;
  layer: string;
  fitness_status: string;
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
  columnProfiles?: ColumnProfile[];
  qualityRules?: QualityRule[];
}

// ========== CONSTANTS ==========
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

const tabs = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'structure', label: 'Data Structure', icon: Layers },
  { id: 'profiling', label: 'Profiling', icon: BarChart3 },
  { id: 'quality', label: 'Quality', icon: Shield },
  { id: 'preview', label: 'Preview', icon: Table2 },
  { id: 'lineage', label: 'Lineage', icon: GitBranch },
  { id: 'transformations', label: 'Transformations', icon: Sparkles },
];

// ========== COMPONENTS ==========

function TabNavigation({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="flex gap-0 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
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

function TrustFactorBreakdown({
  factors,
  onFixFactor,
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
    <div className="space-y-3">
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
          </div>
        );
      })}
    </div>
  );
}

// ========== TAB CONTENT COMPONENTS ==========

function OverviewTab({
  asset,
  trustBreakdown,
  issues,
  openChat,
  onAssetUpdate,
}: {
  asset: Asset;
  trustBreakdown: { overall: number; factors: TrustFactor[]; recommendations: string[] };
  issues: any[];
  openChat: (ctx: any) => void;
  onAssetUpdate?: (updates: Partial<Asset>) => Promise<void>;
}) {
  const metadata = asset.metadata || {};

  return (
    <div className="space-y-6">
      {/* Asset Description */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-500" />
            About This Dataset
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h4>
              <p className="text-gray-900 dark:text-white">
                {asset.description || 'No description available. Run Documentarist to generate one.'}
              </p>
            </div>
            {asset.business_context && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Business Context</h4>
                <p className="text-gray-900 dark:text-white">{asset.business_context}</p>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Source System</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {asset.source_table?.split('.')[0] || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Data Layer</p>
                <Badge className={layerColors[asset.layer]}>{asset.layer}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Row Count</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {metadata.row_count?.toLocaleString() || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Refresh Schedule</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {metadata.refresh_schedule || metadata.pipeline?.schedule || 'Manual'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Governance & Classification */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Governance
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Owner</span>
                </div>
                {onAssetUpdate ? (
                  <InlineTextEdit
                    value={asset.owner}
                    onSave={async (value) => {
                      await onAssetUpdate({ owner: value });
                    }}
                    placeholder="Not assigned"
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {asset.owner || <span className="text-yellow-600">Not assigned</span>}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Steward</span>
                </div>
                {onAssetUpdate ? (
                  <InlineTextEdit
                    value={asset.steward}
                    onSave={async (value) => {
                      await onAssetUpdate({ steward: value });
                    }}
                    placeholder="Not assigned"
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {asset.steward || <span className="text-yellow-600">Not assigned</span>}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Classification</span>
                </div>
                {onAssetUpdate ? (
                  <InlineSelectEdit
                    value={metadata.data_classification || 'internal'}
                    options={[
                      { value: 'public', label: 'Public' },
                      { value: 'internal', label: 'Internal' },
                      { value: 'confidential', label: 'Confidential' },
                      { value: 'restricted', label: 'Restricted' },
                    ]}
                    onSave={async (value) => {
                      await onAssetUpdate({ metadata: { ...metadata, data_classification: value } } as any);
                    }}
                    placeholder="Select..."
                  />
                ) : (
                  <Badge
                    className={
                      metadata.data_classification === 'restricted'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : metadata.data_classification === 'confidential'
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : metadata.data_classification === 'internal'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }
                  >
                    {metadata.data_classification || 'Internal'}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-500" />
              Sensitive Data
            </h3>
            {metadata.sensitive_columns && metadata.sensitive_columns.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {metadata.sensitive_columns.length} sensitive column(s) detected
                </p>
                <div className="flex flex-wrap gap-2">
                  {metadata.sensitive_columns.map((col) => (
                    <Badge
                      key={col}
                      className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                    >
                      <Lock className="h-3 w-3 mr-1" />
                      {col}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 mx-auto text-green-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No sensitive data detected
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Business Terms */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5 text-green-500" />
            Business Terms & Glossary
          </h3>
          {metadata.business_terms && Object.keys(metadata.business_terms).length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(metadata.business_terms).map(([term, definition]) => (
                <div
                  key={term}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                >
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{term}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{definition}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <Tag className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm">No business terms mapped yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() =>
                  openChat({
                    type: 'asset',
                    id: asset.id,
                    title: asset.name,
                    prefilledPrompt: `Map business terms for the asset "${asset.name}". Identify key columns and their business meanings.`,
                    autoSend: true,
                  })
                }
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Map with AI
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tags */}
      {asset.tags && asset.tags.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Hash className="h-5 w-5 text-gray-500" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {asset.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trust Index */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            Trust Index
          </h3>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-base font-semibold text-gray-900 dark:text-white">
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
                    ? 'bg-gradient-to-r from-green-500 to-green-400'
                    : trustBreakdown.overall >= 40
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                    : 'bg-gradient-to-r from-red-500 to-red-400'
                }`}
                style={{ width: `${trustBreakdown.overall}%` }}
              />
            </div>
          </div>
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
        </CardContent>
      </Card>

      {/* Open Issues */}
      {issues.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Open Issues ({issues.length})
            </h3>
            <div className="space-y-3">
              {issues.slice(0, 5).map((issue) => (
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProfilingTab({
  asset,
  columnProfiles,
  openChat,
}: {
  asset: Asset;
  columnProfiles: ColumnProfile[];
  openChat: (ctx: any) => void;
}) {
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);

  if (!columnProfiles || columnProfiles.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Profiling Data Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Run the Documentarist agent to generate column profiles and statistics.
          </p>
          <Button
            onClick={() =>
              openChat({
                type: 'asset',
                id: asset.id,
                title: asset.name,
                prefilledPrompt: `Profile the data asset "${asset.name}" and generate column-level statistics.`,
                autoSend: true,
              })
            }
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Table2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Columns</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {columnProfiles.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Percent className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Avg. Completeness</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {(
                    100 -
                    columnProfiles.reduce((sum, c) => sum + (c.null_percentage || 0), 0) /
                      columnProfiles.length
                  ).toFixed(1)}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Hash className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Unique Columns</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {columnProfiles.filter((c) => c.distinct_percentage > 95).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Lock className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sensitive</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {columnProfiles.filter((c) => c.is_sensitive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Column Profiles Table */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            Column Profiles
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Column
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Null %
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Distinct
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Min / Max
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Top Values
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {columnProfiles.map((col) => (
                  <>
                    <tr
                      key={col.name}
                      className="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                      onClick={() =>
                        setExpandedColumn(expandedColumn === col.name ? null : col.name)
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {col.is_sensitive && (
                            <Lock className="h-3.5 w-3.5 text-red-500" />
                          )}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {col.name}
                          </span>
                          {col.inferred_semantic_type && (
                            <Badge variant="outline" className="text-xs">
                              {col.inferred_semantic_type}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {col.data_type}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-sm ${
                            col.null_percentage > 20
                              ? 'text-red-500 font-medium'
                              : col.null_percentage > 5
                              ? 'text-yellow-500'
                              : 'text-green-500'
                          }`}
                        >
                          {col.null_percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                        {col.distinct_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {col.min_value !== undefined && col.max_value !== undefined ? (
                          <span>
                            {String(col.min_value).slice(0, 15)} -{' '}
                            {String(col.max_value).slice(0, 15)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {col.top_values && col.top_values.length > 0
                          ? col.top_values
                              .slice(0, 2)
                              .map((v) => v.value)
                              .join(', ')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {col.null_percentage > 20 || col.ai_insight ? (
                          <AlertCircle className="h-4 w-4 text-yellow-500 mx-auto" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                    {expandedColumn === col.name && (
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        <td colSpan={7} className="p-4">
                          <div className="grid gap-4 md:grid-cols-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                Statistics
                              </p>
                              <div className="space-y-1 text-sm">
                                {col.mean_value !== undefined && (
                                  <p>
                                    <span className="text-gray-500">Mean:</span>{' '}
                                    {col.mean_value.toFixed(2)}
                                  </p>
                                )}
                                {col.std_dev !== undefined && (
                                  <p>
                                    <span className="text-gray-500">Std Dev:</span>{' '}
                                    {col.std_dev.toFixed(2)}
                                  </p>
                                )}
                                <p>
                                  <span className="text-gray-500">Distinct %:</span>{' '}
                                  {col.distinct_percentage.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                Value Distribution
                              </p>
                              {col.top_values && col.top_values.length > 0 ? (
                                <div className="space-y-1">
                                  {col.top_values.slice(0, 5).map((v) => (
                                    <div
                                      key={v.value}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <div className="flex-1 truncate">{v.value}</div>
                                      <Badge variant="outline" className="text-xs">
                                        {v.count}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-400">No data</p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                AI Insight
                              </p>
                              {col.ai_insight ? (
                                <p className="text-sm text-gray-700 dark:text-gray-300 bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                                  <Sparkles className="h-3 w-3 inline mr-1 text-purple-500" />
                                  {col.ai_insight}
                                </p>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    openChat({
                                      type: 'asset',
                                      id: asset.id,
                                      title: asset.name,
                                      prefilledPrompt: `Analyze the column "${col.name}" in "${asset.name}". It has ${col.null_percentage.toFixed(1)}% null values and ${col.distinct_count} distinct values. What insights can you provide?`,
                                      autoSend: true,
                                    })
                                  }
                                >
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Get AI Insight
                                </Button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QualityTab({
  asset,
  qualityRules,
  trustBreakdown,
  openChat,
}: {
  asset: Asset;
  qualityRules: QualityRule[];
  trustBreakdown: { overall: number; factors: TrustFactor[] };
  openChat: (ctx: any) => void;
}) {
  const qualityFactor = trustBreakdown.factors.find((f) => f.name === 'Quality');
  const overallQuality = qualityFactor?.score || asset.quality_score || 0;

  // Group rules by type
  const rulesByType = (qualityRules || []).reduce((acc, rule) => {
    const type = rule.rule_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(rule);
    return acc;
  }, {} as Record<string, QualityRule[]>);

  const ruleTypeLabels: Record<string, { label: string; icon: any; color: string }> = {
    completeness: { label: 'Completeness', icon: Box, color: 'text-blue-500' },
    validity: { label: 'Validity', icon: CheckCircle, color: 'text-green-500' },
    consistency: { label: 'Consistency', icon: Activity, color: 'text-purple-500' },
    timeliness: { label: 'Timeliness', icon: Clock, color: 'text-orange-500' },
    uniqueness: { label: 'Uniqueness', icon: Hash, color: 'text-pink-500' },
    accuracy: { label: 'Accuracy', icon: TrendingUp, color: 'text-cyan-500' },
  };

  return (
    <div className="space-y-6">
      {/* Quality Score Overview */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="md:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-500" />
                Data Quality Score
              </h3>
              <span
                className={`text-3xl font-bold ${
                  overallQuality >= 70
                    ? 'text-green-500'
                    : overallQuality >= 40
                    ? 'text-yellow-500'
                    : 'text-red-500'
                }`}
              >
                {overallQuality.toFixed(0)}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  overallQuality >= 70
                    ? 'bg-green-500'
                    : overallQuality >= 40
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${overallQuality}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Active Rules</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {(qualityRules || []).filter((r) => r.is_active).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Passing Rules</p>
            <p className="text-2xl font-bold text-green-500">
              {(qualityRules || []).filter((r) => (r.pass_rate || 0) >= (r.threshold || 95)).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quality Rules by Type */}
      {qualityRules && qualityRules.length > 0 ? (
        <div className="space-y-4">
          {Object.entries(rulesByType).map(([type, rules]) => {
            const typeInfo = ruleTypeLabels[type] || {
              label: type,
              icon: Shield,
              color: 'text-gray-500',
            };
            const TypeIcon = typeInfo.icon;
            return (
              <Card key={type}>
                <CardContent className="p-5">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
                    {typeInfo.label} Rules
                    <Badge variant="outline" className="ml-auto">
                      {rules.length}
                    </Badge>
                  </h4>
                  <div className="space-y-3">
                    {rules.map((rule) => {
                      const passing = (rule.pass_rate || 0) >= (rule.threshold || 95);
                      return (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                        >
                          <div className="flex items-center gap-3">
                            {passing ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">
                                {rule.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {rule.expression.slice(0, 50)}
                                {rule.expression.length > 50 ? '...' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p
                                className={`text-sm font-medium ${
                                  passing ? 'text-green-500' : 'text-red-500'
                                }`}
                              >
                                {(rule.pass_rate || 0).toFixed(1)}%
                              </p>
                              <p className="text-xs text-gray-400">
                                threshold: {rule.threshold || 95}%
                              </p>
                            </div>
                            <Badge
                              className={
                                rule.severity === 'critical'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : rule.severity === 'high'
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                              }
                            >
                              {rule.severity}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-10 text-center">
            <Shield className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Quality Rules Configured
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Generate quality rules based on the data profile to monitor data quality.
            </p>
            <Button
              onClick={() =>
                openChat({
                  type: 'asset',
                  id: asset.id,
                  title: asset.name,
                  prefilledPrompt: `Generate quality rules for "${asset.name}" based on its data profile. Include rules for completeness, validity, and consistency.`,
                  autoSend: true,
                })
              }
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Quality Rules
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PreviewTab({
  asset,
  sampleData,
}: {
  asset: Asset;
  sampleData: { columns: any[]; rows: any[]; total: number };
}) {
  const [page, setPage] = useState(0);
  const pageSize = 10;

  if (!sampleData.rows || sampleData.rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <Table2 className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Data Preview Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {asset.source_table
              ? 'Unable to fetch sample data from the source table.'
              : 'No source table configured for this asset.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Table2 className="h-5 w-5 text-green-500" />
            Data Preview
          </h3>
          <Badge variant="outline">{sampleData.total.toLocaleString()} total rows</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                {sampleData.columns.map((col) => (
                  <th
                    key={col.name}
                    className="px-4 py-3 text-left whitespace-nowrap"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{col.name}</span>
                      <span className="text-xs font-normal text-gray-400 lowercase">{col.type}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sampleData.rows.slice(page * pageSize, (page + 1) * pageSize).map((row, idx) => (
                <tr
                  key={idx}
                  className="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  {Object.entries(row).map(([key, value]) => (
                    <td
                      key={key}
                      className={`px-4 py-3 max-w-[200px] truncate text-sm ${
                        value === null
                          ? 'text-red-500 italic'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {value === null ? 'NULL' : String(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sampleData.rows.length)} of {sampleData.rows.length} sample rows
          </span>
          {sampleData.rows.length > pageSize && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * pageSize >= sampleData.rows.length}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LineageTab({
  asset,
  lineage,
  openChat,
}: {
  asset: Asset;
  lineage: { upstream: LineageAsset[]; downstream: LineageAsset[] };
  openChat: (ctx: any) => void;
}) {
  const [expandedPipeline, setExpandedPipeline] = useState<string | null>(null);
  const [lineageData, setLineageData] = useState<{
    upstream: { assets: LineageAsset[]; pipelines: PipelineInfo[]; sqlSourceTables?: string[] };
    downstream: { assets: LineageAsset[]; pipelines: PipelineInfo[]; consumers?: Consumer[] };
    aiExplanation?: string;
  } | null>(null);
  const [isLoadingLineage, setIsLoadingLineage] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* AI Explanation */}
      {lineageData?.aiExplanation ? (
        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10">
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Lineage Explanation
            </h3>
            <p className="text-gray-700 dark:text-gray-300">{lineageData.aiExplanation}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-5 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Get an AI explanation of how data flows through this asset
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                openChat({
                  type: 'asset',
                  id: asset.id,
                  title: asset.name,
                  prefilledPrompt: `Explain the data lineage for "${asset.name}". Where does the data come from, how is it transformed, and where does it go?`,
                  autoSend: true,
                })
              }
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Explain Lineage
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Visual Flow Diagram */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-500" />
            Data Flow
            {isLoadingLineage && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </h3>

          <div className="grid md:grid-cols-3 gap-4">
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
              {incomingPipelines.length > 0 && (
                <div className="mb-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-blue-500">
                    <Workflow className="h-3 w-3" />
                    <span className="font-mono">{incomingPipelines[0]?.name}</span>
                  </div>
                  <ArrowDownRight className="h-5 w-5 text-blue-400 mx-auto" />
                </div>
              )}

              <div className="p-4 rounded-lg border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-center min-w-[150px]">
                <Database className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{asset.name}</p>
                <Badge className={`mt-1 ${layerColors[asset.layer]}`}>{asset.layer}</Badge>
              </div>

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
                Downstream ({downstreamAssets.length + consumers.length})
              </h4>
              {downstreamAssets.length > 0 || consumers.length > 0 ? (
                <div className="space-y-2">
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-center">
                  <p className="text-sm text-gray-400 italic">No downstream consumers</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Details */}
      {(incomingPipelines.length > 0 || outgoingPipelines.length > 0) && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Code2 className="h-5 w-5 text-blue-500" />
              Transformation Pipelines
            </h3>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TransformationsTab({
  asset,
  openChat,
}: {
  asset: Asset;
  openChat: (ctx: any) => void;
}) {
  // In a real implementation, this would fetch transformation suggestions from agents
  const [transformations, setTransformations] = useState<
    {
      id: string;
      agent: string;
      type: string;
      description: string;
      status: 'suggested' | 'applied' | 'rejected';
      created_at: string;
    }[]
  >([]);

  return (
    <div className="space-y-6">
      {/* Agent Suggestions */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI-Suggested Improvements
          </h3>

          {transformations.length > 0 ? (
            <div className="space-y-3">
              {transformations.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{t.agent}</Badge>
                        <Badge
                          className={
                            t.status === 'applied'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : t.status === 'rejected'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }
                        >
                          {t.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white font-medium">{t.type}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t.description}
                      </p>
                    </div>
                    {t.status === 'suggested' && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Apply
                        </Button>
                        <Button variant="ghost" size="sm">
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Transformations Yet
              </h4>
              <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
                Let AI agents analyze your data and suggest improvements like data mastering,
                cleansing, or standardization.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  onClick={() =>
                    openChat({
                      type: 'asset',
                      id: asset.id,
                      title: asset.name,
                      prefilledPrompt: `Analyze "${asset.name}" and suggest data quality improvements. What transformations could improve this dataset?`,
                      autoSend: true,
                    })
                  }
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Suggest Improvements
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    openChat({
                      type: 'asset',
                      id: asset.id,
                      title: asset.name,
                      prefilledPrompt: `Create a mastered/golden version of "${asset.name}" by identifying and resolving duplicates, standardizing formats, and enriching data.`,
                      autoSend: true,
                    })
                  }
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Create Mastered Version
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Quick Transformation Actions
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors text-left"
              onClick={() =>
                openChat({
                  type: 'asset',
                  id: asset.id,
                  title: asset.name,
                  prefilledPrompt: `Standardize data formats in "${asset.name}". Check for inconsistent date formats, phone numbers, addresses, etc.`,
                  autoSend: true,
                })
              }
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Standardize Formats</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Normalize dates, phone numbers, and addresses to consistent formats.
              </p>
            </button>

            <button
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors text-left"
              onClick={() =>
                openChat({
                  type: 'asset',
                  id: asset.id,
                  title: asset.name,
                  prefilledPrompt: `Find and merge duplicate records in "${asset.name}". Identify potential duplicates based on name, email, or other key fields.`,
                  autoSend: true,
                })
              }
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Deduplicate</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Find and merge duplicate records using fuzzy matching.
              </p>
            </button>

            <button
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors text-left"
              onClick={() =>
                openChat({
                  type: 'asset',
                  id: asset.id,
                  title: asset.name,
                  prefilledPrompt: `Enrich "${asset.name}" with additional data. Suggest what external data sources could enhance this dataset.`,
                  autoSend: true,
                })
              }
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Enrich Data</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enhance records with additional attributes from external sources.
              </p>
            </button>

            <button
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors text-left"
              onClick={() =>
                openChat({
                  type: 'asset',
                  id: asset.id,
                  title: asset.name,
                  prefilledPrompt: `Anonymize sensitive data in "${asset.name}". Apply masking rules for PII columns like email, phone, and address.`,
                  autoSend: true,
                })
              }
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <Lock className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Mask Sensitive Data</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Apply anonymization rules to protect PII and sensitive information.
              </p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ========== MAIN PAGE COMPONENT ==========

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = use(params);
  const router = useRouter();
  const { openChat, subscribeToAgentComplete } = useChat();
  const [data, setData] = useState<AssetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAsset = useCallback(async () => {
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
  }, [assetId]);

  const handleAssetUpdate = async (updates: Partial<Asset>) => {
    try {
      // Handle classification separately (it's in metadata)
      const body: Record<string, any> = { ...updates };
      if ('metadata' in updates && updates.metadata?.data_classification) {
        body.classification = updates.metadata.data_classification;
        delete body.metadata;
      }

      const res = await fetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error('Failed to update asset');
      }

      // Refresh data
      await fetchAsset();
    } catch (err) {
      console.error('Update failed:', err);
      throw err;
    }
  };

  const handleColumnUpdate = async (columnName: string, updates: Partial<ColumnProfile>) => {
    try {
      const res = await fetch(`/api/assets/${assetId}/columns`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnName, ...updates }),
      });

      if (!res.ok) {
        throw new Error('Failed to update column');
      }

      // Refresh data
      await fetchAsset();
    } catch (err) {
      console.error('Column update failed:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchAsset();
  }, [assetId, fetchAsset]);

  // Subscribe to agent completion events to refresh data after agent runs
  useEffect(() => {
    const unsubscribe = subscribeToAgentComplete((event: AgentCompleteEvent) => {
      // Refresh data if the agent action was related to this asset
      const isRelevantAgent = event.agentUsed === 'orchestrator' || event.agentUsed === 'documentarist';
      const isRelevantAction = event.action?.type === 'run_agent' || event.toolResults;
      const isThisAsset = event.entityContext?.type === 'asset' && event.entityContext?.id === assetId;

      if (isRelevantAgent && isRelevantAction && isThisAsset) {
        // Delay slightly to ensure database writes are complete
        setTimeout(() => {
          fetchAsset();
        }, 500);
      }
    });

    return unsubscribe;
  }, [assetId, subscribeToAgentComplete, fetchAsset]);

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

  const { asset, trustBreakdown, issues, lineage, sampleData, columnProfiles, qualityRules } = data;

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
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
              {asset.owner && (
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {asset.owner}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Updated {formatDate(asset.updated_at)}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <StarRating stars={asset.trust_score_stars || 0} />
            <span className="text-sm text-gray-500">
              Trust Score: {trustBreakdown.overall.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === 'overview' && (
            <OverviewTab
              asset={asset}
              trustBreakdown={trustBreakdown}
              issues={issues}
              openChat={openChat}
              onAssetUpdate={handleAssetUpdate}
            />
          )}
          {activeTab === 'structure' && (
            <DataStructureTab
              assetId={asset.id}
              assetName={asset.name}
              columnProfiles={columnProfiles || []}
              openChat={openChat}
              onColumnUpdate={handleColumnUpdate}
            />
          )}
          {activeTab === 'profiling' && (
            <ProfilingTab
              asset={asset}
              columnProfiles={columnProfiles || []}
              openChat={openChat}
            />
          )}
          {activeTab === 'quality' && (
            <QualityTab
              asset={asset}
              qualityRules={qualityRules || []}
              trustBreakdown={trustBreakdown}
              openChat={openChat}
            />
          )}
          {activeTab === 'preview' && <PreviewTab asset={asset} sampleData={sampleData} />}
          {activeTab === 'lineage' && (
            <LineageTab asset={asset} lineage={lineage} openChat={openChat} />
          )}
          {activeTab === 'transformations' && (
            <TransformationsTab asset={asset} openChat={openChat} />
          )}
        </div>
      </main>
    </>
  );
}
