'use client';

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
} from 'lucide-react';
import Link from 'next/link';

const stats = [
  { name: 'Total Assets', value: '52', change: '+3', trend: 'up', icon: Home },
  { name: 'Active Issues', value: '12', change: '-2', trend: 'down', icon: AlertTriangle },
  { name: 'Agents Running', value: '2', status: 'active', icon: PlayCircle },
  { name: 'Avg Quality', value: '87%', change: '+5%', trend: 'up', icon: TrendingUp },
];

const recentIssues = [
  {
    id: 1,
    title: 'Missing values in CUSTOMER_EMAIL',
    asset: 'CRM_CUSTOMERS',
    severity: 'high',
    status: 'open',
    agent: 'Spotter',
    created: '2h ago',
  },
  {
    id: 2,
    title: 'Unusual revenue spike detected',
    asset: 'GOLD_DAILY_REVENUE',
    severity: 'medium',
    status: 'investigating',
    agent: 'Spotter',
    created: '5h ago',
  },
  {
    id: 3,
    title: 'Data freshness alert',
    asset: 'SILVER_TRANSACTIONS',
    severity: 'low',
    status: 'resolved',
    agent: 'Spotter',
    created: '1d ago',
  },
];

const agents = [
  {
    name: 'Spotter',
    description: 'Detects anomalies in reports',
    status: 'running',
    lastRun: '2 min ago',
    icon: Eye,
    color: 'bg-cyan-500',
    stats: { detected: 3, processed: 52 },
  },
  {
    name: 'Debugger',
    description: 'Investigates and finds root causes',
    status: 'idle',
    lastRun: '1h ago',
    icon: Wrench,
    color: 'bg-orange-500',
    stats: { resolved: 8, pending: 2 },
  },
];

const topAssets = [
  { name: 'SALES_ORDERS', quality: 100, records: 7563, terms: ['Currency', 'Surname', 'Country'] },
  { name: 'CRM_CUSTOMERS', quality: 87, records: 4578, terms: ['City', 'Surname', 'E-mail'] },
  { name: 'CUSTOMER_PROFILE', quality: 75, records: 4798, terms: ['Renewal', 'Customer ID'] },
  { name: 'BANK_TRANSACTIONS', quality: 26, records: 1678, terms: ['E-mail', 'Surname'] },
];

export default function DashboardPage() {
  return (
    <>
      <Header
        title="Home"
        icon={<Home className="h-5 w-5" />}
        actions={
          <Button size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Agent
          </Button>
        }
      />

      <main className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.name}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                    {stat.change && (
                      <p
                        className={`mt-1 text-sm ${
                          stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {stat.change} from last week
                      </p>
                    )}
                    {stat.status === 'active' && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                        </span>
                        <span className="text-sm text-green-600">Active</span>
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg bg-primary-50 p-3 dark:bg-primary-900/30">
                    <stat.icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

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
              {agents.map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg ${agent.color} p-2.5`}>
                      <agent.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">{agent.name}</h3>
                        {agent.status === 'running' ? (
                          <Badge variant="success">Running</Badge>
                        ) : (
                          <Badge>Idle</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{agent.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <PlayCircle className="mr-1.5 h-4 w-4" />
                    Run
                  </Button>
                </div>
              ))}
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
                {recentIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-start justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-full p-1.5 ${
                          issue.severity === 'high'
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                            : issue.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{issue.title}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{issue.asset}</span>
                          <span>•</span>
                          <span>{issue.agent}</span>
                          <span>•</span>
                          <span>{issue.created}</span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        issue.status === 'open'
                          ? 'danger'
                          : issue.status === 'investigating'
                          ? 'warning'
                          : 'success'
                      }
                    >
                      {issue.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Quality Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Data Quality Overview</CardTitle>
            <Link href="/dashboard/catalog" className="text-sm text-primary-600 hover:underline dark:text-primary-400">
              View catalog
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Asset Name
                    </th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Terms
                    </th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Overall Quality
                    </th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Records
                    </th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {topAssets.map((asset) => (
                    <tr key={asset.name} className="group">
                      <td className="py-3">
                        <Link
                          href={`/dashboard/catalog/${asset.name.toLowerCase()}`}
                          className="font-medium text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
                        >
                          {asset.name}
                        </Link>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {asset.terms.slice(0, 2).map((term) => (
                            <span
                              key={term}
                              className="inline-flex rounded border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                            >
                              {term}
                            </span>
                          ))}
                          {asset.terms.length > 2 && (
                            <span className="inline-flex rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
                              +{asset.terms.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <QualityBar value={asset.quality} />
                      </td>
                      <td className="py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                        {asset.records.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
