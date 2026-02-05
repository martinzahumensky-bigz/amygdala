'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Card, CardContent, Badge, Button, Dropdown } from '@amygdala/ui';
import { useChat, AgentCompleteEvent } from '@/contexts/ChatContext';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  User,
  Wrench,
  MessageSquare,
  CheckCircle,
  XCircle,
  ChevronRight,
  Eye,
  FileText,
  Database,
  Loader2,
  Lightbulb,
  History,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface Issue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue_type: string;
  affected_assets: string[];
  status: string;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolution?: string;
  resolved_at?: string;
  metadata?: Record<string, unknown>;
}

interface AgentReasoning {
  detectedBy: string;
  checkType: string;
  threshold?: number;
  actualValue?: number;
  column?: string;
  table?: string;
  detectionMethod: string;
  details: Record<string, unknown>;
}

interface Activity {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details: string;
}

interface IssueDetail {
  issue: Issue;
  agentReasoning: AgentReasoning;
  sampleRecords: Record<string, unknown>[];
  affectedAssets: any[];
  relatedLogs: any[];
  activities: Activity[];
  recommendations: string[];
}

const severityColors = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

const statusColors: Record<string, string> = {
  open: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  investigating: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

function WorkflowTimeline({ status }: { status: string }) {
  const steps = ['open', 'investigating', 'in_progress', 'resolved'];
  const currentIndex = steps.indexOf(status);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = step === status;

        return (
          <div key={step} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                isActive
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : 'border-gray-300 text-gray-400 dark:border-gray-600'
              } ${isCurrent ? 'ring-2 ring-purple-300 ring-offset-2 dark:ring-offset-gray-900' : ''}`}
            >
              {isActive ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <span className="text-xs">{index + 1}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 ${
                  index < currentIndex ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function IssueDetailPage({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = use(params);
  const router = useRouter();
  const { openChat, subscribeToAgentComplete } = useChat();
  const [data, setData] = useState<IssueDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showTransformModal, setShowTransformModal] = useState(false);
  const [isCreatingTransform, setIsCreatingTransform] = useState(false);
  const [transformationType, setTransformationType] = useState<string>('null_remediation');

  const fetchIssue = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/issues/${issueId}`);
      if (!res.ok) {
        throw new Error('Issue not found');
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load issue');
    } finally {
      setIsLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    fetchIssue();
  }, [issueId, fetchIssue]);

  // Subscribe to agent completion events to refresh data after agents run
  useEffect(() => {
    const unsubscribe = subscribeToAgentComplete((event: AgentCompleteEvent) => {
      // Refresh if any agent action completed related to this issue
      const isRelevantAgent = event.agentUsed === 'orchestrator' || event.agentUsed === 'debugger' || event.agentUsed === 'spotter';
      const isRelevantAction = event.action?.type === 'run_agent' || event.toolResults;
      const isThisIssue = event.entityContext?.type === 'issue' && event.entityContext?.id === issueId;

      if (isRelevantAgent && isRelevantAction && isThisIssue) {
        setTimeout(() => fetchIssue(), 500);
      }
    });

    return unsubscribe;
  }, [issueId, subscribeToAgentComplete, fetchIssue]);

  const updateStatus = async (newStatus: string) => {
    if (!data) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const result = await res.json();
        setData((prev) => prev ? { ...prev, issue: result.issue } : null);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const createTransformation = async () => {
    if (!data) return;

    setIsCreatingTransform(true);
    try {
      const targetAsset = data.issue.affected_assets?.[0] || data.agentReasoning?.table || '';
      const targetColumn = data.agentReasoning?.column;

      const res = await fetch('/api/agents/transformation/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'issue',
          sourceId: data.issue.id,
          targetAsset,
          targetColumn,
          transformationType,
          description: `Fix: ${data.issue.title}`,
          parameters: {
            issueType: data.issue.issue_type,
            severity: data.issue.severity,
            metadata: data.issue.metadata,
          },
          requestedBy: 'current-user',
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setShowTransformModal(false);
        router.push(`/dashboard/transformations?highlight=${result.plan?.id}`);
      } else {
        const errorData = await res.json();
        console.error('Failed to create transformation:', errorData);
      }
    } catch (err) {
      console.error('Failed to create transformation:', err);
    } finally {
      setIsCreatingTransform(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <>
        <Header
          title="Issue Details"
          icon={<AlertTriangle className="h-5 w-5" />}
          actions={
            <Link href="/dashboard/issues">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Issues
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
          title="Issue Details"
          icon={<AlertTriangle className="h-5 w-5" />}
          actions={
            <Link href="/dashboard/issues">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Issues
              </Button>
            </Link>
          }
        />
        <main className="p-6">
          <Card className="p-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {error || 'Issue not found'}
            </h3>
            <Link href="/dashboard/issues">
              <Button>Return to Issues</Button>
            </Link>
          </Card>
        </main>
      </>
    );
  }

  const { issue, agentReasoning, sampleRecords, affectedAssets, activities, recommendations } = data;

  return (
    <>
      <Header
        title={issue.title}
        icon={<AlertTriangle className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/issues">
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
                  type: 'issue',
                  id: issue.id,
                  title: issue.title,
                  prefilledPrompt: `Help me understand and resolve this ${issue.severity} severity issue: "${issue.title}". The issue type is ${issue.issue_type.replace('_', ' ')}.`,
                })
              }
            >
              <MessageSquare className="h-4 w-4" />
              Open in Chat
            </Button>
          </div>
        }
      />

      <main className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={severityColors[issue.severity]}>{issue.severity}</Badge>
              <Badge className={statusColors[issue.status] || statusColors.open}>
                {issue.status.replace('_', ' ')}
              </Badge>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {issue.issue_type.replace('_', ' ')}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl">{issue.description}</p>
          </div>

          <div className="flex items-center gap-3">
            <Dropdown
              placeholder="Status"
              value={issue.status}
              options={statusOptions}
              onChange={updateStatus}
            />
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </div>

        {/* Workflow Timeline */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              Issue Workflow
            </h3>
            <div className="flex items-center justify-between">
              <WorkflowTimeline status={issue.status} />
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <Clock className="inline h-4 w-4 mr-1" />
                Created {formatDate(issue.created_at)}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Agent Reasoning */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5 text-cyan-500" />
                Detection Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Detected by</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {agentReasoning.detectedBy} Agent
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Check Type</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {agentReasoning.checkType?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Detection Method</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {agentReasoning.detectionMethod}
                  </span>
                </div>
                {agentReasoning.threshold !== undefined && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Threshold</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {agentReasoning.threshold}%
                    </span>
                  </div>
                )}
                {agentReasoning.actualValue !== undefined && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Actual Value</span>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      {typeof agentReasoning.actualValue === 'number'
                        ? agentReasoning.actualValue.toFixed(2)
                        : agentReasoning.actualValue}
                      %
                    </span>
                  </div>
                )}
                {agentReasoning.table && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Affected Table</span>
                    <span className="text-sm font-mono text-purple-600 dark:text-purple-400">
                      {agentReasoning.table}
                      {agentReasoning.column && `.${agentReasoning.column}`}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Affected Assets */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-500" />
                Affected Assets ({issue.affected_assets?.length || 0})
              </h3>
              {affectedAssets.length > 0 ? (
                <div className="space-y-2">
                  {affectedAssets.map((asset) => (
                    <Link
                      key={asset.id}
                      href={`/dashboard/catalog/${asset.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{asset.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {asset.asset_type} · {asset.layer}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            asset.fitness_status === 'green'
                              ? 'bg-green-500'
                              : asset.fitness_status === 'amber'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                        />
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {issue.affected_assets?.map((assetName) => (
                    <div
                      key={assetName}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <span className="font-medium text-gray-900 dark:text-white font-mono">
                        {assetName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sample Records */}
        {sampleRecords.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                Sample Affected Records
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                      {Object.keys(sampleRecords[0] || {})
                        .slice(0, 6)
                        .map((key) => (
                          <th
                            key={key}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                          >
                            {key}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sampleRecords.map((record, idx) => (
                      <tr
                        key={idx}
                        className="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        {Object.entries(record)
                          .slice(0, 6)
                          .map(([key, value]) => (
                            <td
                              key={key}
                              className={`px-4 py-3 text-sm ${
                                value === null
                                  ? 'text-red-500 italic'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {value === null ? 'NULL' : String(value).slice(0, 30)}
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
                  Showing {sampleRecords.length} sample records
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recommendations */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Recommendations
              </h3>
              <ul className="space-y-3">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-medium text-purple-600 dark:text-purple-400">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{rec}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Activity History */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <History className="h-5 w-5 text-blue-500" />
                Activity Timeline
              </h3>
              <div className="space-y-4">
                {activities.map((activity, idx) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          idx === activities.length - 1 ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                      {idx < activities.length - 1 && (
                        <div className="w-px h-full bg-gray-200 dark:bg-gray-700" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.actor} · {formatDate(activity.timestamp)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {activity.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                className="gap-2"
                onClick={() =>
                  openChat({
                    type: 'issue',
                    id: issue.id,
                    title: issue.title,
                    prefilledPrompt: `Analyze this issue with the Debugger agent: "${issue.title}". Investigate the root cause and propose a solution.`,
                    autoSend: true,
                  })
                }
              >
                <Wrench className="h-4 w-4" />
                Analyze with Debugger
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-pink-300 text-pink-600 hover:bg-pink-50 dark:border-pink-700 dark:text-pink-400 dark:hover:bg-pink-900/20"
                onClick={() => setShowTransformModal(true)}
              >
                <RefreshCw className="h-4 w-4" />
                Apply Fix
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => updateStatus('investigating')}>
                <User className="h-4 w-4" />
                Assign to Me
              </Button>
              {issue.affected_assets?.[0] && (
                <Link href={`/dashboard/catalog`}>
                  <Button variant="outline" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    View in Catalog
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Apply Fix / Transformation Modal */}
      {showTransformModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-pink-100 dark:bg-pink-900/30 p-2">
                <RefreshCw className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Apply Fix with Transformation Agent
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create an automated fix for this issue
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Issue
                </label>
                <p className="text-gray-900 dark:text-white font-medium">{issue.title}</p>
                <p className="text-sm text-gray-500">{issue.issue_type.replace('_', ' ')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Asset
                </label>
                <p className="font-mono text-gray-900 dark:text-white">
                  {issue.affected_assets?.[0] || agentReasoning?.table || 'Unknown'}
                  {agentReasoning?.column && (
                    <span className="text-purple-600 dark:text-purple-400">
                      .{agentReasoning.column}
                    </span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Transformation Type
                </label>
                <Dropdown
                  placeholder="Select type"
                  value={transformationType}
                  options={[
                    { value: 'null_remediation', label: 'Null Remediation - Fill missing values' },
                    { value: 'format_standardization', label: 'Format Standardization - Fix formats' },
                    { value: 'outlier_correction', label: 'Outlier Correction - Fix anomalies' },
                    { value: 'referential_fix', label: 'Referential Fix - Fix relationships' },
                    { value: 'deduplication', label: 'Deduplication - Remove duplicates' },
                    { value: 'custom_sql', label: 'Custom SQL - Write custom fix' },
                  ]}
                  onChange={(value) => setTransformationType(value)}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium">AI-Powered Fix</p>
                    <p className="text-blue-600 dark:text-blue-400">
                      The Transformation Agent will analyze the issue, generate code to fix it,
                      and iterate until it achieves 95% accuracy. You&apos;ll review and approve before execution.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowTransformModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={createTransformation}
                disabled={isCreatingTransform}
                className="bg-pink-600 hover:bg-pink-700"
              >
                {isCreatingTransform ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Create Transformation
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
