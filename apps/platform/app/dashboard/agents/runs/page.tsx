'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, Badge, Button, Dropdown } from '@amygdala/ui';
import {
  History,
  Eye,
  Wrench,
  CheckCircle,
  RefreshCw,
  Clock,
  Loader2,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface AgentRun {
  id: string;
  agent_name: string;
  status: 'running' | 'completed' | 'failed';
  context: Record<string, any>;
  results: Record<string, any> | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  log_count: number;
}

interface AgentLog {
  id: string;
  agent_name: string;
  run_id: string;
  asset_id: string | null;
  action: string;
  summary: string;
  details: Record<string, any>;
  timestamp: string;
}

interface RunDetails {
  run: AgentRun;
  logs: AgentLog[];
  issues: any[];
}

const agentConfig: Record<string, { color: string; icon: any }> = {
  spotter: { color: 'bg-cyan-500', icon: Eye },
  debugger: { color: 'bg-orange-500', icon: Wrench },
  quality: { color: 'bg-green-500', icon: CheckCircle },
  transformation: { color: 'bg-pink-500', icon: RefreshCw },
};

const statusConfig = {
  running: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Running' },
  completed: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Completed' },
  failed: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Failed' },
};

function RunCard({ run, onExpand, isExpanded }: { run: AgentRun; onExpand: () => void; isExpanded: boolean }) {
  const agent = agentConfig[run.agent_name] || { color: 'bg-gray-500', icon: Eye };
  const AgentIcon = agent.icon;
  const status = statusConfig[run.status] || statusConfig.running;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDuration = () => {
    if (!run.completed_at) return 'Running...';
    const start = new Date(run.started_at).getTime();
    const end = new Date(run.completed_at).getTime();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <Card className="overflow-hidden">
      <div className={`h-1 ${agent.color}`} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg ${agent.color} p-2`}>
              <AgentIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white capitalize">
                {run.agent_name} Agent
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(run.started_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={status.color}>{status.label}</Badge>
            <Button variant="ghost" size="sm" onClick={onExpand}>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Duration</p>
            <p className="font-medium text-gray-900 dark:text-white">{getDuration()}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Log Entries</p>
            <p className="font-medium text-gray-900 dark:text-white">{run.log_count}</p>
          </div>
          {run.results && (
            <>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Checks</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {run.results.stats?.checksPerformed || 0}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Issues Created</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {run.results.issuesCreated || 0}
                </p>
              </div>
            </>
          )}
        </div>

        {run.error_message && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <span className="font-medium">Error: </span>
            {run.error_message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RunDetails({ runId, onClose }: { runId: string; onClose: () => void }) {
  const [details, setDetails] = useState<RunDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/agents/runs/${runId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch run details');
        }
        const data = await res.json();
        setDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [runId]);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
        <p className="mt-2 text-gray-500">Loading run details...</p>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="p-8 text-center">
        <XCircle className="h-8 w-8 text-red-500 mx-auto" />
        <p className="mt-2 text-gray-900 dark:text-white font-medium">Failed to load details</p>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  const { run, logs, issues } = details;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionColor = (action: string) => {
    if (action.includes('started')) return 'bg-blue-500';
    if (action.includes('completed') || action.includes('success')) return 'bg-green-500';
    if (action.includes('failed') || action.includes('error')) return 'bg-red-500';
    if (action.includes('check')) return 'bg-purple-500';
    if (action.includes('issue')) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4 space-y-6">
      {/* Summary Stats */}
      {run.results && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-3">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {run.results.stats?.tablesScanned || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tables Scanned</p>
          </Card>
          <Card className="p-3">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {run.results.stats?.checksPerformed || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Checks Performed</p>
          </Card>
          <Card className="p-3">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {run.results.stats?.anomaliesDetected || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Anomalies Found</p>
          </Card>
          <Card className="p-3">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {run.results.issuesCreated || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Issues Created</p>
          </Card>
        </div>
      )}

      {/* Issues Created */}
      {issues.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Issues Created ({issues.length})
          </h4>
          <div className="space-y-2">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{issue.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={
                        issue.severity === 'critical'
                          ? 'error'
                          : issue.severity === 'high'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {issue.severity}
                    </Badge>
                    <span className="text-xs text-gray-500">{issue.issue_type}</span>
                  </div>
                </div>
                <Badge>{issue.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Logs */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-cyan-500" />
          Execution Log ({logs.length} entries)
        </h4>
        <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
          {logs.map((log, idx) => (
            <div
              key={log.id}
              className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div className="flex flex-col items-center">
                <div className={`h-2 w-2 rounded-full ${getActionColor(log.action)}`} />
                {idx < logs.length - 1 && (
                  <div className="w-px h-full bg-gray-200 dark:bg-gray-700 mt-1" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatTime(log.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{log.summary}</p>
                {log.details && Object.keys(log.details).length > 0 && (
                  <details className="mt-1">
                    <summary className="text-xs text-purple-600 cursor-pointer hover:underline">
                      View details
                    </summary>
                    <pre className="mt-1 text-xs bg-gray-50 dark:bg-gray-800 rounded p-2 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No log entries found</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentRunsPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchRuns = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (agentFilter !== 'all') params.set('agent', agentFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/agents/runs?${params.toString()}`);
      const data = await res.json();
      setRuns(data.runs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [agentFilter, statusFilter]);

  const toggleExpand = (runId: string) => {
    setExpandedRunId((prev) => (prev === runId ? null : runId));
  };

  return (
    <>
      <Header
        title="Agent Run History"
        icon={<History className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/agents">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Agents
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={fetchRuns} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      <main className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <Dropdown
            placeholder="Agent"
            value={agentFilter}
            options={[
              { value: 'all', label: 'All Agents' },
              { value: 'spotter', label: 'Spotter' },
              { value: 'debugger', label: 'Debugger' },
              { value: 'quality', label: 'Quality' },
            ]}
            onChange={setAgentFilter}
          />
          <Dropdown
            placeholder="Status"
            value={statusFilter}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'running', label: 'Running' },
              { value: 'completed', label: 'Completed' },
              { value: 'failed', label: 'Failed' },
            ]}
            onChange={setStatusFilter}
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {total} runs total
          </span>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && runs.length === 0 && (
          <Card className="p-12 text-center">
            <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No runs found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Run an agent to see its execution history here.
            </p>
          </Card>
        )}

        {/* Runs List */}
        {!isLoading && runs.length > 0 && (
          <div className="space-y-4">
            {runs.map((run) => (
              <div key={run.id}>
                <RunCard
                  run={run}
                  onExpand={() => toggleExpand(run.id)}
                  isExpanded={expandedRunId === run.id}
                />
                {expandedRunId === run.id && (
                  <Card className="mt-2 p-4 border-l-4 border-l-purple-500">
                    <RunDetails runId={run.id} onClose={() => setExpandedRunId(null)} />
                  </Card>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
