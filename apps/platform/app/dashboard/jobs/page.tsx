'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Card, CardContent, Badge, Button, Dropdown } from '@amygdala/ui';
import {
  PlayCircle,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  Eye,
  Wrench,
  Star,
  BookOpen,
  Sparkles,
  Database,
} from 'lucide-react';

// Types
interface AgentRun {
  id: string;
  agent_name: string;
  status: 'running' | 'completed' | 'failed';
  context: Record<string, unknown>;
  results: Record<string, unknown> | null;
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
  details: Record<string, unknown>;
  timestamp: string;
}

interface RunDetails {
  run: AgentRun;
  logs: AgentLog[];
  issues: Array<{
    id: string;
    title: string;
    severity: string;
    issue_type: string;
    status: string;
  }>;
}

// Unified job type
interface Job {
  id: string;
  name: string;
  type: 'agent' | 'etl' | 'scheduled';
  status: 'running' | 'scheduled' | 'completed' | 'failed';
  startTime: string;
  duration: string;
  progress?: number;
  error?: string;
  // Agent-specific fields
  agentName?: string;
  logCount?: number;
  results?: Record<string, unknown> | null;
}

// Agent configuration
const agentConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  spotter: { color: 'bg-cyan-500', icon: Eye, label: 'Spotter' },
  debugger: { color: 'bg-orange-500', icon: Wrench, label: 'Debugger' },
  quality: { color: 'bg-green-500', icon: CheckCircle, label: 'Quality' },
  transformation: { color: 'bg-pink-500', icon: RefreshCw, label: 'Transformation' },
  trust: { color: 'bg-yellow-500', icon: Star, label: 'Trust' },
  documentarist: { color: 'bg-purple-500', icon: BookOpen, label: 'Documentarist' },
  operator: { color: 'bg-blue-500', icon: Sparkles, label: 'Operator' },
};

const statusConfig = {
  running: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Running', icon: RefreshCw },
  scheduled: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400', label: 'Scheduled', icon: Clock },
  completed: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Completed', icon: CheckCircle },
  failed: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Failed', icon: XCircle },
};

const typeConfig = {
  agent: { label: 'AI Agent', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  etl: { label: 'ETL Pipeline', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  scheduled: { label: 'Scheduled', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
};

// Helper functions
function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return 'Running...';
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const seconds = Math.floor((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function getActionColor(action: string) {
  if (action.includes('started')) return 'bg-blue-500';
  if (action.includes('completed') || action.includes('success')) return 'bg-green-500';
  if (action.includes('failed') || action.includes('error')) return 'bg-red-500';
  if (action.includes('check')) return 'bg-purple-500';
  if (action.includes('issue')) return 'bg-yellow-500';
  return 'bg-gray-400';
}

// Job Details component for expanded view
function JobDetailsPanel({ jobId, jobType, onClose }: { jobId: string; jobType: string; onClose: () => void }) {
  const [details, setDetails] = useState<RunDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (jobType !== 'agent') {
      setIsLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/agents/runs/${jobId}`);
        if (!res.ok) throw new Error('Failed to fetch run details');
        const data = await res.json();
        setDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [jobId, jobType]);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
        <p className="mt-2 text-gray-500">Loading details...</p>
      </div>
    );
  }

  if (jobType !== 'agent') {
    return (
      <div className="p-6 text-center text-gray-500">
        <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p>Detailed logs not available for this job type.</p>
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

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4 space-y-6">
      {/* Summary Stats */}
      {run.results && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-3">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {(run.results as { stats?: { tablesScanned?: number } }).stats?.tablesScanned || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tables Scanned</p>
          </Card>
          <Card className="p-3">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {(run.results as { stats?: { checksPerformed?: number } }).stats?.checksPerformed || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Checks Performed</p>
          </Card>
          <Card className="p-3">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {(run.results as { stats?: { anomaliesDetected?: number } }).stats?.anomaliesDetected || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Anomalies Found</p>
          </Card>
          <Card className="p-3">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {(run.results as { issuesCreated?: number }).issuesCreated || 0}
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
                          ? 'danger'
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

// Job Card component
function JobCard({
  job,
  onExpand,
  isExpanded,
}: {
  job: Job;
  onExpand: () => void;
  isExpanded: boolean;
}) {
  const status = statusConfig[job.status];
  const StatusIcon = status.icon;
  const type = typeConfig[job.type];

  // Get agent-specific styling
  const agent = job.agentName ? agentConfig[job.agentName] : null;
  const AgentIcon = agent?.icon || Sparkles;
  const accentColor = agent?.color || 'bg-gray-500';

  return (
    <Card className="overflow-hidden">
      {job.type === 'agent' && <div className={`h-1 ${accentColor}`} />}
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {job.type === 'agent' ? (
              <div className={`rounded-lg ${accentColor} p-2`}>
                <AgentIcon className="h-4 w-4 text-white" />
              </div>
            ) : (
              <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-2">
                <StatusIcon className={`h-4 w-4 ${job.status === 'running' ? 'animate-spin text-blue-500' : 'text-gray-500'}`} />
              </div>
            )}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">{job.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(job.startTime)} • {job.duration}
              </p>
              {job.error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{job.error}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={type.color}>{type.label}</Badge>
            <Badge className={status.color}>{status.label}</Badge>
            {(job.type === 'agent' || job.logCount) && (
              <Button variant="ghost" size="sm" onClick={onExpand}>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar for running jobs */}
        {job.status === 'running' && job.progress !== undefined && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Progress</span>
              <span className="text-gray-700 dark:text-gray-300">{job.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Agent-specific stats */}
        {job.type === 'agent' && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Log Entries</p>
              <p className="font-medium text-gray-900 dark:text-white">{job.logCount || 0}</p>
            </div>
            {job.results && (
              <>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Checks</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {(job.results as { stats?: { checksPerformed?: number } }).stats?.checksPerformed || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Anomalies</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {(job.results as { stats?: { anomaliesDetected?: number } }).stats?.anomaliesDetected || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Issues</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {(job.results as { issuesCreated?: number }).issuesCreated || 0}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Summary Stats component
function SummaryStats({ jobs }: { jobs: Job[] }) {
  const running = jobs.filter((j) => j.status === 'running').length;
  const completed = jobs.filter((j) => j.status === 'completed').length;
  const failed = jobs.filter((j) => j.status === 'failed').length;
  const agentJobs = jobs.filter((j) => j.type === 'agent').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2">
            <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{running}</p>
            <p className="text-sm text-gray-500">Running</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{completed}</p>
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
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{failed}</p>
            <p className="text-sm text-gray-500">Failed</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{agentJobs}</p>
            <p className="text-sm text-gray-500">AI Agent Runs</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function JobsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Initialize filters from URL params
  const initialType = searchParams.get('type') || 'all';
  const initialAgent = searchParams.get('agent') || 'all';
  const initialStatus = searchParams.get('status') || 'all';

  const [typeFilter, setTypeFilter] = useState<string>(initialType);
  const [agentFilter, setAgentFilter] = useState<string>(initialAgent);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  // Update URL when filters change
  const updateFilters = (type: 'type' | 'agent' | 'status', value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (type === 'type') {
      setTypeFilter(value);
      if (value === 'all') params.delete('type');
      else params.set('type', value);
    } else if (type === 'agent') {
      setAgentFilter(value);
      if (value === 'all') params.delete('agent');
      else params.set('agent', value);
    } else if (type === 'status') {
      setStatusFilter(value);
      if (value === 'all') params.delete('status');
      else params.set('status', value);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '/dashboard/jobs';
    router.replace(newUrl);
  };

  // Convert agent runs to unified job format
  const convertAgentRunToJob = (run: AgentRun): Job => ({
    id: run.id,
    name: `${agentConfig[run.agent_name]?.label || run.agent_name} Agent`,
    type: 'agent',
    status: run.status,
    startTime: run.started_at,
    duration: getDuration(run.started_at, run.completed_at),
    error: run.error_message || undefined,
    agentName: run.agent_name,
    logCount: run.log_count,
    results: run.results,
  });

  const fetchJobs = async () => {
    try {
      setIsLoading(true);

      // Fetch agent runs from API
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (agentFilter !== 'all') params.set('agent', agentFilter);

      const res = await fetch(`/api/agents/runs?${params.toString()}`);
      const data = await res.json();

      // Convert agent runs to jobs
      const agentJobs: Job[] = (data.runs || []).map(convertAgentRunToJob);

      // Combine with any other job types (placeholder for future)
      // For now, just use agent jobs
      setJobs(agentJobs);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [statusFilter, agentFilter]);

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    if (typeFilter !== 'all' && job.type !== typeFilter) return false;
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    // Agent filter is already applied in API call
    return true;
  });

  const toggleExpand = (jobId: string) => {
    setExpandedJobId((prev) => (prev === jobId ? null : jobId));
  };

  return (
    <>
      <Header
        title="Jobs"
        icon={<PlayCircle className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={fetchJobs} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      <main className="p-6 space-y-4">
        {/* Summary Stats */}
        <SummaryStats jobs={jobs} />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <Dropdown
            placeholder="Type"
            value={typeFilter}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'agent', label: 'AI Agent' },
              { value: 'etl', label: 'ETL Pipeline' },
              { value: 'scheduled', label: 'Scheduled' },
            ]}
            onChange={(value) => updateFilters('type', value)}
          />
          <Dropdown
            placeholder="Agent"
            value={agentFilter}
            options={[
              { value: 'all', label: 'All Agents' },
              { value: 'spotter', label: 'Spotter' },
              { value: 'debugger', label: 'Debugger' },
              { value: 'documentarist', label: 'Documentarist' },
              { value: 'quality', label: 'Quality' },
              { value: 'trust', label: 'Trust' },
              { value: 'transformation', label: 'Transformation' },
              { value: 'operator', label: 'Operator' },
            ]}
            onChange={(value) => updateFilters('agent', value)}
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
            onChange={(value) => updateFilters('status', value)}
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredJobs.length} jobs
          </span>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredJobs.length === 0 && (
          <Card className="p-12 text-center">
            <PlayCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No jobs found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {typeFilter === 'all' && statusFilter === 'all' && agentFilter === 'all'
                ? 'Run an AI agent or start a pipeline to see jobs here.'
                : 'Try adjusting your filters to see more jobs.'}
            </p>
          </Card>
        )}

        {/* Jobs List */}
        {!isLoading && filteredJobs.length > 0 && (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div key={job.id}>
                <JobCard
                  job={job}
                  onExpand={() => toggleExpand(job.id)}
                  isExpanded={expandedJobId === job.id}
                />
                {expandedJobId === job.id && (
                  <Card className="mt-2 p-4 border-l-4 border-l-purple-500">
                    <JobDetailsPanel
                      jobId={job.id}
                      jobType={job.type}
                      onClose={() => setExpandedJobId(null)}
                    />
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

function LoadingFallback() {
  return (
    <>
      <Header
        title="Jobs"
        icon={<PlayCircle className="h-5 w-5" />}
      />
      <main className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      </main>
    </>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <JobsContent />
    </Suspense>
  );
}
