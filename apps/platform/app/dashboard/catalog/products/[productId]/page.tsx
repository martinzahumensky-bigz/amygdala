'use client';

import { useState, useEffect, use } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, Badge, Button, Input, QualityBar, Dropdown } from '@amygdala/ui';
import {
  Package,
  ArrowLeft,
  Loader2,
  Settings,
  Users,
  Clock,
  CheckCircle2,
  Archive,
  XCircle,
  FolderOpen,
  Plus,
  X,
  Search,
  Table2,
  LayoutDashboard,
  FileText,
  Eye,
  Globe,
  Layers,
  Star,
  Trash2,
  Edit2,
} from 'lucide-react';
import Link from 'next/link';

interface DataProduct {
  id: string;
  name: string;
  description: string;
  business_purpose: string;
  domain: string;
  type: 'source-aligned' | 'aggregate' | 'consumer-aligned';
  status: 'draft' | 'published' | 'deprecated' | 'retired';
  owner: string;
  steward: string;
  icon: string;
  color: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deprecated_at: string | null;
}

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  layer: string;
  description: string;
  quality_score: number | null;
  trust_score_stars: number | null;
  fitness_status: 'green' | 'amber' | 'red';
  owner: string;
  product_role: string;
  added_at: string;
}

const domainColors: Record<string, string> = {
  Finance: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Marketing: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Operations: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  HR: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Technology: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  Sales: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const statusConfig = {
  draft: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: Clock, label: 'Draft' },
  published: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2, label: 'Published' },
  deprecated: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Archive, label: 'Deprecated' },
  retired: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, label: 'Retired' },
};

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

export default function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const [product, setProduct] = useState<DataProduct | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [healthSummary, setHealthSummary] = useState({ green: 0, amber: 0, red: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'quality'>('overview');
  const [showAddAssetsDrawer, setShowAddAssetsDrawer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchProduct = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/products/${productId}`);
      const data = await res.json();
      setProduct(data.product);
      setAssets(data.assets || []);
      setQualityScore(data.qualityScore);
      setHealthSummary(data.healthSummary || { green: 0, amber: 0, red: 0 });
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!product) return;
    try {
      await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchProduct();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleRemoveAsset = async (assetId: string) => {
    try {
      await fetch(`/api/products/${productId}/assets`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_ids: [assetId] }),
      });
      fetchProduct();
    } catch (error) {
      console.error('Failed to remove asset:', error);
    }
  };

  const handleUpdateProduct = async (updates: Partial<DataProduct>) => {
    try {
      await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setShowEditModal(false);
      fetchProduct();
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header
          title="Loading..."
          icon={<Package className="h-5 w-5" />}
        />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header
          title="Product Not Found"
          icon={<Package className="h-5 w-5" />}
        />
        <div className="p-6 text-center">
          <p className="text-gray-500">The requested data product could not be found.</p>
          <Link href="/dashboard/catalog/products">
            <Button className="mt-4">Back to Products</Button>
          </Link>
        </div>
      </>
    );
  }

  const status = statusConfig[product.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const domainColor = domainColors[product.domain] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

  return (
    <>
      <Header
        title={product.name}
        icon={
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: product.color ? `${product.color}20` : '#f3f4f6' }}
          >
            {product.icon || <Package className="h-4 w-4 text-gray-400" />}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/catalog/products">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
              <Edit2 className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
            {product.status === 'draft' && (
              <Button size="sm" onClick={() => handleStatusChange('published')}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Publish
              </Button>
            )}
            {product.status === 'published' && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('deprecated')}>
                <Archive className="h-4 w-4 mr-1.5" />
                Deprecate
              </Button>
            )}
            {product.status === 'deprecated' && (
              <>
                <Button size="sm" onClick={() => handleStatusChange('published')}>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Re-publish
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleStatusChange('retired')}>
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Retire
                </Button>
              </>
            )}
            {product.status === 'retired' && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('draft')}>
                <Clock className="h-4 w-4 mr-1.5" />
                Restore to Draft
              </Button>
            )}
          </div>
        }
      />

      <main className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">{assets.length}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Assets</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {qualityScore !== null ? `${Math.round(qualityScore)}%` : '-'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Quality</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Badge className={status.color}>
                <StatusIcon className="h-4 w-4 mr-1" />
                {status.label}
              </Badge>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Status</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">{healthSummary.green}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-sm">{healthSummary.amber}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-sm">{healthSummary.red}</span>
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Health</div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'assets', label: `Assets (${assets.length})` },
              { id: 'quality', label: 'Quality' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Description</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {product.description || 'No description provided.'}
                  </p>
                </CardContent>
              </Card>

              {product.business_purpose && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Business Purpose</h3>
                    <p className="text-gray-600 dark:text-gray-400">{product.business_purpose}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Details</h3>
                  <dl className="space-y-3">
                    {product.domain && (
                      <div>
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Domain</dt>
                        <dd><Badge className={domainColor}>{product.domain}</Badge></dd>
                      </div>
                    )}
                    {product.type && (
                      <div>
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Type</dt>
                        <dd className="text-gray-900 dark:text-white capitalize">{product.type.replace('-', ' ')}</dd>
                      </div>
                    )}
                    {product.owner && (
                      <div>
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Owner</dt>
                        <dd className="text-gray-900 dark:text-white">{product.owner}</dd>
                      </div>
                    )}
                    {product.steward && (
                      <div>
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Steward</dt>
                        <dd className="text-gray-900 dark:text-white">{product.steward}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Lifecycle</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                      <dd className="text-gray-900 dark:text-white">
                        {new Date(product.created_at).toLocaleDateString()}
                      </dd>
                    </div>
                    {product.published_at && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Published</dt>
                        <dd className="text-gray-900 dark:text-white">
                          {new Date(product.published_at).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                    {product.deprecated_at && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Deprecated</dt>
                        <dd className="text-gray-900 dark:text-white">
                          {new Date(product.deprecated_at).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {assets.length} asset{assets.length !== 1 ? 's' : ''} in this product
              </p>
              <Button size="sm" onClick={() => setShowAddAssetsDrawer(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Assets
              </Button>
            </div>

            {assets.length === 0 ? (
              <Card className="p-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No assets yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Add data assets to this product to start grouping related data.
                </p>
                <Button onClick={() => setShowAddAssetsDrawer(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Assets
                </Button>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Layer
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
                        <th className="w-12 px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {assets.map((asset) => {
                        const layer = layerConfig[asset.layer] || layerConfig.silver;
                        const TypeIcon = typeConfig[asset.asset_type]?.icon || Table2;

                        return (
                          <tr key={asset.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-3">
                              <Link
                                href={`/dashboard/catalog/${asset.id}`}
                                className="flex items-center gap-2 font-medium text-gray-900 hover:text-purple-600 dark:text-white dark:hover:text-purple-400"
                              >
                                <TypeIcon className="h-4 w-4 text-gray-400" />
                                {asset.name}
                              </Link>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={layer.color}>{layer.label}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                                asset.fitness_status === 'green'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : asset.fitness_status === 'amber'
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {asset.fitness_status === 'green' ? 'Healthy' : asset.fitness_status === 'amber' ? 'Warning' : 'Critical'}
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
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleRemoveAsset(asset.id)}
                                className="text-gray-400 opacity-0 transition group-hover:opacity-100 hover:text-red-600 dark:hover:text-red-400"
                                title="Remove from product"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quality Overview</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500 dark:text-gray-400">Average Quality Score</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {qualityScore !== null ? `${Math.round(qualityScore)}%` : 'N/A'}
                      </span>
                    </div>
                    {qualityScore !== null && <QualityBar value={qualityScore} />}
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Health Distribution</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm">
                          <span className="h-3 w-3 rounded-full bg-green-500" />
                          Healthy
                        </span>
                        <span className="font-medium">{healthSummary.green}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm">
                          <span className="h-3 w-3 rounded-full bg-yellow-500" />
                          Warning
                        </span>
                        <span className="font-medium">{healthSummary.amber}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm">
                          <span className="h-3 w-3 rounded-full bg-red-500" />
                          Critical
                        </span>
                        <span className="font-medium">{healthSummary.red}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Assets by Quality</h3>
                <div className="space-y-3">
                  {assets
                    .filter(a => a.quality_score !== null)
                    .sort((a, b) => (a.quality_score || 0) - (b.quality_score || 0))
                    .slice(0, 5)
                    .map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between">
                        <Link
                          href={`/dashboard/catalog/${asset.id}`}
                          className="text-sm text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 truncate"
                        >
                          {asset.name}
                        </Link>
                        <div className="flex items-center gap-2">
                          <QualityBar value={asset.quality_score!} size="sm" className="w-20" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white w-10 text-right">
                            {Math.round(asset.quality_score!)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  {assets.filter(a => a.quality_score === null).length > 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 pt-2">
                      {assets.filter(a => a.quality_score === null).length} asset(s) without quality scores
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Add Assets Drawer */}
      {showAddAssetsDrawer && (
        <AddAssetsDrawer
          productId={productId}
          existingAssetIds={assets.map(a => a.id)}
          onClose={() => setShowAddAssetsDrawer(false)}
          onAssetsAdded={fetchProduct}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && product && (
        <EditProductModal
          product={product}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdateProduct}
        />
      )}
    </>
  );
}

function AddAssetsDrawer({
  productId,
  existingAssetIds,
  onClose,
  onAssetsAdded,
}: {
  productId: string;
  existingAssetIds: string[];
  onClose: () => void;
  onAssetsAdded: () => void;
}) {
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await fetch('/api/assets?limit=100');
        const data = await res.json();
        setAllAssets(data.assets || []);
      } catch (error) {
        console.error('Failed to fetch assets:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssets();
  }, []);

  const availableAssets = allAssets.filter(
    (a) => !existingAssetIds.includes(a.id) &&
      (searchQuery === '' || a.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSave = async () => {
    if (selectedAssets.length === 0) return;
    setIsSaving(true);
    try {
      await fetch(`/api/products/${productId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_ids: selectedAssets }),
      });
      onAssetsAdded();
      onClose();
    } catch (error) {
      console.error('Failed to add assets:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAsset = (id: string) => {
    setSelectedAssets((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Assets</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
          ) : availableAssets.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              {searchQuery ? 'No matching assets found.' : 'All assets are already in this product.'}
            </p>
          ) : (
            <div className="space-y-2">
              {availableAssets.map((asset) => {
                const layer = layerConfig[asset.layer] || layerConfig.silver;
                const isSelected = selectedAssets.includes(asset.id);

                return (
                  <div
                    key={asset.id}
                    onClick={() => toggleAsset(asset.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {asset.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`${layer.color} text-xs`}>{layer.label}</Badge>
                          {asset.owner && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">{asset.owner}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {selectedAssets.length} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={selectedAssets.length === 0 || isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add {selectedAssets.length > 0 && `(${selectedAssets.length})`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const defaultDomains = [
  'Finance',
  'Marketing',
  'Operations',
  'HR',
  'Technology',
  'Sales',
  'Customer Success',
  'Legal',
  'Risk & Compliance',
];

function EditProductModal({
  product,
  onClose,
  onUpdate,
}: {
  product: DataProduct;
  onClose: () => void;
  onUpdate: (data: Partial<DataProduct>) => void;
}) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || '');
  const [businessPurpose, setBusinessPurpose] = useState(product.business_purpose || '');
  const [domain, setDomain] = useState(product.domain || '');
  const [owner, setOwner] = useState(product.owner || '');
  const [steward, setSteward] = useState(product.steward || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    await onUpdate({
      name: name.trim(),
      description: description.trim() || undefined,
      business_purpose: businessPurpose.trim() || undefined,
      domain: domain || undefined,
      owner: owner.trim() || undefined,
      steward: steward.trim() || undefined,
    });
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Edit Data Product
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Business Purpose
            </label>
            <textarea
              value={businessPurpose}
              onChange={(e) => setBusinessPurpose(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Domain
            </label>
            <Dropdown
              value={domain}
              placeholder="Select domain"
              options={[
                { value: '', label: 'No domain' },
                ...defaultDomains.map(d => ({ value: d, label: d })),
              ]}
              onChange={setDomain}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Owner
              </label>
              <Input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Steward
              </label>
              <Input
                value={steward}
                onChange={(e) => setSteward(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
