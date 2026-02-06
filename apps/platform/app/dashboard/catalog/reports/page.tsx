'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, Badge, Button, Input, QualityBar } from '@amygdala/ui';
import {
  FileText,
  Search,
  RefreshCw,
  Loader2,
  Star,
  ExternalLink,
  LayoutDashboard,
  Layers,
  Database,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

interface Report {
  id: string;
  name: string;
  asset_type: 'report' | 'dashboard' | 'application_screen';
  layer: string;
  description: string;
  business_context: string;
  tags: string[];
  owner: string;
  steward: string;
  upstream_assets: string[];
  app_url: string;
  application: string;
  fitness_status: 'green' | 'amber' | 'red';
  quality_score: number | null;
  trust_score_stars: number | null;
  app_metadata: Record<string, any>;
  created_at: string;
}

const typeConfig = {
  report: { icon: FileText, label: 'Report', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  dashboard: { icon: LayoutDashboard, label: 'Dashboard', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  application_screen: { icon: Layers, label: 'Application', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
};

const fitnessConfig = {
  green: { icon: CheckCircle, color: 'text-green-500', label: 'Healthy' },
  amber: { icon: AlertTriangle, color: 'text-amber-500', label: 'Warning' },
  red: { icon: AlertCircle, color: 'text-red-500', label: 'Critical' },
};

const appConfig: Record<string, { label: string; baseUrl: string; color: string }> = {
  meridian: {
    label: 'Meridian Bank',
    baseUrl: 'https://meridian-amygdala.vercel.app',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  platform: {
    label: 'Amygdala Platform',
    baseUrl: 'https://platform-amygdala.vercel.app',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [appFilter, setAppFilter] = useState<string>('all');

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/reports');
      const data = await res.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      !searchQuery ||
      report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesApp = appFilter === 'all' || report.application === appFilter;
    return matchesSearch && matchesApp;
  });

  const applications = [...new Set(reports.map((r) => r.application))];

  // Stats
  const stats = {
    total: reports.length,
    healthy: reports.filter((r) => r.fitness_status === 'green').length,
    warning: reports.filter((r) => r.fitness_status === 'amber').length,
    critical: reports.filter((r) => r.fitness_status === 'red').length,
  };

  return (
    <>
      <Header
        title="Reports & Applications"
        icon={<FileText className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchReports} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Reports</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.healthy}</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Healthy</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.warning}</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Warning</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.critical}</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Critical</div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAppFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                appFilter === 'all'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              All Apps
            </button>
            {applications.map((app) => (
              <button
                key={app}
                onClick={() => setAppFilter(app)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  appFilter === app
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {appConfig[app]?.label || app}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredReports.length === 0 && (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No reports found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery
                ? 'No reports match your search. Try different keywords.'
                : 'Reports will appear here once cataloged.'}
            </p>
          </Card>
        )}

        {/* Reports Grid */}
        {!isLoading && filteredReports.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredReports.map((report) => {
              const typeInfo = typeConfig[report.asset_type] || typeConfig.report;
              const fitnessInfo = fitnessConfig[report.fitness_status];
              const appInfo = appConfig[report.application];
              const TypeIcon = typeInfo.icon;
              const FitnessIcon = fitnessInfo.icon;

              return (
                <Card key={report.id} className="p-4 hover:shadow-lg transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                        <TypeIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                      </div>
                    </div>
                    <FitnessIcon className={`h-5 w-5 ${fitnessInfo.color}`} title={fitnessInfo.label} />
                  </div>

                  {/* Title */}
                  <Link
                    href={`/dashboard/catalog/${report.id}`}
                    className="block text-lg font-semibold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 mb-2"
                  >
                    {report.name}
                  </Link>

                  {/* Description */}
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                    {report.description || 'No description available'}
                  </p>

                  {/* App & URL */}
                  <div className="flex items-center gap-2 mb-3">
                    {appInfo && (
                      <Badge className={appInfo.color}>{appInfo.label}</Badge>
                    )}
                    {report.app_url && (
                      <span className="text-xs text-gray-400 font-mono">{report.app_url}</span>
                    )}
                  </div>

                  {/* Source Assets */}
                  {report.upstream_assets?.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
                      <Database className="h-3.5 w-3.5" />
                      <span>Sources: {report.upstream_assets.join(', ')}</span>
                    </div>
                  )}

                  {/* Scores */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-1">
                      {report.trust_score_stars !== null ? (
                        <>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${
                                star <= (report.trust_score_stars || 0)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            />
                          ))}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">No trust score</span>
                      )}
                    </div>

                    {report.app_url && appInfo && (
                      <a
                        href={`${appInfo.baseUrl}${report.app_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400"
                      >
                        Open
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
