'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, Badge, Button } from '@amygdala/ui';
import {
  Sparkles,
  Eye,
  Wrench,
  CheckCircle,
  RefreshCw,
  Star,
  BookOpen,
  PlayCircle,
  Pause,
  Clock,
  TrendingUp,
  AlertTriangle,
  Loader2,
  History,
  Settings2,
} from 'lucide-react';
import Link from 'next/link';

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  available: boolean;
}

const agentConfigs: AgentConfig[] = [
  {
    id: 'spotter',
    name: 'Spotter',
    description: 'Detects anomalies that would make users distrust data',
    icon: Eye,
    color: 'bg-cyan-500',
    available: true,
  },
  {
    id: 'debugger',
    name: 'Debugger',
    description: 'Investigates issues and finds root causes',
    icon: Wrench,
    color: 'bg-orange-500',
    available: true,
  },
  {
    id: 'quality',
    name: 'Quality Agent',
    description: 'Generates and enforces data quality rules',
    icon: CheckCircle,
    color: 'bg-green-500',
    available: true,
  },
  {
    id: 'trust',
    name: 'Trust Agent',
    description: 'Calculates and monitors trust scores',
    icon: Star,
    color: 'bg-yellow-500',
    available: true,
  },
  {
    id: 'transformation',
    name: 'Transformation Agent',
    description: 'Repairs data and creates derived assets',
    icon: RefreshCw,
    color: 'bg-pink-500',
    available: false,
  },
  {
    id: 'documentarist',
    name: 'Documentarist',
    description: 'Discovers and documents data assets automatically',
    icon: BookOpen,
    color: 'bg-purple-500',
    available: true,
  },
  {
    id: 'operator',
    name: 'Operator',
    description: 'Executes approved changes to assets and issues',
    icon: Settings2,
    color: 'bg-indigo-500',
    available: true,
  },
];

interface AgentStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRun: any;
  isRunning: boolean;
}

interface AgentLog {
  id: string;
  agent_name: string;
  action: string;
  summary: string;
  timestamp: string;
}

export default function AgentsPage() {
  const [agentStats, setAgentStats] = useState<Record<string, AgentStats>>({});
  const [recentLogs, setRecentLogs] = useState<AgentLog[]>([]);
  const [runningAgents, setRunningAgents] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [lastRunResult, setLastRunResult] = useState<any>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/agents/status');
      const data = await res.json();
      setAgentStats(data.agents || {});
      setRecentLogs(data.recentLogs || []);

      // Check which agents are running
      const running = new Set<string>();
      Object.entries(data.agents || {}).forEach(([name, stats]: [string, any]) => {
        if (stats.isRunning) running.add(name);
      });
      setRunningAgents(running);
    } catch (error) {
      console.error('Failed to fetch agent status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const runAgent = async (agentId: string) => {
    setRunningAgents((prev) => new Set([...prev, agentId]));
    setLastRunResult(null);

    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentId }),
      });

      const result = await res.json();
      setLastRunResult(result);

      // Refresh status
      await fetchStatus();
    } catch (error) {
      console.error('Failed to run agent:', error);
      setLastRunResult({ success: false, error: 'Failed to run agent' });
    } finally {
      setRunningAgents((prev) => {
        const next = new Set(prev);
        next.delete(agentId);
        return next;
      });
    }
  };

  const getAgentStatus = (agentId: string) => {
    if (runningAgents.has(agentId)) return 'running';
    const stats = agentStats[agentId];
    if (!stats) return 'idle';
    if (stats.isRunning) return 'running';
    return 'idle';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
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

  const totalIssues = Object.values(agentStats).reduce(
    (sum, s) => sum + (s.lastRun?.results?.issuesCreated || 0),
    0
  );

  return (
    <>
      <Header
        title="AI Agents"
        icon={<Sparkles className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/jobs?type=agent">
              <Button variant="outline" size="sm" className="gap-2">
                <History className="h-4 w-4" />
                View Jobs
              </Button>
            </Link>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => runAgent('spotter')}
              disabled={runningAgents.has('spotter')}
            >
              {runningAgents.has('spotter') ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              Run Spotter
            </Button>
          </div>
        }
      />

      <main className="p-6 space-y-6">
        {/* Last Run Result */}
        {lastRunResult && (
          <Card className={lastRunResult.success ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {lastRunResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {lastRunResult.success ? 'Agent run completed' : 'Agent run failed'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {lastRunResult.success
                      ? `Found ${lastRunResult.stats?.anomaliesDetected || 0} anomalies, created ${lastRunResult.issuesCreated || 0} issues in ${(lastRunResult.duration / 1000).toFixed(1)}s`
                      : lastRunResult.error || 'Unknown error'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats - Clickable Tiles */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            className="cursor-pointer transition-all hover:shadow-md hover:border-green-300 dark:hover:border-green-700"
            onClick={() => {
              // Scroll to running agents or highlight them
              const runningAgentElements = document.querySelectorAll('[data-running="true"]');
              if (runningAgentElements.length > 0) {
                runningAgentElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                  <PlayCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {runningAgents.size}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Running</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Link href="/dashboard/jobs?type=agent">
            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {agentStats.spotter?.totalRuns || 0}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Runs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/issues">
            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-yellow-300 dark:hover:border-yellow-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/30">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalIssues}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Issues Created</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {agentConfigs.filter((a) => a.available).length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Agents Available</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agents Grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agentConfigs.map((agent) => {
            const stats = agentStats[agent.id];
            const status = getAgentStatus(agent.id);
            const isRunning = status === 'running';

            return (
              <Card
                key={agent.id}
                className={`overflow-hidden ${!agent.available && 'opacity-60'} ${isRunning && 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900'}`}
                data-running={isRunning}
              >
                <div className={`h-1 ${agent.color}`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg ${agent.color} p-2.5`}>
                        <agent.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{agent.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{agent.description}</p>
                      </div>
                    </div>
                    {isRunning ? (
                      <Badge variant="success">Running</Badge>
                    ) : agent.available ? (
                      <Badge>Ready</Badge>
                    ) : (
                      <Badge variant="default">Coming Soon</Badge>
                    )}
                  </div>

                  {stats && (
                    <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                      <div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {stats.totalRuns}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Runs</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {stats.successfulRuns}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Successful</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {stats.failedRuns}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {stats?.lastRun ? (
                        <span>Last run: {formatTime(stats.lastRun.started_at)}</span>
                      ) : (
                        <span>Never run</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {/* Run History Button - show for all agents with stats */}
                      {stats && stats.totalRuns > 0 && (
                        <Link href={`/dashboard/jobs?type=agent&agent=${agent.id}`}>
                          <Button variant="ghost" size="sm" title="View run history">
                            <History className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      {agent.available ? (
                        isRunning ? (
                          <Button variant="outline" size="sm" disabled>
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            Running...
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => runAgent(agent.id)}>
                            <PlayCircle className="mr-1.5 h-4 w-4" />
                            Run
                          </Button>
                        )
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          <Clock className="mr-1.5 h-4 w-4" />
                          Coming Soon
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        {recentLogs.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
              <div className="space-y-3">
                {recentLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-cyan-500" />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900 dark:text-white">{log.agent_name}</span>
                      <span className="text-gray-500 dark:text-gray-400"> · {log.action}</span>
                      <p className="text-gray-600 dark:text-gray-400">{log.summary}</p>
                    </div>
                    <span className="text-xs text-gray-400">{formatTime(log.timestamp)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
