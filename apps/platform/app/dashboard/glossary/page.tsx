'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, Badge, Button, Input, Dropdown } from '@amygdala/ui';
import {
  BookOpen,
  Search,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  Archive,
  LayoutGrid,
  List,
  Link as LinkIcon,
  Tag,
  ChevronRight,
  X,
  Sparkles,
  DollarSign,
  Users,
  Package,
  Settings,
  Megaphone,
  TrendingUp,
  UserPlus,
  Cpu,
  Edit2,
  Trash2,
  ExternalLink,
} from 'lucide-react';

interface GlossaryDomain {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  term_count?: number;
}

interface GlossaryTerm {
  id: string;
  name: string;
  definition: string;
  domain_id?: string;
  domain?: GlossaryDomain;
  status: 'draft' | 'approved' | 'deprecated';
  owner?: string;
  steward?: string;
  synonyms: string[];
  related_terms: string[];
  abbreviation?: string;
  examples?: string;
  source?: string;
  linked_count: number;
  created_at: string;
  updated_at: string;
}

interface TermDetailData extends GlossaryTerm {
  links: Array<{
    id: string;
    asset_id: string;
    column_name?: string;
    asset?: {
      id: string;
      name: string;
      description?: string;
      layer: string;
      type: string;
    };
  }>;
  relatedTermsData: Array<{
    id: string;
    name: string;
    abbreviation?: string;
    status: string;
  }>;
}

const statusConfig = {
  draft: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: Clock, label: 'Draft' },
  approved: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2, label: 'Approved' },
  deprecated: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Archive, label: 'Deprecated' },
};

const domainIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign,
  Users,
  Package,
  Settings,
  Megaphone,
  TrendingUp,
  UserPlus,
  Cpu,
};

export default function GlossaryPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [domains, setDomains] = useState<GlossaryDomain[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [termDetail, setTermDetail] = useState<TermDetailData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/glossary/domains');
      const data = await res.json();
      setDomains(data.domains || []);
    } catch (error) {
      console.error('Failed to fetch domains:', error);
    }
  };

  const fetchTerms = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (domainFilter !== 'all') params.set('domain', domainFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/glossary?${params.toString()}`);
      const data = await res.json();
      setTerms(data.terms || []);
      setTotal(data.total || 0);
      setStatusCounts(data.statusCounts || {});
    } catch (error) {
      console.error('Failed to fetch terms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTermDetail = async (termId: string) => {
    try {
      setIsLoadingDetail(true);
      const res = await fetch(`/api/glossary/${termId}`);
      const data = await res.json();
      setTermDetail(data);
    } catch (error) {
      console.error('Failed to fetch term detail:', error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  useEffect(() => {
    fetchTerms();
  }, [domainFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTerms();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedTerm) {
      fetchTermDetail(selectedTerm);
    } else {
      setTermDetail(null);
    }
  }, [selectedTerm]);

  const handleCreateTerm = async (termData: Partial<GlossaryTerm>) => {
    try {
      const res = await fetch('/api/glossary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(termData),
      });
      if (res.ok) {
        setShowCreateModal(false);
        fetchTerms();
      }
    } catch (error) {
      console.error('Failed to create term:', error);
    }
  };

  const handleUpdateTerm = async (termId: string, updates: Partial<GlossaryTerm>) => {
    try {
      const res = await fetch(`/api/glossary/${termId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        fetchTerms();
        if (selectedTerm === termId) {
          fetchTermDetail(termId);
        }
      }
    } catch (error) {
      console.error('Failed to update term:', error);
    }
  };

  const handleDeleteTerm = async (termId: string) => {
    if (!confirm('Are you sure you want to delete this term?')) return;
    try {
      const res = await fetch(`/api/glossary/${termId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedTerm(null);
        fetchTerms();
      }
    } catch (error) {
      console.error('Failed to delete term:', error);
    }
  };

  return (
    <>
      <Header
        title="Business Glossary"
        icon={<BookOpen className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchTerms} disabled={isLoading}>
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
              Add Term
            </Button>
          </div>
        }
      />

      <main className="p-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className={`flex-1 space-y-4 ${selectedTerm ? 'max-w-[calc(100%-400px)]' : ''}`}>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
              <Card className="p-3">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">{total}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Terms</div>
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
                placeholder="Search terms, definitions, abbreviations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
              <Dropdown
                placeholder="Domain"
                value={domainFilter}
                options={[
                  { value: 'all', label: 'All Domains' },
                  ...domains.map(d => ({ value: d.id, label: d.name })),
                ]}
                onChange={setDomainFilter}
              />
              <Dropdown
                placeholder="Status"
                value={statusFilter}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'deprecated', label: 'Deprecated' },
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
            {!isLoading && terms.length === 0 && (
              <Card className="p-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No terms found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchQuery || domainFilter !== 'all' || statusFilter !== 'all'
                    ? 'No terms match your filters. Try adjusting your search criteria.'
                    : 'Start building your business glossary by adding your first term.'}
                </p>
                {!searchQuery && domainFilter === 'all' && statusFilter === 'all' && (
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Term
                  </Button>
                )}
              </Card>
            )}

            {/* Terms Grid */}
            {!isLoading && terms.length > 0 && viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {terms.map((term) => (
                  <TermCard
                    key={term.id}
                    term={term}
                    isSelected={selectedTerm === term.id}
                    onClick={() => setSelectedTerm(selectedTerm === term.id ? null : term.id)}
                  />
                ))}
              </div>
            )}

            {/* Terms List */}
            {!isLoading && terms.length > 0 && viewMode === 'list' && (
              <Card>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {terms.map((term) => (
                    <TermListItem
                      key={term.id}
                      term={term}
                      isSelected={selectedTerm === term.id}
                      onClick={() => setSelectedTerm(selectedTerm === term.id ? null : term.id)}
                    />
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Detail Panel */}
          {selectedTerm && (
            <TermDetailPanel
              term={termDetail}
              isLoading={isLoadingDetail}
              onClose={() => setSelectedTerm(null)}
              onUpdate={handleUpdateTerm}
              onDelete={handleDeleteTerm}
              allTerms={terms}
            />
          )}
        </div>
      </main>

      {/* Create Term Modal */}
      {showCreateModal && (
        <CreateTermModal
          domains={domains}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTerm}
        />
      )}
    </>
  );
}

function TermCard({
  term,
  isSelected,
  onClick,
}: {
  term: GlossaryTerm;
  isSelected: boolean;
  onClick: () => void;
}) {
  const status = statusConfig[term.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const DomainIcon = term.domain?.icon ? domainIcons[term.domain.icon] : Tag;

  return (
    <Card
      className={`p-4 h-full cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-purple-500 bg-purple-50/50 dark:bg-purple-900/10'
          : 'hover:shadow-md'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {term.abbreviation && (
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-mono">
              {term.abbreviation}
            </Badge>
          )}
          <Badge className={status.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>
        <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
      </div>

      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{term.name}</h3>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
        {term.definition}
      </p>

      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-800">
        {term.domain && DomainIcon && (
          <div className="flex items-center gap-1.5">
            <DomainIcon className="h-4 w-4" style={{ color: term.domain.color }} />
            <span>{term.domain.name}</span>
          </div>
        )}
        {term.linked_count > 0 && (
          <div className="flex items-center gap-1">
            <LinkIcon className="h-4 w-4" />
            <span>{term.linked_count} linked</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function TermListItem({
  term,
  isSelected,
  onClick,
}: {
  term: GlossaryTerm;
  isSelected: boolean;
  onClick: () => void;
}) {
  const status = statusConfig[term.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const DomainIcon = term.domain?.icon ? domainIcons[term.domain.icon] : Tag;

  return (
    <div
      className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-purple-50 dark:bg-purple-900/10'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {term.name}
          </h3>
          {term.abbreviation && (
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-mono text-xs">
              {term.abbreviation}
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {term.definition}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {term.domain && DomainIcon && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <DomainIcon className="h-4 w-4" style={{ color: term.domain.color }} />
            <span className="hidden sm:inline">{term.domain.name}</span>
          </div>
        )}
        {term.linked_count > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <LinkIcon className="h-4 w-4" />
            <span>{term.linked_count}</span>
          </div>
        )}
        <Badge className={status.color}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {status.label}
        </Badge>
        <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
      </div>
    </div>
  );
}

function TermDetailPanel({
  term,
  isLoading,
  onClose,
  onUpdate,
  onDelete,
  allTerms,
}: {
  term: TermDetailData | null;
  isLoading: boolean;
  onClose: () => void;
  onUpdate: (termId: string, updates: Partial<GlossaryTerm>) => void;
  onDelete: (termId: string) => void;
  allTerms: GlossaryTerm[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<GlossaryTerm>>({});

  useEffect(() => {
    if (term) {
      setEditData({
        name: term.name,
        definition: term.definition,
        abbreviation: term.abbreviation,
        examples: term.examples,
        owner: term.owner,
        steward: term.steward,
      });
    }
  }, [term]);

  const handleSave = () => {
    if (term) {
      onUpdate(term.id, editData);
      setIsEditing(false);
    }
  };

  if (isLoading || !term) {
    return (
      <div className="w-96 flex-shrink-0">
        <Card className="p-6 h-full">
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        </Card>
      </div>
    );
  }

  const status = statusConfig[term.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const DomainIcon = term.domain?.icon ? domainIcons[term.domain.icon] : Tag;

  return (
    <div className="w-96 flex-shrink-0">
      <Card className="p-6 h-fit sticky top-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            {term.abbreviation && (
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-mono mb-2">
                {term.abbreviation}
              </Badge>
            )}
            {isEditing ? (
              <Input
                value={editData.name || ''}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="font-semibold"
              />
            ) : (
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{term.name}</h2>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Edit2 className="h-4 w-4 text-gray-500" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Status & Domain */}
        <div className="flex items-center gap-2 mb-4">
          <Badge className={status.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
          {term.domain && DomainIcon && (
            <Badge className="bg-gray-100 dark:bg-gray-800">
              <DomainIcon className="h-3 w-3 mr-1" style={{ color: term.domain.color }} />
              {term.domain.name}
            </Badge>
          )}
        </div>

        {/* Definition */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Definition</h3>
          {isEditing ? (
            <textarea
              value={editData.definition || ''}
              onChange={(e) => setEditData({ ...editData, definition: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300">{term.definition}</p>
          )}
        </div>

        {/* Examples */}
        {(term.examples || isEditing) && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Examples</h3>
            {isEditing ? (
              <textarea
                value={editData.examples || ''}
                onChange={(e) => setEditData({ ...editData, examples: e.target.value })}
                rows={2}
                placeholder="Add usage examples..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">{term.examples}</p>
            )}
          </div>
        )}

        {/* Synonyms */}
        {term.synonyms && term.synonyms.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Synonyms</h3>
            <div className="flex flex-wrap gap-1">
              {term.synonyms.map((syn, i) => (
                <Badge key={i} className="bg-gray-100 dark:bg-gray-800 text-xs">
                  {syn}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Related Terms */}
        {term.relatedTermsData && term.relatedTermsData.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Related Terms</h3>
            <div className="space-y-1">
              {term.relatedTermsData.map((related) => (
                <div
                  key={related.id}
                  className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{related.name}</span>
                  {related.abbreviation && (
                    <span className="text-gray-400">({related.abbreviation})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Linked Assets */}
        {term.links && term.links.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Linked Assets ({term.links.length})
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {term.links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-2 text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <LinkIcon className="h-4 w-4 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {link.asset?.name}
                    </div>
                    {link.column_name && (
                      <div className="text-xs text-gray-500">Column: {link.column_name}</div>
                    )}
                  </div>
                  <a href={`/dashboard/catalog/${link.asset_id}`}>
                    <ExternalLink className="h-4 w-4 text-gray-400 hover:text-purple-500" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ownership */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Owner</h3>
            {isEditing ? (
              <Input
                value={editData.owner || ''}
                onChange={(e) => setEditData({ ...editData, owner: e.target.value })}
                placeholder="Owner"
                className="text-sm"
              />
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300">{term.owner || '-'}</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Steward</h3>
            {isEditing ? (
              <Input
                value={editData.steward || ''}
                onChange={(e) => setEditData({ ...editData, steward: e.target.value })}
                placeholder="Steward"
                className="text-sm"
              />
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300">{term.steward || '-'}</p>
            )}
          </div>
        </div>

        {/* Status Actions */}
        {!isEditing && term.status !== 'approved' && (
          <div className="mb-4">
            <Button
              size="sm"
              className="w-full"
              onClick={() => onUpdate(term.id, { status: 'approved' })}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve Term
            </Button>
          </div>
        )}

        {/* Edit Actions */}
        {isEditing && (
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        )}

        {/* Delete */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onDelete(term.id)}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete Term
          </button>
        </div>
      </Card>
    </div>
  );
}

function CreateTermModal({
  domains,
  onClose,
  onCreate,
}: {
  domains: GlossaryDomain[];
  onClose: () => void;
  onCreate: (data: Partial<GlossaryTerm>) => void;
}) {
  const [name, setName] = useState('');
  const [definition, setDefinition] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [domainId, setDomainId] = useState('');
  const [examples, setExamples] = useState('');
  const [owner, setOwner] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !definition.trim()) return;

    setIsSubmitting(true);
    await onCreate({
      name: name.trim(),
      definition: definition.trim(),
      abbreviation: abbreviation.trim() || undefined,
      domain_id: domainId || undefined,
      examples: examples.trim() || undefined,
      owner: owner.trim() || undefined,
      status: 'draft',
    });
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Add Business Term
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Term Name *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Customer Lifetime Value"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Abbreviation
              </label>
              <Input
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value)}
                placeholder="e.g., LTV"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Definition *
            </label>
            <textarea
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="Provide a clear, business-friendly definition..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Domain
            </label>
            <Dropdown
              value={domainId}
              placeholder="Select domain"
              options={[
                { value: '', label: 'No domain' },
                ...domains.map(d => ({ value: d.id, label: d.name })),
              ]}
              onChange={setDomainId}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Examples
            </label>
            <textarea
              value={examples}
              onChange={(e) => setExamples(e.target.value)}
              placeholder="Provide usage examples to clarify the term..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Owner
            </label>
            <Input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Who owns this term?"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !definition.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Term
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
