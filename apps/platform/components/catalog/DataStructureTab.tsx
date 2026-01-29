'use client';

import { useState } from 'react';
import { Card, CardContent, Badge, Button } from '@amygdala/ui';
import {
  ChevronDown,
  ChevronUp,
  Lock,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Tag,
  FileText,
  Hash,
  BarChart3,
} from 'lucide-react';
import { TagInput } from './InlineEdit';

// ========== TYPES ==========
interface QualityRule {
  id: string;
  name: string;
  rule_type: string;
  expression: string;
  severity: string;
  threshold: number;
  pass_rate?: number;
  last_executed?: string;
  is_active: boolean;
}

interface ColumnProfile {
  name: string;
  data_type: string;
  inferred_semantic_type?: string;
  null_count: number;
  null_percentage: number;
  distinct_count: number;
  distinct_percentage: number;
  min_value?: any;
  max_value?: any;
  mean_value?: number;
  top_values?: { value: string; count: number }[];
  description?: string;
  business_terms?: string[];
  classifications?: string[];
  highlights?: { type: string; message: string }[];
  quality_rules?: QualityRule[];
  is_sensitive?: boolean;
}

interface DataStructureTabProps {
  assetId: string;
  assetName: string;
  columnProfiles: ColumnProfile[];
  openChat: (ctx: any) => void;
  onColumnUpdate?: (columnName: string, updates: Partial<ColumnProfile>) => Promise<void>;
}

// ========== CONSTANTS ==========
const classificationColors: Record<string, string> = {
  PII: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200',
  PHI: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200',
  PCI: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200',
  Sensitive: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200',
  Confidential: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200',
  Internal: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200',
  Public: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200',
};

const classificationSuggestions = ['PII', 'PHI', 'PCI', 'Sensitive', 'Confidential', 'Internal', 'Public'];

// ========== COMPONENT ==========
export function DataStructureTab({
  assetId,
  assetName,
  columnProfiles,
  openChat,
  onColumnUpdate,
}: DataStructureTabProps) {
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string | null>(null);
  const [descriptionValue, setDescriptionValue] = useState('');

  if (!columnProfiles || columnProfiles.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Data Structure Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Run the Documentarist agent to discover columns and generate metadata.
          </p>
          <Button
            onClick={() =>
              openChat({
                type: 'asset',
                id: assetId,
                title: assetName,
                prefilledPrompt: `Profile the data asset "${assetName}" and generate column-level metadata including business terms and classifications.`,
                autoSend: true,
              })
            }
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Structure
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary stats
  const sensitiveCount = columnProfiles.filter((c) => c.is_sensitive || (c.classifications?.length || 0) > 0).length;
  const withRulesCount = columnProfiles.filter((c) => (c.quality_rules?.length || 0) > 0).length;
  const withTermsCount = columnProfiles.filter((c) => (c.business_terms?.length || 0) > 0).length;

  const handleSaveDescription = async (columnName: string) => {
    if (onColumnUpdate) {
      await onColumnUpdate(columnName, { description: descriptionValue });
    }
    setEditingDescription(null);
  };

  const handleSaveClassifications = async (columnName: string, classifications: string[]) => {
    if (onColumnUpdate) {
      await onColumnUpdate(columnName, { classifications });
    }
  };

  const handleSaveBusinessTerms = async (columnName: string, business_terms: string[]) => {
    if (onColumnUpdate) {
      await onColumnUpdate(columnName, { business_terms });
    }
  };

  const getColumnStatus = (col: ColumnProfile): 'green' | 'amber' | 'red' => {
    // Check quality rules
    const failingRules = (col.quality_rules || []).filter(
      (r) => r.pass_rate !== undefined && r.pass_rate < (r.threshold || 95)
    );
    if (failingRules.length > 0) return 'red';

    // Check null percentage
    if (col.null_percentage > 20) return 'red';
    if (col.null_percentage > 5) return 'amber';

    return 'green';
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Hash className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Columns</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {columnProfiles.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Lock className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Classified</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{sensitiveCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">With Rules</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{withRulesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Tag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">With Terms</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{withTermsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Column Structure Table */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-500" />
            Data Structure
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Column
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Business Terms
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Classifications
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Rules
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {columnProfiles.map((col) => {
                  const isExpanded = expandedColumn === col.name;
                  const status = getColumnStatus(col);
                  const rulesCount = col.quality_rules?.length || 0;

                  return (
                    <>
                      <tr
                        key={col.name}
                        className="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                        onClick={() => setExpandedColumn(isExpanded ? null : col.name)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                            {col.is_sensitive && <Lock className="h-3.5 w-3.5 text-red-500" />}
                            <span className="font-medium text-gray-900 dark:text-white">{col.name}</span>
                            {col.inferred_semantic_type && (
                              <Badge variant="outline" className="text-xs">
                                {col.inferred_semantic_type}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {col.data_type}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(col.business_terms || []).slice(0, 2).map((term) => (
                              <span
                                key={term}
                                className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 rounded"
                              >
                                {term}
                              </span>
                            ))}
                            {(col.business_terms?.length || 0) > 2 && (
                              <span className="text-xs text-gray-400">
                                +{col.business_terms!.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(col.classifications || []).map((cls) => (
                              <span
                                key={cls}
                                className={`px-2 py-0.5 text-xs font-medium rounded border ${
                                  classificationColors[cls] || classificationColors.Internal
                                }`}
                              >
                                {cls}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {rulesCount > 0 ? (
                            <Badge variant="outline" className="text-xs">
                              {rulesCount}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {status === 'green' ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          ) : status === 'amber' ? (
                            <AlertCircle className="h-4 w-4 text-yellow-500 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                          )}
                        </td>
                      </tr>

                      {/* Expanded Row */}
                      {isExpanded && (
                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                          <td colSpan={6} className="p-4">
                            <div className="grid gap-4 md:grid-cols-3">
                              {/* Description */}
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                  Description
                                </p>
                                {editingDescription === col.name ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={descriptionValue}
                                      onChange={(e) => setDescriptionValue(e.target.value)}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-800 dark:border-gray-600"
                                      rows={3}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleSaveDescription(col.name)}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingDescription(null)}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDescriptionValue(col.description || '');
                                      setEditingDescription(col.name);
                                    }}
                                  >
                                    {col.description || (
                                      <span className="text-gray-400 italic">
                                        Click to add description...
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Business Terms */}
                              <div onClick={(e) => e.stopPropagation()}>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                  Business Terms
                                </p>
                                <TagInput
                                  tags={col.business_terms || []}
                                  onSave={(terms) => handleSaveBusinessTerms(col.name, terms)}
                                  placeholder="Add term..."
                                  tagColors={{}}
                                />
                              </div>

                              {/* Classifications */}
                              <div onClick={(e) => e.stopPropagation()}>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                  Classifications
                                </p>
                                <TagInput
                                  tags={col.classifications || []}
                                  onSave={(cls) => handleSaveClassifications(col.name, cls)}
                                  suggestions={classificationSuggestions}
                                  placeholder="Add..."
                                  tagColors={classificationColors}
                                />
                              </div>
                            </div>

                            {/* Statistics & Quality Rules */}
                            <div className="grid gap-4 md:grid-cols-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              {/* Statistics */}
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                  Statistics
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-gray-500">Null %:</span>{' '}
                                    <span
                                      className={
                                        col.null_percentage > 20
                                          ? 'text-red-500 font-medium'
                                          : col.null_percentage > 5
                                          ? 'text-yellow-500'
                                          : 'text-green-500'
                                      }
                                    >
                                      {col.null_percentage.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Distinct:</span>{' '}
                                    {col.distinct_count.toLocaleString()}
                                  </div>
                                  {col.min_value !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Min:</span>{' '}
                                      {String(col.min_value).slice(0, 20)}
                                    </div>
                                  )}
                                  {col.max_value !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Max:</span>{' '}
                                      {String(col.max_value).slice(0, 20)}
                                    </div>
                                  )}
                                  {col.mean_value !== undefined && (
                                    <div>
                                      <span className="text-gray-500">Mean:</span>{' '}
                                      {col.mean_value.toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Quality Rules */}
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                  Quality Rules ({col.quality_rules?.length || 0})
                                </p>
                                {col.quality_rules && col.quality_rules.length > 0 ? (
                                  <div className="space-y-2">
                                    {col.quality_rules.map((rule) => {
                                      const passing =
                                        (rule.pass_rate || 0) >= (rule.threshold || 95);
                                      return (
                                        <div
                                          key={rule.id}
                                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
                                        >
                                          <div className="flex items-center gap-2">
                                            {passing ? (
                                              <CheckCircle className="h-4 w-4 text-green-500" />
                                            ) : (
                                              <XCircle className="h-4 w-4 text-red-500" />
                                            )}
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                              {rule.name}
                                            </span>
                                          </div>
                                          <span
                                            className={`text-sm font-medium ${
                                              passing ? 'text-green-500' : 'text-red-500'
                                            }`}
                                          >
                                            {(rule.pass_rate || 0).toFixed(1)}%
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openChat({
                                        type: 'asset',
                                        id: assetId,
                                        title: assetName,
                                        prefilledPrompt: `Generate quality rules for the column "${col.name}" in "${assetName}". Consider its data type (${col.data_type}) and semantic type (${col.inferred_semantic_type || 'unknown'}).`,
                                        autoSend: true,
                                      });
                                    }}
                                  >
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Generate Rules
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Highlights */}
                            {col.highlights && col.highlights.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                  Highlights
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {col.highlights.map((highlight, idx) => (
                                    <span
                                      key={idx}
                                      className={`px-2 py-1 text-xs rounded ${
                                        highlight.type === 'warning'
                                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                                          : highlight.type === 'error'
                                          ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                      }`}
                                    >
                                      {highlight.message}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
