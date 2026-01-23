'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Phone,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Mail,
  MapPin,
  User,
  Headphones
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

export default function CallCenterPage() {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'phone' | 'email' | 'id'>('phone');
  const [results, setResults] = useState<Customer[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  async function handleSearch() {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.customers || []);
      if (data.customers?.length === 1) {
        setSelectedCustomer(data.customers[0]);
      } else {
        setSelectedCustomer(null);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
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
                <Headphones className="h-5 w-5 text-indigo-600" />
                <span className="font-semibold text-gray-900">Call Center Console</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Agent Online
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search Section */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Lookup</h2>

          <div className="flex gap-4">
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setSearchType('phone')}
                className={`px-4 py-2 text-sm font-medium transition ${
                  searchType === 'phone' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Phone className="h-4 w-4 inline mr-1" />
                Phone
              </button>
              <button
                onClick={() => setSearchType('email')}
                className={`px-4 py-2 text-sm font-medium transition border-l border-gray-300 ${
                  searchType === 'email' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Mail className="h-4 w-4 inline mr-1" />
                Email
              </button>
              <button
                onClick={() => setSearchType('id')}
                className={`px-4 py-2 text-sm font-medium transition border-l border-gray-300 ${
                  searchType === 'id' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <User className="h-4 w-4 inline mr-1" />
                ID/Name
              </button>
            </div>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={
                  searchType === 'phone' ? 'Enter phone number...' :
                  searchType === 'email' ? 'Enter email address...' :
                  'Enter customer ID or name...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </button>
          </div>
        </div>

        {/* Results */}
        {error ? (
          <div className="rounded-xl bg-red-50 p-6 text-center text-red-600">
            <AlertTriangle className="mx-auto h-8 w-8" />
            <p className="mt-2">{error}</p>
          </div>
        ) : searched && results.length === 0 ? (
          <div className="rounded-xl bg-amber-50 p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No Customer Found</h3>
            <p className="mt-2 text-gray-600">
              No customer matches your search criteria. Please verify the information.
            </p>
          </div>
        ) : results.length > 0 && !selectedCustomer ? (
          <div className="rounded-xl bg-white shadow-sm border border-gray-100">
            <div className="border-b border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900">Multiple Results ({results.length})</h3>
              <p className="text-sm text-gray-500">Select a customer to view details</p>
            </div>
            <div className="divide-y divide-gray-100">
              {results.map((customer) => (
                <button
                  key={customer.customer_id}
                  onClick={() => setSelectedCustomer(customer)}
                  className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">{customer.full_name}</p>
                    <p className="text-sm text-gray-500">{customer.customer_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{customer.phone}</p>
                    <p className="text-sm text-gray-500">{customer.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : selectedCustomer ? (
          <div className="grid grid-cols-3 gap-6">
            {/* Customer Card */}
            <div className="col-span-2 rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedCustomer.full_name}</h2>
                  <p className="text-gray-500">{selectedCustomer.customer_id}</p>
                </div>
                {selectedCustomer.segment_name ? (
                  <span className="rounded-full bg-indigo-100 px-4 py-1 text-sm font-medium text-indigo-700">
                    {selectedCustomer.segment_name}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-4 py-1 text-sm font-medium text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    No Segment
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Contact Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Contact Information</h3>

                  <div className="flex items-start gap-3">
                    <div className={`rounded-full p-2 ${selectedCustomer.email_valid ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Mail className={`h-4 w-4 ${selectedCustomer.email_valid ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className={`font-medium ${selectedCustomer.email_valid ? 'text-gray-900' : 'text-red-600'}`}>
                        {selectedCustomer.email || 'Not provided'}
                      </p>
                      {!selectedCustomer.email_valid && (
                        <p className="text-xs text-red-500 mt-1">Invalid email - cannot send communications</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`rounded-full p-2 ${selectedCustomer.phone_valid ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Phone className={`h-4 w-4 ${selectedCustomer.phone_valid ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className={`font-medium ${selectedCustomer.phone_valid ? 'text-gray-900' : 'text-red-600'}`}>
                        {selectedCustomer.phone || 'Not provided'}
                      </p>
                      {selectedCustomer.phone_valid && selectedCustomer.phone_normalized && (
                        <p className="text-xs text-gray-500 mt-1">E.164: {selectedCustomer.phone_normalized}</p>
                      )}
                      {!selectedCustomer.phone_valid && (
                        <p className="text-xs text-red-500 mt-1">Invalid phone - cannot verify caller</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-full p-2 bg-gray-100">
                      <MapPin className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium text-gray-900">{selectedCustomer.city}, {selectedCustomer.state}</p>
                    </div>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Verification Status</h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <span className="text-gray-600">Email Verified</span>
                      {selectedCustomer.email_valid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <span className="text-gray-600">Phone Verified</span>
                      {selectedCustomer.phone_valid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <span className="text-gray-600">Segment Assigned</span>
                      {selectedCustomer.segment_id ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="space-y-4">
              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                    Start New Case
                  </button>
                  <button className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    View Account History
                  </button>
                  <button className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Send Verification
                  </button>
                </div>
              </div>

              {(!selectedCustomer.email_valid || !selectedCustomer.phone_valid || !selectedCustomer.segment_id) && (
                <div className="rounded-xl bg-amber-50 p-4 border border-amber-200">
                  <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Data Quality Alert
                  </h3>
                  <ul className="space-y-1 text-sm text-amber-700">
                    {!selectedCustomer.email_valid && (
                      <li>Email verification failed</li>
                    )}
                    {!selectedCustomer.phone_valid && (
                      <li>Phone verification failed</li>
                    )}
                    {!selectedCustomer.segment_id && (
                      <li>Customer segment missing</li>
                    )}
                  </ul>
                </div>
              )}

              <button
                onClick={() => { setSelectedCustomer(null); setResults([]); setSearched(false); setSearchQuery(''); }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                New Search
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-gray-50 p-12 text-center">
            <Headphones className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-600">Ready for Customer Lookup</h3>
            <p className="mt-2 text-gray-500">
              Enter a phone number, email, or customer ID to search
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
