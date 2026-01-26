'use client';

import { Header } from '@/components/Header';
import { Card, CardContent, Badge, Button, Avatar } from '@amygdala/ui';
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
} from 'lucide-react';

const agents = [
  {
    id: 'spotter',
    name: 'Spotter',
    description: 'Detects anomalies that would make users distrust data',
    longDescription:
      'Monitors reports and data assets for missing values, outliers, freshness issues, and pattern anomalies.',
    icon: Eye,
    color: 'bg-cyan-500',
    textColor: 'text-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    status: 'running',
    priority: 'high',
    lastRun: '2 minutes ago',
    nextRun: 'Continuous',
    stats: {
      issuesDetected: 12,
      assetsMonitored: 52,
      runsToday: 24,
    },
    recentActivity: [
      { type: 'issue', message: 'Detected missing values in CUSTOMER_EMAIL', time: '2m ago' },
      { type: 'scan', message: 'Completed scan of GOLD_DAILY_REVENUE', time: '5m ago' },
      { type: 'issue', message: 'Found unusual spike in transaction volume', time: '15m ago' },
    ],
  },
  {
    id: 'debugger',
    name: 'Debugger',
    description: 'Investigates issues and finds root causes',
    longDescription:
      'Traces lineage upstream to identify the source of data quality issues and suggests remediation steps.',
    icon: Wrench,
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    status: 'idle',
    priority: 'high',
    lastRun: '1 hour ago',
    nextRun: 'On trigger',
    stats: {
      issuesResolved: 8,
      avgTimeToResolve: '4.2h',
      successRate: '94%',
    },
    recentActivity: [
      { type: 'resolved', message: 'Identified root cause: ETL job timeout', time: '1h ago' },
      { type: 'investigation', message: 'Investigating data freshness alert', time: '2h ago' },
    ],
  },
  {
    id: 'quality',
    name: 'Quality Agent',
    description: 'Generates and enforces contextual quality rules',
    longDescription:
      'Analyzes data patterns and business context to generate appropriate validation rules automatically.',
    icon: CheckCircle,
    color: 'bg-green-500',
    textColor: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    status: 'idle',
    priority: 'medium',
    lastRun: '3 hours ago',
    nextRun: 'Daily at 6 AM',
    stats: {
      rulesGenerated: 156,
      rulesActive: 142,
      coverage: '87%',
    },
    recentActivity: [
      { type: 'rule', message: 'Generated 3 new rules for CUSTOMER_PROFILE', time: '3h ago' },
    ],
  },
  {
    id: 'transformation',
    name: 'Transformation Agent',
    description: 'Repairs data and creates derived assets',
    longDescription:
      'Applies data cleansing transformations and creates computed columns based on detected patterns.',
    icon: RefreshCw,
    color: 'bg-pink-500',
    textColor: 'text-pink-500',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    status: 'idle',
    priority: 'low',
    lastRun: 'Never',
    nextRun: 'Manual',
    stats: {
      transformations: 0,
      recordsProcessed: 0,
      pending: 3,
    },
    recentActivity: [],
  },
  {
    id: 'trust',
    name: 'Trust Agent',
    description: 'Calculates holistic trust scores',
    longDescription:
      'Aggregates quality metrics, lineage health, and usage patterns into comprehensive trust scores.',
    icon: Star,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    status: 'scheduled',
    priority: 'medium',
    lastRun: '6 hours ago',
    nextRun: 'In 2 hours',
    stats: {
      assetsScored: 52,
      avgTrustScore: 78,
      trendsUp: 34,
    },
    recentActivity: [
      { type: 'score', message: 'Updated trust scores for 52 assets', time: '6h ago' },
    ],
  },
  {
    id: 'documentarist',
    name: 'Documentarist',
    description: 'Catalogs assets by tracing from reports to sources',
    longDescription:
      'Discovers and documents data assets, their relationships, and metadata through automated exploration.',
    icon: BookOpen,
    color: 'bg-purple-500',
    textColor: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    status: 'idle',
    priority: 'low',
    lastRun: '1 day ago',
    nextRun: 'Weekly',
    stats: {
      assetsCataloged: 52,
      relationshipsMapped: 87,
      coverage: '100%',
    },
    recentActivity: [
      { type: 'catalog', message: 'Cataloged new asset: FACT_MONTHLY_SUMMARY', time: '1d ago' },
    ],
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'running':
      return <Badge variant="success">Running</Badge>;
    case 'scheduled':
      return <Badge variant="info">Scheduled</Badge>;
    case 'idle':
      return <Badge>Idle</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default function AgentsPage() {
  return (
    <>
      <Header
        title="AI Agents"
        icon={<Sparkles className="h-5 w-5" />}
        actions={
          <Button size="sm" className="gap-2">
            <PlayCircle className="h-4 w-4" />
            Run All
          </Button>
        }
      />

      <main className="p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                  <PlayCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">1</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Running</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">1</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/30">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">12</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Issues Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">52</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Assets Monitored</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agents Grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="overflow-hidden">
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
                  {getStatusBadge(agent.status)}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                  {Object.entries(agent.stats).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <span>Last run: {agent.lastRun}</span>
                  </div>
                  <div className="flex gap-2">
                    {agent.status === 'running' ? (
                      <Button variant="outline" size="sm">
                        <Pause className="mr-1.5 h-4 w-4" />
                        Stop
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm">
                        <PlayCircle className="mr-1.5 h-4 w-4" />
                        Run
                      </Button>
                    )}
                  </div>
                </div>

                {agent.recentActivity.length > 0 && (
                  <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Recent Activity
                    </p>
                    <div className="space-y-2">
                      {agent.recentActivity.slice(0, 2).map((activity, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                          <span className="flex-1 text-gray-600 dark:text-gray-400">{activity.message}</span>
                          <span className="text-xs text-gray-400">{activity.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
