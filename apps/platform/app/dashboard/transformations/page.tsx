'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Card, CardContent, Badge, Button, Dropdown } from '@amygdala/ui';
import {
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Code,
  Database,
  Eye,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
} from 'lucide-react';

// Types
interface TransformationPlan {
  id: string;
  source_type: string;
  source_id?: string;
  target_asset: string;
  target_column?: string;
  transformation_type: string;
  description: string;
  parameters: Record<string, unknown>;
  generated_code?: string;
  rollback_code?: string;
  affected_columns: string[];
  estimated_rows?: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  iteration_count: number;
  max_iterations: number;
  final_accuracy?: number;
  accuracy_threshold: number;
  status: string;
  requested_by: string;
  created_at: string;
  updated_at: string;
  approvals?: TransformationApproval[];
  iterations?: TransformationIteration[];
  logs?: TransformationLog[];
}

interface TransformationApproval {
  id: string;
  plan_id: string;
  status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  comment?: string;
  auto_approved: boolean;
  auto_approve_reason?: string;
  expires_at: string;
  created_at: string;
}

interface TransformationIteration {
  id: string;
  plan_id: string;
  iteration_number: number;
  code: string;
  executed_at: string;
  execution_time_ms?: number;
  sample_size?: number;
  success: boolean;
  output?: Record<string, unknown>;
  error_message?: string;
  accuracy?: number;
  meets_threshold: boolean;
  evaluation_notes?: string;
  issues_found: string[];
  improvements_suggested: string[];
  sample_before?: unknown[];
  sample_after?: unknown[];
}

interface TransformationLog {
  id: string;
  plan_id: string;
  approval_id?: string;
  snapshot_id?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  rows_affected?: number;
  rows_succeeded?: number;
  rows_failed?: number;
  status: string;
  error_message?: string;
  executed_by: string;
  lineage_recorded: boolean;
}

interface Stats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  iterating: number;
}

// Config
const statusConfig: Record<string, { color: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400', label: 'Draft', icon: Clock },
  iterating: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Iterating', icon: RefreshCw },
  pending_approval: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Pending Approval', icon: Clock },
  approved: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Approved', icon: CheckCircle },
  executing: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'Executing', icon: Play },
  completed: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Completed', icon: CheckCircle },
  failed: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Failed', icon: XCircle },
  rejected: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Rejected', icon: XCircle },
  cancelled: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400', label: 'Cancelled', icon: XCircle },
};

const riskConfig: Record<string, { color: string; bgColor: string }> = {
  low: { color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  medium: { color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  high: { color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  critical: { color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};

const transformationTypeLabels: Record<string, string> = {
  format_standardization: 'Format Standardization',
  null_remediation: 'Null Remediation',
  referential_fix: 'Referential Fix',
  deduplication: 'Deduplication',
  outlier_correction: 'Outlier Correction',
  classification: 'Classification',
  custom_sql: 'Custom SQL',
};

// Helpers
function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAccuracy(accuracy?: number): string {
  if (accuracy === undefined || accuracy === null) return '-';
  return `${(accuracy * 100).toFixed(1)}%`;
}

function getTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff < 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

// Preview Modal
function TransformationPreviewModal({
  plan,
  onClose,
  onApprove,
  onReject,
  onExecute,
}: {
  plan: TransformationPlan;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onExecute: () => void;
}) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'iterations'>('overview');

  const lastIteration = plan.iterations?.sort((a, b) => b.iteration_number - a.iteration_number)[0];
  const status = statusConfig[plan.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const risk = riskConfig[plan.risk_level] || riskConfig.medium;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-pink-100 dark:bg-pink-900/30 p-2">
                  <RefreshCw className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Transformation Preview
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {transformationTypeLabels[plan.transformation_type] || plan.transformation_type}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 mt-4">
            <Badge className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
            <Badge className={`${risk.bgColor} ${risk.color}`}>
              <Shield className="h-3 w-3 mr-1" />
              {plan.risk_level.charAt(0).toUpperCase() + plan.risk_level.slice(1)} Risk
            </Badge>
            {plan.final_accuracy !== undefined && (
              <Badge variant={plan.final_accuracy >= plan.accuracy_threshold ? 'success' : 'warning'}>
                {formatAccuracy(plan.final_accuracy)} Accuracy
              </Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6">
          <div className="flex gap-4">
            {(['overview', 'code', 'iterations'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </h3>
                <p className="text-gray-900 dark:text-white">{plan.description}</p>
              </div>

              {/* Target */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Asset
                  </h3>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white font-mono">
                      {plan.target_asset}
                    </span>
                  </div>
                </div>
                {plan.target_column && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Target Column
                    </h3>
                    <span className="text-gray-900 dark:text-white font-mono">
                      {plan.target_column}
                    </span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {plan.estimated_rows?.toLocaleString() || '-'}
                  </p>
                  <p className="text-sm text-gray-500">Estimated Rows</p>
                </Card>
                <Card className="p-4">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {plan.iteration_count}
                  </p>
                  <p className="text-sm text-gray-500">Iterations</p>
                </Card>
                <Card className="p-4">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {formatAccuracy(plan.final_accuracy)}
                  </p>
                  <p className="text-sm text-gray-500">Final Accuracy</p>
                </Card>
                <Card className="p-4">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {formatAccuracy(plan.accuracy_threshold)}
                  </p>
                  <p className="text-sm text-gray-500">Threshold</p>
                </Card>
              </div>

              {/* Sample data preview */}
              {lastIteration?.sample_before && lastIteration.sample_before.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sample Data Preview (Before → After)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-3">
                      <p className="text-xs text-gray-500 mb-2">Before</p>
                      <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto max-h-32">
                        {JSON.stringify(lastIteration.sample_before.slice(0, 3), null, 2)}
                      </pre>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs text-gray-500 mb-2">After</p>
                      <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto max-h-32">
                        {JSON.stringify(lastIteration.sample_after?.slice(0, 3), null, 2)}
                      </pre>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Generated Transformation Code
                </h3>
                <pre className="text-sm bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto max-h-96">
                  {plan.generated_code || 'No code generated yet'}
                </pre>
              </div>
              {plan.rollback_code && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Rollback Code
                  </h3>
                  <pre className="text-sm bg-gray-900 text-yellow-400 p-4 rounded-lg overflow-x-auto max-h-48">
                    {plan.rollback_code}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'iterations' && (
            <div className="space-y-4">
              {plan.iterations && plan.iterations.length > 0 ? (
                plan.iterations
                  .sort((a, b) => b.iteration_number - a.iteration_number)
                  .map((iteration) => (
                    <Card key={iteration.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={iteration.success ? 'success' : 'danger'}>
                            Iteration {iteration.iteration_number}
                          </Badge>
                          <Badge variant={iteration.meets_threshold ? 'success' : 'warning'}>
                            {formatAccuracy(iteration.accuracy)}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(iteration.executed_at)}
                        </span>
                      </div>

                      {iteration.evaluation_notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {iteration.evaluation_notes}
                        </p>
                      )}

                      {iteration.issues_found && iteration.issues_found.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-red-600 dark:text-red-400">Issues:</p>
                          <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
                            {iteration.issues_found.map((issue, i) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {iteration.improvements_suggested && iteration.improvements_suggested.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Improvements:</p>
                          <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
                            {iteration.improvements_suggested.map((improvement, i) => (
                              <li key={i}>{improvement}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </Card>
                  ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No iterations recorded yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          {showRejectInput ? (
            <div className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowRejectInput(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    onReject(rejectReason);
                    setShowRejectInput(false);
                  }}
                  disabled={!rejectReason.trim()}
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between">
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              <div className="flex gap-2">
                {plan.status === 'pending_approval' && (
                  <>
                    <Button variant="outline" onClick={() => setShowRejectInput(true)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button onClick={onApprove}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </>
                )}
                {plan.status === 'approved' && (
                  <Button onClick={onExecute}>
                    <Play className="h-4 w-4 mr-2" />
                    Execute
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Summary Stats
function SummaryStats({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-2">
            <Database className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-yellow-100 dark:bg-yellow-900/30 p-2">
            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.pending}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2">
            <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.iterating}</p>
            <p className="text-sm text-gray-500">Iterating</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.completed}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-red-100 dark:bg-red-900/30 p-2">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.failed}</p>
            <p className="text-sm text-gray-500">Failed</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Transformation Card
function TransformationCard({
  plan,
  onPreview,
}: {
  plan: TransformationPlan;
  onPreview: () => void;
}) {
  const status = statusConfig[plan.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const risk = riskConfig[plan.risk_level] || riskConfig.medium;
  const pendingApproval = plan.approvals?.find((a) => a.status === 'pending');

  return (
    <Card className="overflow-hidden">
      <div className={`h-1 ${plan.status === 'pending_approval' ? 'bg-yellow-500' : 'bg-pink-500'}`} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-pink-100 dark:bg-pink-900/30 p-2">
              <RefreshCw className={`h-4 w-4 text-pink-600 dark:text-pink-400 ${plan.status === 'iterating' || plan.status === 'executing' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">
                {plan.description}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {plan.target_asset}
                {plan.target_column && ` → ${plan.target_column}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${risk.bgColor} ${risk.color}`}>
              {plan.risk_level}
            </Badge>
            <Badge className={status.color}>
              <StatusIcon className={`h-3 w-3 mr-1 ${plan.status === 'iterating' || plan.status === 'executing' ? 'animate-spin' : ''}`} />
              {status.label}
            </Badge>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Type</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {transformationTypeLabels[plan.transformation_type] || plan.transformation_type}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Iterations</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {plan.iteration_count} / {plan.max_iterations}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Accuracy</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatAccuracy(plan.final_accuracy)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Created</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatDate(plan.created_at)}
            </p>
          </div>
        </div>

        {pendingApproval && (
          <div className="mt-3 flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                Approval needed
              </span>
            </div>
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              {getTimeRemaining(pendingApproval.expires_at)}
            </span>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={onPreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TransformationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [plans, setPlans] = useState<TransformationPlan[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, completed: 0, failed: 0, iterating: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<TransformationPlan | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const initialStatus = searchParams.get('status') || 'all';
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  const updateFilter = (value: string) => {
    setStatusFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') params.delete('status');
    else params.set('status', value);
    const newUrl = params.toString() ? `?${params.toString()}` : '/dashboard/transformations';
    router.replace(newUrl);
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/agents/transformation/history?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setPlans(data.plans || []);
        setStats(data.stats || { total: 0, pending: 0, completed: 0, failed: 0, iterating: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch transformations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleApprove = async () => {
    if (!selectedPlan) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/agents/transformation/${selectedPlan.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', reviewer: 'current-user' }),
      });

      if (res.ok) {
        setSelectedPlan(null);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!selectedPlan) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/agents/transformation/${selectedPlan.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      });

      if (res.ok) {
        setSelectedPlan(null);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedPlan) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/agents/transformation/${selectedPlan.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', operator: 'current-user' }),
      });

      if (res.ok) {
        setSelectedPlan(null);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to execute:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Separate pending approvals
  const pendingApprovals = plans.filter((p) => p.status === 'pending_approval');
  const otherPlans = plans.filter((p) => p.status !== 'pending_approval');

  return (
    <>
      <Header
        title="Transformations"
        icon={<RefreshCw className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      <main className="p-6 space-y-6">
        <SummaryStats stats={stats} />

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Dropdown
            placeholder="Status"
            value={statusFilter}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'pending_approval', label: 'Pending Approval' },
              { value: 'iterating', label: 'Iterating' },
              { value: 'approved', label: 'Approved' },
              { value: 'completed', label: 'Completed' },
              { value: 'failed', label: 'Failed' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            onChange={updateFilter}
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {plans.length} transformations
          </span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
          </div>
        )}

        {/* Pending Approvals Queue */}
        {!isLoading && pendingApprovals.length > 0 && statusFilter === 'all' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Pending Approvals ({pendingApprovals.length})
            </h2>
            <div className="space-y-4">
              {pendingApprovals.map((plan) => (
                <TransformationCard
                  key={plan.id}
                  plan={plan}
                  onPreview={() => setSelectedPlan(plan)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Other Transformations */}
        {!isLoading && (statusFilter !== 'all' ? plans : otherPlans).length > 0 && (
          <div>
            {statusFilter === 'all' && pendingApprovals.length > 0 && (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                All Transformations
              </h2>
            )}
            <div className="space-y-4">
              {(statusFilter !== 'all' ? plans : otherPlans).map((plan) => (
                <TransformationCard
                  key={plan.id}
                  plan={plan}
                  onPreview={() => setSelectedPlan(plan)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && plans.length === 0 && (
          <Card className="p-12 text-center">
            <RefreshCw className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No transformations found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {statusFilter === 'all'
                ? 'Create a transformation from an issue or use the chat to get started.'
                : 'Try adjusting your filters to see more transformations.'}
            </p>
          </Card>
        )}
      </main>

      {/* Preview Modal */}
      {selectedPlan && (
        <TransformationPreviewModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onExecute={handleExecute}
        />
      )}
    </>
  );
}

function LoadingFallback() {
  return (
    <>
      <Header
        title="Transformations"
        icon={<RefreshCw className="h-5 w-5" />}
      />
      <main className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      </main>
    </>
  );
}

export default function TransformationsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TransformationsContent />
    </Suspense>
  );
}
