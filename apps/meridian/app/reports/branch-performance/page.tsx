'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Clock,
  RefreshCw,
  AlertTriangle,
  MapPin,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface BranchMetrics {
  date: string;
  branch_id: string;
  branch_name: string | null;
  region: string | null;
  transaction_count: number;
  total_amount: number;
  avg_transaction_value: number;
  customer_count: number;
}

interface BranchInfo {
  branch_id: string;
  branch_name: string;
  region: string;
  city: string;
  state: string;
  manager_name: string;
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

export default function BranchPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<BranchMetrics[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      // Get latest date's metrics
      const { data: latestData, error: latestError } = await supabase
        .schema('meridian')
        .from('gold_branch_metrics')
        .select('date')
        .order('date', { ascending: false })
        .limit(1);

      if (latestError) throw latestError;

      if (latestData && latestData.length > 0) {
        const latestDate = latestData[0].date;

        const { data: metricsData, error: metricsError } = await supabase
          .schema('meridian')
          .from('gold_branch_metrics')
          .select('*')
          .eq('date', latestDate)
          .order('total_amount', { ascending: false });

        if (metricsError) throw metricsError;
        setMetrics(metricsData || []);
      }

      // Get branch reference data
      const { data: branchData, error: branchError } = await supabase
        .schema('meridian')
        .from('ref_branches')
        .select('*');

      if (branchError) throw branchError;
      setBranches(branchData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }

  const regions = ['all', ...new Set(metrics.filter(m => m.region).map(m => m.region as string))];

  const filteredMetrics = selectedRegion === 'all'
    ? metrics
    : metrics.filter(m => m.region === selectedRegion);

  const totalTransactions = filteredMetrics.reduce((sum, m) => sum + m.transaction_count, 0);
  const totalVolume = filteredMetrics.reduce((sum, m) => sum + m.total_amount, 0);
  const totalCustomers = filteredMetrics.reduce((sum, m) => sum + m.customer_count, 0);

  // Check for issues
  const hasUnknownBranch = metrics.some(m => m.branch_id === 'BR-UNKNOWN-001' || !m.branch_name);
  const unknownBranchTransactions = metrics
    .filter(m => m.branch_id === 'BR-UNKNOWN-001' || !m.branch_name)
    .reduce((sum, m) => sum + m.transaction_count, 0);

  // Find branch info for each metric
  const getBranchInfo = (branchId: string) => branches.find(b => b.branch_id === branchId);

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
                <span className="font-semibold text-gray-900">Branch Performance</span>
              </div>
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
          </div>
        ) : metrics.length === 0 ? (
          <div className="rounded-xl bg-amber-50 p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No Data Available</h3>
            <p className="mt-2 text-gray-600">
              Seed the database first using the Admin Panel.
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
            {/* Data Quality Alert */}
            {hasUnknownBranch && (
              <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-800">Reference Data Gap Detected</h3>
                    <p className="mt-1 text-sm text-amber-700">
                      {formatNumber(unknownBranchTransactions)} transactions are associated with an unknown branch
                      that doesn&apos;t exist in the reference data. This affects report accuracy.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <span className="text-sm font-medium text-gray-500">Total Branches</span>
                <p className="mt-2 text-3xl font-bold text-gray-900">{filteredMetrics.length}</p>
                <p className="mt-2 text-sm text-gray-500">
                  {hasUnknownBranch ? '(1 unknown)' : 'All identified'}
                </p>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <span className="text-sm font-medium text-gray-500">Total Transactions</span>
                <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(totalTransactions)}</p>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <span className="text-sm font-medium text-gray-500">Total Volume</span>
                <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(totalVolume)}</p>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <span className="text-sm font-medium text-gray-500">Unique Customers</span>
                <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(totalCustomers)}</p>
              </div>
            </div>

            {/* Region Filter */}
            <div className="mb-6 flex items-center gap-2">
              <span className="text-sm text-gray-500">Filter by region:</span>
              <div className="flex gap-2">
                {regions.map((region) => (
                  <button
                    key={region}
                    onClick={() => setSelectedRegion(region)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      selectedRegion === region
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {region === 'all' ? 'All Regions' : region}
                  </button>
                ))}
              </div>
            </div>

            {/* Branch Cards */}
            <div className="grid grid-cols-2 gap-4">
              {filteredMetrics.map((metric) => {
                const info = getBranchInfo(metric.branch_id);
                const isUnknown = metric.branch_id === 'BR-UNKNOWN-001' || !metric.branch_name;

                return (
                  <div
                    key={metric.branch_id}
                    className={`rounded-xl bg-white p-6 shadow-sm border ${
                      isUnknown ? 'border-amber-300 bg-amber-50' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {isUnknown ? (
                            <>
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                              <h3 className="font-semibold text-amber-700">[UNKNOWN BRANCH]</h3>
                            </>
                          ) : (
                            <>
                              <Building2 className="h-5 w-5 text-primary-600" />
                              <h3 className="font-semibold text-gray-900">{metric.branch_name}</h3>
                            </>
                          )}
                        </div>
                        {info && (
                          <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="h-3.5 w-3.5" />
                            {info.city}, {info.state}
                          </div>
                        )}
                        <p className="mt-1 text-xs text-gray-400">{metric.branch_id}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        metric.region === 'Northeast' ? 'bg-blue-100 text-blue-700' :
                        metric.region === 'South' ? 'bg-green-100 text-green-700' :
                        metric.region === 'Midwest' ? 'bg-amber-100 text-amber-700' :
                        metric.region === 'West' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {metric.region || 'Unknown'}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Transactions</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatNumber(metric.transaction_count)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Volume</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(metric.total_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Avg Value</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(metric.avg_transaction_value)}
                        </p>
                      </div>
                    </div>

                    {info && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Manager: {info.manager_name}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
