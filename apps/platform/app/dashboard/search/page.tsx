'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, Input, Badge, Tag } from '@amygdala/ui';
import { Search as SearchIcon, Table2, FileText, GitBranch, Clock } from 'lucide-react';

const recentSearches = [
  'customer email validation',
  'revenue report',
  'branch metrics',
];

const searchResults = [
  {
    type: 'asset',
    name: 'CRM_CUSTOMERS',
    description: 'Customer relationship management data',
    tags: ['E-mail', 'Surname'],
    icon: Table2,
  },
  {
    type: 'asset',
    name: 'CUSTOMER_PROFILE',
    description: 'Unified customer profile with demographics',
    tags: ['Customer ID', 'Phone'],
    icon: Table2,
  },
  {
    type: 'report',
    name: 'Daily Revenue Report',
    description: 'Aggregated daily revenue by branch',
    tags: ['Revenue', 'Branch'],
    icon: FileText,
  },
  {
    type: 'lineage',
    name: 'Customer Data Flow',
    description: 'CRM → Profile → Reports',
    tags: ['ETL', 'Pipeline'],
    icon: GitBranch,
  },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');

  return (
    <>
      <Header title="Search" icon={<SearchIcon className="h-5 w-5" />} />

      <main className="p-6 space-y-6">
        {/* Search Input */}
        <div className="mx-auto max-w-2xl">
          <Input
            icon={<SearchIcon className="h-5 w-5" />}
            placeholder="Search assets, reports, glossary terms..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 text-base"
          />
        </div>

        {!query ? (
          /* Recent Searches */
          <div className="mx-auto max-w-2xl">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              Recent Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search) => (
                <button
                  key={search}
                  onClick={() => setQuery(search)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Search Results */
          <div className="space-y-3">
            {searchResults.map((result, idx) => (
              <Card key={idx} className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                      <result.icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">{result.name}</h3>
                        <Badge variant="default">{result.type}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{result.description}</p>
                      <div className="mt-2 flex gap-1">
                        {result.tags.map((tag) => (
                          <Tag key={tag} variant="outline">
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
