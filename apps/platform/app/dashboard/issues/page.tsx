'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Card, Badge, Button, Avatar, Dropdown } from '@amygdala/ui';
import {
  AlertTriangle,
  Plus,
  MessageSquare,
  Calendar,
  MoreVertical,
  Flag,
  List,
  Eye,
  Wrench,
  CheckCircle,
  RefreshCw,
  Loader2,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useChat, AgentCompleteEvent } from '@/contexts/ChatContext';

interface Issue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue_type: string;
  affected_assets: string[];
  status: 'open' | 'investigating' | 'in_progress' | 'resolved' | 'closed';
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolution: string | null;
  resolved_at: string | null;
}

interface IssueCounts {
  total: number;
  open: number;
  investigating: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

const severityConfig = {
  critical: { color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', icon: AlertTriangle },
  high: { color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800', icon: Flag },
  medium: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800', icon: AlertCircle },
  low: { color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800', icon: Clock },
};

const statusConfig = {
  open: { color: 'border-red-400 bg-red-50 dark:bg-red-900/20', label: 'Open', icon: AlertTriangle },
  investigating: { color: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20', label: 'Investigating', icon: Eye },
  in_progress: { color: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20', label: 'In Progress', icon: Wrench },
  resolved: { color: 'border-green-400 bg-green-50 dark:bg-green-900/20', label: 'Resolved', icon: CheckCircle },
  closed: { color: 'border-gray-400 bg-gray-50 dark:bg-gray-800', label: 'Closed', icon: XCircle },
};

const issueTypeConfig: Record<string, { color: string; label: string }> = {
  anomaly: { color: 'border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400', label: 'Anomaly' },
  quality_failure: { color: 'border-red-300 text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400', label: 'Quality Failure' },
  missing_data: { color: 'border-yellow-300 text-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Missing Data' },
  freshness: { color: 'border-orange-300 text-orange-700 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400', label: 'Freshness' },
  missing_reference: { color: 'border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400', label: 'Invalid Reference' },
  ownership_missing: { color: 'border-pink-300 text-pink-700 bg-pink-50 dark:bg-pink-900/30 dark:text-pink-400', label: 'Missing Ownership' },
};

const columns = [
  { id: 'open', title: 'Open', statuses: ['open'] },
  { id: 'in_progress', title: 'In Progress', statuses: ['investigating', 'in_progress'] },
  { id: 'done', title: 'Done', statuses: ['resolved', 'closed'] },
];

function IssueCard({ issue, onStatusChange }: { issue: Issue; onStatusChange: (id: string, status: string) => void }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const severity = severityConfig[issue.severity] || severityConfig.medium;
  const SeverityIcon = severity.icon;
  const issueType = issueTypeConfig[issue.issue_type] || { color: 'border-gray-300 text-gray-700 bg-gray-50', label: issue.issue_type };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await onStatusChange(issue.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const getAgentIcon = (createdBy: string) => {
    switch (createdBy.toLowerCase()) {
      case 'spotter':
        return <Eye className="h-3 w-3 text-cyan-500" />;
      case 'debugger':
        return <Wrench className="h-3 w-3 text-orange-500" />;
      case 'quality':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className="group cursor-pointer transition-shadow hover:shadow-md">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <SeverityIcon className={`h-4 w-4 mt-0.5 ${issue.severity === 'critical' ? 'text-red-500' : issue.severity === 'high' ? 'text-orange-500' : issue.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'}`} />
            <h3 className="font-medium text-gray-900 dark:text-white text-sm leading-tight">{issue.title}</h3>
          </div>
          <Dropdown
            placeholder=""
            value={issue.status}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'investigating', label: 'Investigating' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
            ]}
            onChange={(value) => handleStatusChange(value)}
            className="min-w-[100px] text-xs"
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${issueType.color}`}>
            {issueType.label}
          </span>
          <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${severity.color}`}>
            {issue.severity}
          </span>
        </div>

        <p className="mt-3 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
          {issue.description}
        </p>

        {issue.affected_assets && issue.affected_assets.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {issue.affected_assets.slice(0, 2).map((asset, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                <List className="h-3 w-3" />
                {asset}
              </span>
            ))}
            {issue.affected_assets.length > 2 && (
              <span className="text-xs text-gray-500">+{issue.affected_assets.length - 2} more</span>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            {getAgentIcon(issue.created_by)}
            <span>{issue.created_by}</span>
            <span>·</span>
            <span title={formatDate(issue.created_at)}>{formatTime(issue.created_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
            <Link
              href={`/dashboard/issues/${issue.id}`}
              className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              View <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function IssuesPage() {
  const { subscribeToAgentComplete } = useChat();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [counts, setCounts] = useState<IssueCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const fetchIssues = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const res = await fetch(`/api/issues?${params.toString()}`);
      const data = await res.json();
      setIssues(data.issues || []);
      setCounts(data.counts || null);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Subscribe to agent completion events to refresh issues after Spotter or other agents run
  useEffect(() => {
    const unsubscribe = subscribeToAgentComplete((event: AgentCompleteEvent) => {
      // Refresh issues when Spotter or other agents that might create/update issues complete
      const isRelevantAgent = event.agentUsed === 'orchestrator' || event.agentUsed === 'spotter' || event.agentUsed === 'debugger';
      const isRelevantAction = event.action?.type === 'run_agent' || event.toolResults;

      if (isRelevantAgent && isRelevantAction) {
        setTimeout(() => fetchIssues(), 500);
      }
    });

    return unsubscribe;
  }, [subscribeToAgentComplete, fetchIssues]);

  const handleStatusChange = async (issueId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/issues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: issueId, status: newStatus }),
      });

      if (res.ok) {
        await fetchIssues();
      }
    } catch (error) {
      console.error('Failed to update issue:', error);
    }
  };

  const getIssuesByColumn = (columnId: string) => {
    const column = columns.find((c) => c.id === columnId);
    if (!column) return [];

    let filtered = issues.filter((issue) => column.statuses.includes(issue.status));

    if (severityFilter !== 'all') {
      filtered = filtered.filter((issue) => issue.severity === severityFilter);
    }

    return filtered;
  };

  const refreshIssues = () => {
    setIsLoading(true);
    fetchIssues();
  };

  return (
    <>
      <Header
        title="Issues"
        icon={<AlertTriangle className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshIssues} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Issue
            </Button>
          </div>
        }
      />

      <main className="p-6 space-y-4">
        {/* Summary Stats */}
        {counts && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="p-3">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">{counts.total}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
            </Card>
            <Card className="p-3 border-l-4 border-l-red-500">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">{counts.open}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Open</div>
            </Card>
            <Card className="p-3 border-l-4 border-l-orange-500">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">{counts.investigating}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Investigating</div>
            </Card>
            <Card className="p-3 border-l-4 border-l-blue-500">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">{counts.in_progress}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">In Progress</div>
            </Card>
            <Card className="p-3 border-l-4 border-l-green-500">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">{counts.resolved}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Resolved</div>
            </Card>
            <Card className="p-3 border-l-4 border-l-gray-400">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">{counts.closed}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Closed</div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <Dropdown
            placeholder="Status"
            value={statusFilter}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'open', label: 'Open' },
              { value: 'investigating', label: 'Investigating' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
            ]}
            onChange={setStatusFilter}
          />
          <Dropdown
            placeholder="Severity"
            value={severityFilter}
            options={[
              { value: 'all', label: 'All Severities' },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
            onChange={setSeverityFilter}
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && issues.length === 0 && (
          <Card className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No issues found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Run the Spotter agent to detect data quality issues automatically.
            </p>
          </Card>
        )}

        {/* Kanban Board */}
        {!isLoading && issues.length > 0 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {columns.map((column) => {
              const columnIssues = getIssuesByColumn(column.id);
              const StatusIcon = column.id === 'open' ? AlertTriangle : column.id === 'in_progress' ? Wrench : CheckCircle;
              const borderColor = column.id === 'open' ? 'border-red-400' : column.id === 'in_progress' ? 'border-blue-400' : 'border-green-400';

              return (
                <div key={column.id}>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full border-2 ${borderColor}`} />
                      <h2 className="font-medium text-gray-900 dark:text-white">{column.title}</h2>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {columnIssues.length}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3 min-h-[200px]">
                    {columnIssues.map((issue) => (
                      <IssueCard key={issue.id} issue={issue} onStatusChange={handleStatusChange} />
                    ))}
                    {columnIssues.length === 0 && (
                      <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-lg dark:border-gray-700">
                        <span className="text-sm text-gray-400">No issues</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
