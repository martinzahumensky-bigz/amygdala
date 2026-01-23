'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Clock,
  PieChart,
  TrendingUp,
  Users
} from 'lucide-react';

interface LoanSummary {
  totalLoans: number;
  totalPrincipal: number;
  totalOutstanding: number;
  delinquencyRate: string;
  delinquentCount: number;
}

interface StatusData {
  status: string;
  count: number;
  amount: number;
}

interface TypeData {
  type: string;
  count: number;
  amount: number;
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

export default function LoanPortfolioPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [byStatus, setByStatus] = useState<StatusData[]>([]);
  const [byType, setByType] = useState<TypeData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reports/loan-portfolio');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data');
      }

      setSummary(data.summary || null);
      setByStatus(data.byStatus || []);
      setByType(data.byType || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }

  const hasDelinquency = summary && parseFloat(summary.delinquencyRate) > 0;

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
                <FileText className="h-5 w-5 text-indigo-600" />
                <span className="font-semibold text-gray-900">Loan Portfolio Report</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-full px-3 py-1 text-sm bg-green-100 text-green-700">
                <Clock className="h-4 w-4" />
                Updated recently
              </div>
              <button
                onClick={fetchData}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
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
        ) : !summary || summary.totalLoans === 0 ? (
          <div className="rounded-xl bg-amber-50 p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No Loan Data Available</h3>
            <p className="mt-2 text-gray-600">
              The loan portfolio data has not been seeded yet.
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700"
            >
              Go to Admin Panel
            </Link>
          </div>
        ) : (
          <>
            {/* Delinquency Alert */}
            {hasDelinquency && (
              <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-800">Portfolio Risk Alert</h3>
                    <p className="mt-1 text-sm text-amber-700">
                      {summary.delinquentCount} loans ({summary.delinquencyRate}%) are currently delinquent.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Total Loans</span>
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {formatNumber(summary.totalLoans)}
                </p>
                <p className="mt-2 text-sm text-gray-500">Active accounts</p>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Total Principal</span>
                  <DollarSign className="h-5 w-5 text-indigo-600" />
                </div>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {formatCurrency(summary.totalPrincipal)}
                </p>
                <p className="mt-2 text-sm text-gray-500">Original loan value</p>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Outstanding Balance</span>
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {formatCurrency(summary.totalOutstanding)}
                </p>
                <p className="mt-2 text-sm text-gray-500">Current receivables</p>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Delinquency Rate</span>
                  <AlertTriangle className={`h-5 w-5 ${hasDelinquency ? 'text-amber-500' : 'text-green-500'}`} />
                </div>
                <p className={`mt-2 text-3xl font-bold ${hasDelinquency ? 'text-amber-600' : 'text-green-600'}`}>
                  {summary.delinquencyRate}%
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {summary.delinquentCount} delinquent loans
                </p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* By Status */}
              <div className="rounded-xl bg-white shadow-sm border border-gray-100">
                <div className="border-b border-gray-100 p-6">
                  <div className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-semibold text-gray-900">Portfolio by Status</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {byStatus.map((item) => {
                      const percentage = summary.totalLoans > 0
                        ? (item.count / summary.totalLoans) * 100
                        : 0;
                      const isDelinquent = item.status.toLowerCase().includes('delinquent') ||
                                          item.status.toLowerCase().includes('default');
                      return (
                        <div key={item.status}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-medium ${isDelinquent ? 'text-amber-700' : 'text-gray-700'}`}>
                              {item.status}
                            </span>
                            <span className="text-sm text-gray-500">
                              {item.count} loans ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isDelinquent ? 'bg-amber-500' : 'bg-indigo-500'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatCurrency(item.amount)} outstanding
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* By Type */}
              <div className="rounded-xl bg-white shadow-sm border border-gray-100">
                <div className="border-b border-gray-100 p-6">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-semibold text-gray-900">Portfolio by Loan Type</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {byType.map((item) => {
                      const percentage = summary.totalPrincipal > 0
                        ? (item.amount / summary.totalPrincipal) * 100
                        : 0;
                      return (
                        <div key={item.type}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">
                              {item.type}
                            </span>
                            <span className="text-sm text-gray-500">
                              {item.count} loans
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-green-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatCurrency(item.amount)} ({percentage.toFixed(1)}% of portfolio)
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
