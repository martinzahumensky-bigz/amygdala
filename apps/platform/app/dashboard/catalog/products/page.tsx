'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, Badge, Button, Input, Dropdown } from '@amygdala/ui';
import {
  Package,
  Search,
  Plus,
  RefreshCw,
  Loader2,
  MoreVertical,
  Users,
  FolderOpen,
  CheckCircle2,
  Clock,
  Archive,
  XCircle,
  LayoutGrid,
  List,
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
  asset_count: number;
  created_at: string;
  updated_at: string;
}

const domainColors: Record<string, string> = {
  Finance: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Marketing: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Operations: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  HR: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Technology: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  Sales: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Customer Success': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Legal: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  'Risk & Compliance': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const statusConfig = {
  draft: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: Clock, label: 'Draft' },
  published: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2, label: 'Published' },
  deprecated: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Archive, label: 'Deprecated' },
  retired: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, label: 'Retired' },
};

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

export default function DataProductsPage() {
  const [products, setProducts] = useState<DataProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [domainCounts, setDomainCounts] = useState<Record<string, number>>({});
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (domainFilter !== 'all') params.set('domain', domainFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setDomainCounts(data.domainCounts || {});
      setStatusCounts(data.statusCounts || {});
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [domainFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateProduct = async (productData: Partial<DataProduct>) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      if (res.ok) {
        setShowCreateModal(false);
        fetchProducts();
      }
    } catch (error) {
      console.error('Failed to create product:', error);
    }
  };

  return (
    <>
      <Header
        title="Data Products"
        icon={<Package className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchProducts} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-l-lg ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-r-lg ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Product
            </Button>
          </div>
        }
      />

      <main className="p-6 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-3">
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">{total}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Products</div>
          </Card>
          {Object.entries(statusConfig).map(([status, config]) => (
            <Card key={status} className="p-3">
              <div className="flex items-center gap-2">
                <config.icon className="h-4 w-4 text-gray-400" />
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {statusCounts[status] || 0}
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{config.label}</div>
            </Card>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <Dropdown
            placeholder="Domain"
            value={domainFilter}
            options={[
              { value: 'all', label: 'All Domains' },
              ...defaultDomains.map(d => ({ value: d, label: d })),
            ]}
            onChange={setDomainFilter}
          />
          <Dropdown
            placeholder="Status"
            value={statusFilter}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
              { value: 'deprecated', label: 'Deprecated' },
              { value: 'retired', label: 'Retired' },
            ]}
            onChange={setStatusFilter}
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && products.length === 0 && (
          <Card className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No data products found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery || domainFilter !== 'all' || statusFilter !== 'all'
                ? 'No products match your filters. Try adjusting your search criteria.'
                : 'Get started by creating your first data product to group related assets.'}
            </p>
            {!searchQuery && domainFilter === 'all' && statusFilter === 'all' && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Data Product
              </Button>
            )}
          </Card>
        )}

        {/* Products Grid */}
        {!isLoading && products.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Products List */}
        {!isLoading && products.length > 0 && viewMode === 'list' && (
          <Card>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {products.map((product) => (
                <ProductListItem key={product.id} product={product} />
              ))}
            </div>
          </Card>
        )}
      </main>

      {/* Create Product Modal */}
      {showCreateModal && (
        <CreateProductModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProduct}
        />
      )}
    </>
  );
}

function ProductCard({ product }: { product: DataProduct }) {
  const status = statusConfig[product.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const domainColor = domainColors[product.domain] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

  return (
    <Link href={`/dashboard/catalog/products/${product.id}`}>
      <Card className="p-4 h-full hover:shadow-md transition-shadow cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: product.color ? `${product.color}20` : '#f3f4f6' }}
          >
            {product.icon || <Package className="h-5 w-5 text-gray-400" />}
          </div>
          <Badge className={status.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="flex items-center gap-2 mb-3">
          {product.domain && (
            <Badge className={domainColor}>{product.domain}</Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1">
            <FolderOpen className="h-4 w-4" />
            <span>{product.asset_count} assets</span>
          </div>
          {product.owner && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{product.owner}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

function ProductListItem({ product }: { product: DataProduct }) {
  const status = statusConfig[product.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const domainColor = domainColors[product.domain] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

  return (
    <Link
      href={`/dashboard/catalog/products/${product.id}`}
      className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      <div
        className="h-10 w-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: product.color ? `${product.color}20` : '#f3f4f6' }}
      >
        {product.icon || <Package className="h-5 w-5 text-gray-400" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {product.name}
          </h3>
          {product.domain && (
            <Badge className={domainColor}>{product.domain}</Badge>
          )}
        </div>
        {product.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {product.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {product.asset_count} assets
        </div>
        <Badge className={status.color}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {status.label}
        </Badge>
      </div>
    </Link>
  );
}

function CreateProductModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: Partial<DataProduct>) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('');
  const [owner, setOwner] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    await onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      domain: domain || undefined,
      owner: owner.trim() || undefined,
      status: 'draft',
    });
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Create Data Product
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing Analytics"
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
              placeholder="What is this data product used for?"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Owner
            </label>
            <Input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Who owns this product?"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Product
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
