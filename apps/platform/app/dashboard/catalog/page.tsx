'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, Badge, Button, Input, QualityBar, Tag, Dropdown } from '@amygdala/ui';
import {
  Database,
  Search,
  Filter,
  ChevronDown,
  Table2,
  MoreVertical,
  Star,
  Eye,
  Download,
  Columns,
} from 'lucide-react';
import Link from 'next/link';

const assets = [
  {
    id: 1,
    name: 'SALES_ORDERS',
    description: 'Customer sales orders and transactions',
    terms: ['Currency', 'Surname', 'Country'],
    anomalies: null,
    quality: 100,
    attributes: 16,
    records: 7563,
    origin: 'Financial Transactions',
    location: 'Finance Transactions DB',
    status: 'published',
  },
  {
    id: 2,
    name: 'CRM_CUSTOMERS',
    description: 'Customer relationship management data',
    terms: ['[USA] City', 'Surname', 'E-mail'],
    anomalies: null,
    quality: 87,
    attributes: 14,
    records: 4578,
    origin: 'DWH: Core System',
    location: 'Analytical Data Warehouse',
    status: 'published',
  },
  {
    id: 3,
    name: 'CUSTOMER_PROFILE',
    description: 'Unified customer profile with demographics',
    terms: ['Renewal', 'Customer ID'],
    anomalies: null,
    quality: 75,
    attributes: 23,
    records: 4798,
    origin: 'DWH: Core System',
    location: 'Analytical Data Warehouse',
    status: 'published',
  },
  {
    id: 4,
    name: 'ALL_STOCKS',
    description: 'Inventory stock levels across warehouses',
    terms: [],
    anomalies: null,
    quality: null,
    attributes: 7,
    records: 619040,
    origin: 'DWH: Core System',
    location: 'Analytical Data Warehouse',
    status: 'unpublished',
  },
  {
    id: 5,
    name: 'PARTY_FULL',
    description: 'Complete party/entity master data',
    terms: ['[USA] Social Security Number'],
    anomalies: null,
    quality: null,
    attributes: 9,
    records: 139317,
    origin: 'DWH: Core System',
    location: 'Analytical Data Warehouse',
    status: 'published',
  },
  {
    id: 6,
    name: 'BANK_TRANSACTIONS',
    description: 'Banking transaction records',
    terms: ['E-mail', 'Surname'],
    anomalies: 3,
    quality: 26,
    attributes: 13,
    records: 1678,
    origin: 'DT_demo',
    location: 'CRM Data',
    status: 'published',
  },
  {
    id: 7,
    name: 'SP_DT_SALES_TRANSACTION',
    description: 'Sales transactions with personal data',
    terms: ['E-mail', 'Personal Data'],
    anomalies: null,
    quality: 100,
    attributes: 6,
    records: 20,
    origin: 'DT_demo',
    location: 'DEMO',
    status: 'published',
  },
  {
    id: 8,
    name: 'FACT_REVENUE',
    description: 'Revenue fact table for reporting',
    terms: ['Currency'],
    anomalies: null,
    quality: 100,
    attributes: 5,
    records: 5000,
    origin: 'DWH: Core System',
    location: 'Analytical Data Warehouse',
    status: 'published',
  },
];

const tabs = [
  { id: 'published', label: 'Published', count: 7 },
  { id: 'unpublished', label: 'Unpublished', count: 1 },
  { id: 'all', label: 'All', count: 8 },
];

const filterOptions = [
  { value: 'terms', label: 'Terms' },
  { value: 'quality', label: 'Data Quality' },
  { value: 'source', label: 'Data Source' },
  { value: 'location', label: 'Location' },
];

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);

  const filteredAssets = assets.filter((asset) => {
    if (activeTab === 'published' && asset.status !== 'published') return false;
    if (activeTab === 'unpublished' && asset.status !== 'unpublished') return false;
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const toggleAsset = (id: number) => {
    setSelectedAssets((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedAssets.length === filteredAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(filteredAssets.map((a) => a.id));
    }
  };

  return (
    <>
      <Header
        title="Data Catalog"
        icon={<Database className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Star className="mr-1.5 h-4 w-4" />
              Favorites
            </Button>
            <Button size="sm">
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      <main className="p-6 space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <Input
          icon={<Search className="h-4 w-4" />}
          placeholder="Type here to full-text for Catalog items"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-2xl"
        />

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.map((filter) => (
            <button
              key={filter.value}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {filter.label}
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
          ))}
          <button className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 transition hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50">
            Number of Attributes
            <ChevronDown className="h-4 w-4" />
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 transition hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50">
            Number of Records
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Hidden columns toggle */}
        <div className="flex items-center justify-between">
          <button className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            <Columns className="h-4 w-4" />
            Hidden columns
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Data Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedAssets.length === filteredAssets.length}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <button className="inline-flex items-center gap-1">
                      Name
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Terms
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Anomalies
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Overall Quality
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    # Attributes
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    # Records
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Origin
                  </th>
                  <th className="w-12 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedAssets.includes(asset.id)}
                        onChange={() => toggleAsset(asset.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/catalog/${asset.id}`}
                        className="inline-flex items-center gap-2 font-medium text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
                      >
                        <Table2 className="h-4 w-4 text-gray-400" />
                        {asset.name}
                      </Link>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {asset.description || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {asset.terms.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {asset.terms.slice(0, 2).map((term) => (
                            <Tag key={term} variant="default">
                              {term}
                            </Tag>
                          ))}
                          {asset.terms.length > 2 && (
                            <Tag variant="outline">+{asset.terms.length - 2}</Tag>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {asset.anomalies ? (
                        <Badge variant="danger">{asset.anomalies}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {asset.quality !== null ? (
                        <QualityBar value={asset.quality} size="sm" />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                      {asset.attributes}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                      {asset.records.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {asset.origin}
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-gray-400 opacity-0 transition group-hover:opacity-100 hover:text-gray-600 dark:hover:text-gray-300">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <button className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              Show 10 more
            </button>
            <div className="flex items-center gap-2">
              <button className="rounded px-2 py-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                &lt;
              </button>
              <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="text"
                  value="1"
                  className="w-8 rounded border border-gray-200 px-2 py-1 text-center text-sm dark:border-gray-700 dark:bg-gray-800"
                  readOnly
                />
                of 1
              </span>
              <button className="rounded px-2 py-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                &gt;
              </button>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              1-{filteredAssets.length} of {filteredAssets.length} items
            </span>
          </div>
        </Card>
      </main>
    </>
  );
}
