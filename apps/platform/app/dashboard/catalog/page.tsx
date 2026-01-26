'use client';

import { useState, useEffect } from 'react';
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
  RefreshCw,
  Loader2,
  LayoutDashboard,
  FileText,
  Globe,
  Layers,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  layer: string;
  description: string;
  business_context: string;
  tags: string[];
  owner: string;
  steward: string;
  upstream_assets: string[];
  downstream_assets: string[];
  source_table: string;
  quality_score: number | null;
  trust_score_stars: number | null;
  trust_score_raw: number | null;
  trust_explanation: string | null;
  fitness_status: 'green' | 'amber' | 'red';
  metadata: Record<string, any>;
  created_at: string;
}

const layerConfig: Record<string, { color: string; label: string }> = {
  consumer: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'Consumer' },
  gold: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Gold' },
  silver: { color: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300', label: 'Silver' },
  bronze: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Bronze' },
  raw: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Raw' },
};

const typeConfig: Record<string, { icon: any; label: string }> = {
  dashboard: { icon: LayoutDashboard, label: 'Dashboard' },
  report: { icon: FileText, label: 'Report' },
  table: { icon: Table2, label: 'Table' },
  view: { icon: Eye, label: 'View' },
  api: { icon: Globe, label: 'API' },
  application_screen: { icon: Layers, label: 'Application' },
};

const fitnessConfig = {
  green: { color: 'bg-green-500', label: 'Healthy' },
  amber: { color: 'bg-yellow-500', label: 'Warning' },
  red: { color: 'bg-red-500', label: 'Critical' },
};

export default function CatalogPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [layerFilter, setLayerFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [fitnessFilter, setFitnessFilter] = useState<string>('all');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [layerCounts, setLayerCounts] = useState<Record<string, number>>({});
  const [fitnessCounts, setFitnessCounts] = useState<Record<string, number>>({});
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (layerFilter !== 'all') params.set('layer', layerFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (fitnessFilter !== 'all') params.set('fitness', fitnessFilter);

      const res = await fetch(`/api/assets?${params.toString()}`);
      const data = await res.json();
      setAssets(data.assets || []);
      setTotal(data.total || 0);
      setLayerCounts(data.layerCounts || {});
      setFitnessCounts(data.fitnessCounts || {});
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [layerFilter, typeFilter, fitnessFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAssets();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const seedAssets = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/seed', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        await fetchAssets();
      }
    } catch (error) {
      console.error('Failed to seed assets:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  const toggleAsset = (id: string) => {
    setSelectedAssets((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedAssets.length === assets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(assets.map((a) => a.id));
    }
  };

  const getTypeIcon = (type: string) => {
    const config = typeConfig[type] || typeConfig.table;
    const Icon = config.icon;
    return <Icon className="h-4 w-4 text-gray-400" />;
  };

  return (
    <>
      <Header
        title="Data Catalog"
        icon={<Database className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAssets} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
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
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="p-3">
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">{total}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Assets</div>
          </Card>
          {Object.entries(layerConfig).map(([layer, config]) => (
            <Card key={layer} className="p-3">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {layerCounts[layer] || 0}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{config.label}</div>
            </Card>
          ))}
        </div>

        {/* Fitness Status */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Data Health:</span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{fitnessCounts.green || 0} Healthy</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{fitnessCounts.amber || 0} Warning</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{fitnessCounts.red || 0} Critical</span>
            </span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <Dropdown
            placeholder="Layer"
            value={layerFilter}
            options={[
              { value: 'all', label: 'All Layers' },
              { value: 'consumer', label: 'Consumer' },
              { value: 'gold', label: 'Gold' },
              { value: 'silver', label: 'Silver' },
              { value: 'bronze', label: 'Bronze' },
              { value: 'raw', label: 'Raw' },
            ]}
            onChange={setLayerFilter}
          />
          <Dropdown
            placeholder="Type"
            value={typeFilter}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'dashboard', label: 'Dashboard' },
              { value: 'report', label: 'Report' },
              { value: 'table', label: 'Table' },
              { value: 'view', label: 'View' },
              { value: 'api', label: 'API' },
              { value: 'application_screen', label: 'Application' },
            ]}
            onChange={setTypeFilter}
          />
          <Dropdown
            placeholder="Health"
            value={fitnessFilter}
            options={[
              { value: 'all', label: 'All Health' },
              { value: 'green', label: 'Healthy' },
              { value: 'amber', label: 'Warning' },
              { value: 'red', label: 'Critical' },
            ]}
            onChange={setFitnessFilter}
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && assets.length === 0 && (
          <Card className="p-12 text-center">
            <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No assets found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery || layerFilter !== 'all' || typeFilter !== 'all'
                ? 'No assets match your filters. Try adjusting your search criteria.'
                : 'Get started by seeding the catalog with Meridian Bank assets.'}
            </p>
            {!searchQuery && layerFilter === 'all' && typeFilter === 'all' && (
              <Button onClick={seedAssets} disabled={isSeeding}>
                {isSeeding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Database className="mr-2 h-4 w-4" />
                )}
                Seed Meridian Assets
              </Button>
            )}
          </Card>
        )}

        {/* Data Table */}
        {!isLoading && assets.length > 0 && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedAssets.length === assets.length && assets.length > 0}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="w-8 px-2 py-3"></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Layer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Health
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Quality
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Trust
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Owner
                    </th>
                    <th className="w-12 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {assets.map((asset) => {
                    const layer = layerConfig[asset.layer] || layerConfig.silver;
                    const fitness = fitnessConfig[asset.fitness_status] || fitnessConfig.green;

                    return (
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
                          <div className={`h-2 w-2 rounded-full ${fitness.color}`} title={fitness.label} />
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/catalog/${asset.id}`}
                            className="inline-flex items-center gap-2 font-medium text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
                          >
                            {getTypeIcon(asset.asset_type)}
                            {asset.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={layer.color}>{layer.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {typeConfig[asset.asset_type]?.label || asset.asset_type}
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {asset.description || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                            asset.fitness_status === 'green'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : asset.fitness_status === 'amber'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {fitness.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {asset.quality_score !== null ? (
                            <QualityBar value={asset.quality_score} size="sm" />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {asset.trust_score_stars !== null ? (
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3.5 w-3.5 ${
                                    star <= (asset.trust_score_stars || 0)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300 dark:text-gray-600'
                                  }`}
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {asset.owner || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <button className="text-gray-400 opacity-0 transition group-hover:opacity-100 hover:text-gray-600 dark:hover:text-gray-300">
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Showing {assets.length} of {total} assets
              </span>
              {selectedAssets.length > 0 && (
                <span className="text-sm text-primary-600 dark:text-primary-400">
                  {selectedAssets.length} selected
                </span>
              )}
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
