'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, Badge, QualityBar, Button, Avatar } from '@amygdala/ui';
import {
  Home,
  Eye,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  PlayCircle,
  Sparkles,
  Database,
  Shield,
  Star,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useChat, AgentCompleteEvent } from '@/contexts/ChatContext';

interface DashboardData {
  stats: {
    totalAssets: number;
    openIssues: number;
    totalIssues: number;
    runningAgents: number;
    avgQuality: number;
  };
  trustIndex: {
    overall: number;
    stars: number;
    distribution: { green: number; amber: number; red: number };
  } | null;
  recentIssues: Array<{
    id: string;
    title: string;
    asset: string;
    severity: string;
    status: string;
    agent: string;
    created_at: string;
  }>;
  agentStatus: Array<{
    name: string;
    displayName: string;
    description: string;
    color: string;
    isRunning: boolean;
    lastRun: { started_at: string; status: string; issuesCreated: number } | null;
  }>;
  topAssets: Array<{
    id: string;
    name: string;
    layer: string;
    quality: number;
    fitnessStatus: string;
    tags: string[];
  }>;
  fitnessDistribution: { green: number; amber: number; red: number };
}

const agentIcons: Record<string, any> = {
  spotter: Eye,
  debugger: Wrench,
};

export default function DashboardPage() {
  const { subscribeToAgentComplete } = useChat();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningAgent, setIsRunningAgent] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Subscribe to agent completion events to refresh data immediately after agents run
  useEffect(() => {
    const unsubscribe = subscribeToAgentComplete((event: AgentCompleteEvent) => {
      // Refresh dashboard whenever any agent completes an action
      if (event.action?.type === 'run_agent' || event.toolResults) {
        setTimeout(() => fetchData(), 500);
      }
    });

    return unsubscribe;
  }, [subscribeToAgentComplete, fetchData]);

  const runAgent = async (agentName: string) => {
    setIsRunningAgent(agentName);
    try {
      await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentName }),
      });
      await fetchData();
    } catch (error) {
      console.error('Failed to run agent:', error);
    } finally {
      setIsRunningAgent(null);
    }
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

  if (isLoading) {
    return (
      <>
        <Header title="Home" icon={<Home className="h-5 w-5" />} />
        <main className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </main>
      </>
    );
  }

  const stats = data?.stats || { totalAssets: 0, openIssues: 0, totalIssues: 0, runningAgents: 0, avgQuality: 0 };

  return (
    <>
      <Header
        title="Home"
        icon={<Home className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Link href="/dashboard/agents">
              <Button size="sm" className="gap-2">
                <Sparkles className="h-4 w-4" />
                AI Agents
              </Button>
            </Link>
          </div>
        }
      />

      <main className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Assets</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalAssets}</p>
                  <Link href="/dashboard/catalog" className="mt-1 text-sm text-primary-600 hover:underline dark:text-primary-400">
                    View catalog →
                  </Link>
                </div>
                <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
                  <Database className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Open Issues</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{stats.openIssues}</p>
                  <Link href="/dashboard/issues" className="mt-1 text-sm text-primary-600 hover:underline dark:text-primary-400">
                    View issues →
                  </Link>
                </div>
                <div className="rounded-lg bg-red-100 p-3 dark:bg-red-900/30">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Agents Running</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{stats.runningAgents}</p>
                  {stats.runningAgents > 0 && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                      </span>
                      <span className="text-sm text-green-600">Active</span>
                    </div>
                  )}
                </div>
                <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
                  <PlayCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Quality</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{stats.avgQuality}%</p>
                  <Link href="/dashboard/quality" className="mt-1 text-sm text-primary-600 hover:underline dark:text-primary-400">
                    View quality →
                  </Link>
                </div>
                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
                  <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trust Index Card + Health Distribution */}
        {data?.trustIndex && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">Data Trust Index</CardTitle>
                <Link href="/dashboard/trust-index" className="text-sm text-primary-600 hover:underline dark:text-primary-400">
                  View details
                </Link>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="relative h-24 w-24">
                    <svg className="transform -rotate-90 w-full h-full">
                      <circle
                        cx="50%"
                        cy="50%"
                        r="40%"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="50%"
                        cy="50%"
                        r="40%"
                        stroke={data.trustIndex.overall >= 0.7 ? '#10b981' : data.trustIndex.overall >= 0.5 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 38}
                        strokeDashoffset={2 * Math.PI * 38 * (1 - data.trustIndex.overall)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {Math.round(data.trustIndex.overall * 100)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= data.trustIndex!.stars
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {data.trustIndex.stars >= 4 ? 'Excellent data trust' :
                       data.trustIndex.stars >= 3 ? 'Good data trust' :
                       data.trustIndex.stars >= 2 ? 'Fair data trust' : 'Needs improvement'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Asset Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Healthy</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {data.fitnessDistribution.green}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-yellow-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Warning</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {data.fitnessDistribution.amber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-red-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Critical</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {data.fitnessDistribution.red}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  {data.fitnessDistribution.green > 0 && (
                    <div
                      className="bg-green-500"
                      style={{ width: `${(data.fitnessDistribution.green / stats.totalAssets) * 100}%` }}
                    />
                  )}
                  {data.fitnessDistribution.amber > 0 && (
                    <div
                      className="bg-yellow-500"
                      style={{ width: `${(data.fitnessDistribution.amber / stats.totalAssets) * 100}%` }}
                    />
                  )}
                  {data.fitnessDistribution.red > 0 && (
                    <div
                      className="bg-red-500"
                      style={{ width: `${(data.fitnessDistribution.red / stats.totalAssets) * 100}%` }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Agents Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">AI Agents</CardTitle>
              <Link href="/dashboard/agents" className="text-sm text-primary-600 hover:underline dark:text-primary-400">
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {data?.agentStatus?.map((agent) => {
                const AgentIcon = agentIcons[agent.name] || Eye;
                return (
                  <div
                    key={agent.name}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`rounded-lg ${agent.color} p-2.5`}>
                        <AgentIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">{agent.displayName}</h3>
                          {agent.isRunning ? (
                            <Badge variant="success">Running</Badge>
                          ) : (
                            <Badge>Ready</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {agent.lastRun ? `Last run: ${formatTime(agent.lastRun.started_at)}` : 'Never run'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runAgent(agent.name)}
                      disabled={agent.isRunning || isRunningAgent === agent.name}
                    >
                      {isRunningAgent === agent.name ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <PlayCircle className="mr-1.5 h-4 w-4" />
                      )}
                      Run
                    </Button>
                  </div>
                );
              })}
              {(!data?.agentStatus || data.agentStatus.length === 0) && (
                <p className="text-center text-sm text-gray-500 py-4">No agents configured</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Issues Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Recent Issues</CardTitle>
              <Link href="/dashboard/issues" className="text-sm text-primary-600 hover:underline dark:text-primary-400">
                View all
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.recentIssues?.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-start justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-full p-1.5 ${
                          issue.severity === 'critical'
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                            : issue.severity === 'high'
                            ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                            : issue.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{issue.title}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{issue.asset}</span>
                          <span>•</span>
                          <span>{issue.agent}</span>
                          <span>•</span>
                          <span>{formatTime(issue.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        issue.status === 'open'
                          ? 'danger'
                          : issue.status === 'investigating' || issue.status === 'in_progress'
                          ? 'warning'
                          : 'success'
                      }
                    >
                      {issue.status}
                    </Badge>
                  </div>
                ))}
                {(!data?.recentIssues || data.recentIssues.length === 0) && (
                  <div className="py-8 text-center">
                    <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No recent issues</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Run Spotter to detect anomalies</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Assets */}
        {data?.topAssets && data.topAssets.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Top Assets by Quality</CardTitle>
              <Link href="/dashboard/catalog" className="text-sm text-primary-600 hover:underline dark:text-primary-400">
                View catalog
              </Link>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Asset Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Layer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Health
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Quality
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {data.topAssets.map((asset) => (
                      <tr key={asset.id} className="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/catalog/${asset.id}`}
                            className="font-medium text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
                          >
                            {asset.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="default" className="capitalize">{asset.layer}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex h-2 w-2 rounded-full ${
                              asset.fitnessStatus === 'green'
                                ? 'bg-green-500'
                                : asset.fitnessStatus === 'amber'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <QualityBar value={asset.quality} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/dashboard/catalog/${asset.id}`}>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State for new users */}
        {stats.totalAssets === 0 && (
          <Card className="p-12 text-center">
            <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Welcome to Amygdala</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Get started by adding assets to your catalog or seeding sample data.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/dashboard/catalog">
                <Button>
                  <Database className="mr-2 h-4 w-4" />
                  Open Catalog
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
