'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  RefreshCw,
  Building2,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DailyRevenue {
  date: string;
  total_revenue: number;
  interest_income: number;
  fee_income: number;
  transaction_count: number;
  avg_transaction_value: number;
  revenue_target: number;
  variance_to_target: number;
  calculated_at: string;
}

interface BranchRevenue {
  date: string;
  branch_id: string;
  branch_name: string | null;
  region: string | null;
  total_amount: number;
  transaction_count: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getDataFreshness(calculatedAt: string): { status: 'fresh' | 'stale' | 'critical'; label: string } {
  const calculated = new Date(calculatedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - calculated.getTime()) / (1000 * 60 * 60);

  if (hoursDiff < 6) return { status: 'fresh', label: 'Updated recently' };
  if (hoursDiff < 24) return { status: 'stale', label: 'Updated ' + Math.floor(hoursDiff) + 'h ago' };
  return { status: 'critical', label: 'Data is stale (' + Math.floor(hoursDiff / 24) + ' days old)' };
}

export default function DailyRevenuePage() {
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<DailyRevenue[]>([]);
  const [branchData, setBranchData] = useState<BranchRevenue[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      // Fetch last 30 days of revenue
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: revenueData, error: revenueError } = await supabase
        .schema('meridian')
        .from('gold_daily_revenue')
        .select('*')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (revenueError) throw revenueError;
      setRevenue(revenueData || []);

      // Fetch branch data for latest date
      if (revenueData && revenueData.length > 0) {
        const latestDate = revenueData[0].date;

        const { data: branchDataResult, error: branchError } = await supabase
          .schema('meridian')
          .from('gold_branch_metrics')
          .select('*')
          .eq('date', latestDate)
          .order('total_amount', { ascending: false });

        if (branchError) throw branchError;
        setBranchData(branchDataResult || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }

  const latestRevenue = revenue[0];
  const previousRevenue = revenue[1];

  const dayOverDayChange = latestRevenue && previousRevenue
    ? ((latestRevenue.total_revenue - previousRevenue.total_revenue) / previousRevenue.total_revenue) * 100
    : 0;

  const freshness = latestRevenue?.calculated_at
    ? getDataFreshness(latestRevenue.calculated_at)
    : { status: 'critical' as const, label: 'No data' };

  // Check for issues
  const hasUnknownBranch = branchData.some(b => b.branch_id === 'BR-UNKNOWN-001' || !b.branch_name);
  const hasMissingData = revenue.length < 7;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
                Back
              </Link>
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary-600" />
                <span className="font-semibold text-gray-900">Daily Revenue Report</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
                freshness.status === 'fresh' ? 'bg-green-100 text-green-700' :
                freshness.status === 'stale' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                <Clock className="h-4 w-4" />
                {freshness.label}
              </div>
              <button
                onClick={fetchData}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-6 text-center text-red-600">
            <AlertTriangle className="mx-auto h-8 w-8" />
            <p className="mt-2">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : revenue.length === 0 ? (
          <div className="rounded-xl bg-amber-50 p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No Data Available</h3>
            <p className="mt-2 text-gray-600">
              The database is empty. Seed the data first using the Admin Panel.
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-block rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700"
            >
              Go to Admin Panel
            </Link>
          </div>
        ) : (
          <>
            {/* Issues Alert */}
            {(hasUnknownBranch || hasMissingData) && (
              <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-800">Data Quality Issues Detected</h3>
                    <ul className="mt-2 space-y-1 text-sm text-amber-700">
                      {hasUnknownBranch && (
                        <li>Unknown branch found in transaction data (reference data gap)</li>
                      )}
                      {hasMissingData && (
                        <li>Missing data for expected dates (possible pipeline failure)</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Total Revenue</span>
                  <DollarSign className="h-5 w-5 text-primary-600" />
                </div>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {latestRevenue ? formatCurrency(latestRevenue.total_revenue) : '-'}
                </p>
                <div className={`mt-2 flex items-center gap-1 text-sm ${
                  dayOverDayChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {dayOverDayChange >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {Math.abs(dayOverDayChange).toFixed(1)}% vs yesterday
                </div>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">vs Target</span>
                  {latestRevenue && latestRevenue.variance_to_target >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <p className={`mt-2 text-3xl font-bold ${
                  latestRevenue && latestRevenue.variance_to_target >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {latestRevenue ? formatCurrency(latestRevenue.variance_to_target) : '-'}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Target: {latestRevenue ? formatCurrency(latestRevenue.revenue_target) : '-'}
                </p>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <span className="text-sm font-medium text-gray-500">Transactions</span>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {latestRevenue ? formatNumber(latestRevenue.transaction_count) : '-'}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Avg: {latestRevenue ? formatCurrency(latestRevenue.avg_transaction_value) : '-'}
                </p>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <span className="text-sm font-medium text-gray-500">Revenue Date</span>
                <p className="mt-2 text-xl font-bold text-gray-900">
                  {latestRevenue ? formatDate(latestRevenue.date) : '-'}
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Latest available
                </div>
              </div>
            </div>

            {/* Revenue by Branch */}
            <div className="rounded-xl bg-white shadow-sm border border-gray-100">
              <div className="border-b border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900">Revenue by Branch</h3>
                <p className="text-sm text-gray-500">
                  {latestRevenue ? formatDate(latestRevenue.date) : 'Latest data'}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Branch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Region
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Transactions
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Avg Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {branchData.map((branch) => {
                      const isUnknown = branch.branch_id === 'BR-UNKNOWN-001' || !branch.branch_name;
                      return (
                        <tr key={branch.branch_id} className={isUnknown ? 'bg-amber-50' : ''}>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="flex items-center gap-2">
                              {isUnknown ? (
                                <>
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                  <span className="font-medium text-amber-700">[UNKNOWN]</span>
                                </>
                              ) : (
                                <span className="font-medium text-gray-900">{branch.branch_name}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{branch.branch_id}</p>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                            {branch.region || '-'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-gray-900">
                            {formatCurrency(branch.total_amount * 0.002)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-gray-500">
                            {formatNumber(branch.transaction_count)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-gray-500">
                            {formatCurrency(branch.total_amount / branch.transaction_count)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Revenue Trend */}
            <div className="mt-8 rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Revenue Trend (Last 30 Days)</h3>
              <div className="h-64 flex items-end gap-1">
                {revenue.slice().reverse().map((day, i) => {
                  const maxRevenue = Math.max(...revenue.map(r => r.total_revenue));
                  const height = (day.total_revenue / maxRevenue) * 100;
                  const isAboveTarget = day.total_revenue >= day.revenue_target;

                  return (
                    <div
                      key={day.date}
                      className="flex-1 group relative"
                      title={`${formatDate(day.date)}: ${formatCurrency(day.total_revenue)}`}
                    >
                      <div
                        className={`w-full rounded-t transition-all ${
                          isAboveTarget ? 'bg-green-500 hover:bg-green-600' : 'bg-primary-500 hover:bg-primary-600'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                      <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                        {formatDate(day.date)}<br />
                        {formatCurrency(day.total_revenue)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>{revenue.length > 0 ? formatDate(revenue[revenue.length - 1].date) : ''}</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    Above target
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-primary-500" />
                    Below target
                  </div>
                </div>
                <span>{revenue.length > 0 ? formatDate(revenue[0].date) : ''}</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
