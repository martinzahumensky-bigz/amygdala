'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Database,
  Play,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Trash2,
  Zap
} from 'lucide-react';

interface SeedResult {
  success: boolean;
  results: {
    branches?: number;
    segments?: number;
    customers?: number;
    transactions?: number;
    dailyRevenueRecords?: number;
    branchMetricsRecords?: number;
    qualityIssues?: {
      invalidPhones: number;
      invalidEmails: number;
      missingSegments: number;
      invalidPhonePercent: string;
      invalidEmailPercent: string;
      missingSegmentPercent: string;
    };
    unknownBranchTransactions?: number;
    cleared?: boolean;
  };
  summary: {
    customers: number;
    transactions: number;
    dailyRevenueRecords: number;
    branchMetricsRecords: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Config
  const [customerCount, setCustomerCount] = useState(5000);
  const [daysBack, setDaysBack] = useState(180);
  const [clearFirst, setClearFirst] = useState(false);

  async function handleSeed() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params = new URLSearchParams({
        customers: customerCount.toString(),
        days: daysBack.toString(),
        clear: clearFirst.toString()
      });

      const response = await fetch(`/api/seed?${params}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Seed failed');
      }

      setResult(data);
    } catch (err) {
      console.error('Seed error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
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
                <Settings className="h-5 w-5 text-primary-600" />
                <span className="font-semibold text-gray-900">Admin Panel</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl bg-white p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <Database className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Database Seeder</h2>
          </div>

          <p className="text-gray-600 mb-8">
            Generate sample banking data with intentional quality issues for demonstrating
            Amygdala&apos;s detection capabilities. This will populate the Meridian Bank simulation
            with customers, transactions, and aggregated metrics.
          </p>

          {/* Configuration */}
          <div className="grid gap-6 mb-8">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Customers
                </label>
                <input
                  type="number"
                  value={customerCount}
                  onChange={(e) => setCustomerCount(parseInt(e.target.value) || 1000)}
                  min={100}
                  max={50000}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-500">Min: 100, Max: 50,000</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days of History
                </label>
                <input
                  type="number"
                  value={daysBack}
                  onChange={(e) => setDaysBack(parseInt(e.target.value) || 30)}
                  min={7}
                  max={365}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-500">Min: 7, Max: 365</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="clearFirst"
                checked={clearFirst}
                onChange={(e) => setClearFirst(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="clearFirst" className="text-sm text-gray-700">
                Clear existing data before seeding
              </label>
            </div>
          </div>

          {/* Quality Issues Preview */}
          <div className="mb-8 rounded-lg bg-amber-50 p-4 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-amber-600" />
              <h3 className="font-medium text-amber-800">Intentional Quality Issues</h3>
            </div>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>~15% of customers will have invalid phone numbers</li>
              <li>~8% of customers will have invalid email addresses</li>
              <li>~3% of customers will be missing segment data</li>
              <li>~2% of transactions will reference an unknown branch</li>
            </ul>
          </div>

          {/* Seed Button */}
          <button
            onClick={handleSeed}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium text-white transition ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Seeding Database...
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Seed Database
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-lg bg-red-50 p-4 border border-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="font-medium text-red-800">Error</h3>
              </div>
              <p className="mt-2 text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="mt-6 rounded-lg bg-green-50 p-6 border border-green-200">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-green-800">Seed Completed Successfully</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p><span className="font-medium">Branches:</span> {result.results.branches}</p>
                  <p><span className="font-medium">Segments:</span> {result.results.segments}</p>
                  <p><span className="font-medium">Customers:</span> {result.summary.customers.toLocaleString()}</p>
                  <p><span className="font-medium">Transactions:</span> {result.summary.transactions.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <p><span className="font-medium">Revenue Records:</span> {result.summary.dailyRevenueRecords}</p>
                  <p><span className="font-medium">Branch Metrics:</span> {result.summary.branchMetricsRecords.toLocaleString()}</p>
                  <p><span className="font-medium">Date Range:</span></p>
                  <p className="text-gray-600">{result.summary.dateRange.start} to {result.summary.dateRange.end}</p>
                </div>
              </div>

              {result.results.qualityIssues && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">Injected Quality Issues:</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-green-700">Invalid Phones</p>
                      <p className="font-semibold">{result.results.qualityIssues.invalidPhones.toLocaleString()}</p>
                      <p className="text-xs text-green-600">{result.results.qualityIssues.invalidPhonePercent}</p>
                    </div>
                    <div>
                      <p className="text-green-700">Invalid Emails</p>
                      <p className="font-semibold">{result.results.qualityIssues.invalidEmails.toLocaleString()}</p>
                      <p className="text-xs text-green-600">{result.results.qualityIssues.invalidEmailPercent}</p>
                    </div>
                    <div>
                      <p className="text-green-700">Missing Segments</p>
                      <p className="font-semibold">{result.results.qualityIssues.missingSegments.toLocaleString()}</p>
                      <p className="text-xs text-green-600">{result.results.qualityIssues.missingSegmentPercent}</p>
                    </div>
                  </div>
                </div>
              )}

              {result.results.unknownBranchTransactions && result.results.unknownBranchTransactions > 0 && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <p className="text-sm text-green-700">
                    <span className="font-medium">Unknown Branch Transactions:</span>{' '}
                    {result.results.unknownBranchTransactions.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <Link
            href="/reports/revenue"
            className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 hover:border-primary-300 transition"
          >
            <h3 className="font-medium text-gray-900">Daily Revenue Report</h3>
            <p className="mt-1 text-sm text-gray-500">View generated revenue data</p>
          </Link>
          <Link
            href="/reports/branch-performance"
            className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 hover:border-primary-300 transition"
          >
            <h3 className="font-medium text-gray-900">Branch Performance</h3>
            <p className="mt-1 text-sm text-gray-500">View branch metrics</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
