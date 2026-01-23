'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

interface Customer {
  customer_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  email_valid: boolean;
  phone: string;
  phone_valid: boolean;
  phone_normalized: string | null;
  city: string;
  state: string;
  segment_id: string | null;
  segment_name: string | null;
}

interface Segment {
  segment_id: string;
  segment_name: string;
  description: string;
}

interface Stats {
  total: number;
  validPhones: number;
  validEmails: number;
  missingSegments: number;
}

export default function Customer360Page() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('');
  const [validPhoneOnly, setValidPhoneOnly] = useState(false);
  const [validEmailOnly, setValidEmailOnly] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 20;

  // Selected customer for detail view
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchData();
  }, [search, selectedSegment, validPhoneOnly, validEmailOnly, page]);

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString()
      });

      if (search) params.set('search', search);
      if (selectedSegment) params.set('segment', selectedSegment);
      if (validPhoneOnly) params.set('validPhone', 'true');
      if (validEmailOnly) params.set('validEmail', 'true');

      const response = await fetch(`/api/customers?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data');
      }

      setCustomers(data.customers || []);
      setSegments(data.segments || []);
      setStats(data.stats || null);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / limit);

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
                <Users className="h-5 w-5 text-indigo-600" />
                <span className="font-semibold text-gray-900">Customer 360</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <span className="text-sm text-gray-500">Total Customers</span>
              <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <span className="text-sm text-gray-500">Valid Phones</span>
              <p className="text-2xl font-bold text-green-600">
                {stats.validPhones.toLocaleString()}
                <span className="text-sm font-normal text-gray-400 ml-1">
                  ({((stats.validPhones / stats.total) * 100).toFixed(1)}%)
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <span className="text-sm text-gray-500">Valid Emails</span>
              <p className="text-2xl font-bold text-green-600">
                {stats.validEmails.toLocaleString()}
                <span className="text-sm font-normal text-gray-400 ml-1">
                  ({((stats.validEmails / stats.total) * 100).toFixed(1)}%)
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <span className="text-sm text-gray-500">Missing Segments</span>
              <p className="text-2xl font-bold text-amber-600">
                {stats.missingSegments.toLocaleString()}
                <span className="text-sm font-normal text-gray-400 ml-1">
                  ({((stats.missingSegments / stats.total) * 100).toFixed(1)}%)
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Quality Issues Alert */}
        {stats && (stats.total - stats.validPhones > 0 || stats.total - stats.validEmails > 0) && (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">Data Quality Issues</h3>
                <ul className="mt-2 space-y-1 text-sm text-amber-700">
                  {stats.total - stats.validPhones > 0 && (
                    <li>{(stats.total - stats.validPhones).toLocaleString()} customers have invalid phone numbers</li>
                  )}
                  {stats.total - stats.validEmails > 0 && (
                    <li>{(stats.total - stats.validEmails).toLocaleString()} customers have invalid email addresses</li>
                  )}
                  {stats.missingSegments > 0 && (
                    <li>{stats.missingSegments.toLocaleString()} customers are missing segment assignment</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-6">
          {/* Customer List */}
          <div className="flex-1">
            {/* Search and Filters */}
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 mb-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, phone, or ID..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <select
                  value={selectedSegment}
                  onChange={(e) => { setSelectedSegment(e.target.value); setPage(0); }}
                  className="rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All Segments</option>
                  {segments.map((seg) => (
                    <option key={seg.segment_id} value={seg.segment_id}>{seg.segment_name}</option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={validPhoneOnly}
                    onChange={(e) => { setValidPhoneOnly(e.target.checked); setPage(0); }}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-600">Valid phone only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={validEmailOnly}
                    onChange={(e) => { setValidEmailOnly(e.target.checked); setPage(0); }}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-600">Valid email only</span>
                </label>
              </div>
            </div>

            {/* Results */}
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : error ? (
              <div className="rounded-xl bg-red-50 p-6 text-center text-red-600">
                <AlertTriangle className="mx-auto h-8 w-8" />
                <p className="mt-2">{error}</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="rounded-xl bg-gray-50 p-8 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No Customers Found</h3>
                <p className="mt-2 text-gray-600">
                  {search ? 'Try adjusting your search criteria' : 'Seed the database first using the Admin Panel'}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Segment</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {customers.map((customer) => (
                        <tr
                          key={customer.customer_id}
                          onClick={() => setSelectedCustomer(customer)}
                          className={`cursor-pointer hover:bg-gray-50 ${
                            selectedCustomer?.customer_id === customer.customer_id ? 'bg-indigo-50' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{customer.full_name}</p>
                            <p className="text-xs text-gray-500">{customer.customer_id}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-sm">
                              {customer.email_valid ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-red-500" />
                              )}
                              <span className={customer.email_valid ? 'text-gray-600' : 'text-red-600'}>
                                {customer.email || '-'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-sm mt-1">
                              {customer.phone_valid ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-red-500" />
                              )}
                              <span className={customer.phone_valid ? 'text-gray-600' : 'text-red-600'}>
                                {customer.phone || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {customer.segment_name ? (
                              <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                {customer.segment_name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                <AlertTriangle className="h-3 w-3" />
                                Missing
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {customer.city}, {customer.state}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-gray-600">Page {page + 1} of {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Customer Detail Panel */}
          {selectedCustomer && (
            <div className="w-96 rounded-xl bg-white p-6 shadow-sm border border-gray-100 h-fit sticky top-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900">Customer Profile</h3>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{selectedCustomer.full_name}</p>
                  <p className="text-sm text-gray-500">{selectedCustomer.customer_id}</p>
                </div>

                {selectedCustomer.segment_name ? (
                  <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
                    {selectedCustomer.segment_name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    No Segment Assigned
                  </span>
                )}

                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex items-start gap-3">
                    <Mail className={`h-5 w-5 mt-0.5 ${selectedCustomer.email_valid ? 'text-green-500' : 'text-red-500'}`} />
                    <div>
                      <p className={`font-medium ${selectedCustomer.email_valid ? 'text-gray-900' : 'text-red-600'}`}>
                        {selectedCustomer.email || 'No email'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedCustomer.email_valid ? 'Valid email' : 'Invalid email format'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className={`h-5 w-5 mt-0.5 ${selectedCustomer.phone_valid ? 'text-green-500' : 'text-red-500'}`} />
                    <div>
                      <p className={`font-medium ${selectedCustomer.phone_valid ? 'text-gray-900' : 'text-red-600'}`}>
                        {selectedCustomer.phone || 'No phone'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedCustomer.phone_valid
                          ? `Normalized: ${selectedCustomer.phone_normalized}`
                          : 'Invalid phone format'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 mt-0.5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedCustomer.city}, {selectedCustomer.state}
                      </p>
                      <p className="text-xs text-gray-500">Location</p>
                    </div>
                  </div>
                </div>

                {(!selectedCustomer.email_valid || !selectedCustomer.phone_valid || !selectedCustomer.segment_id) && (
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="font-medium text-amber-800 mb-2">Quality Issues</h4>
                    <ul className="space-y-1 text-sm text-amber-700">
                      {!selectedCustomer.email_valid && <li>Email validation failed</li>}
                      {!selectedCustomer.phone_valid && <li>Phone validation failed</li>}
                      {!selectedCustomer.segment_id && <li>Customer segment not assigned</li>}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
