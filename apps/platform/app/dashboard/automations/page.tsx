'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, Badge, Button, Input, Dropdown } from '@amygdala/ui';
import {
  Zap,
  Search,
  Plus,
  RefreshCw,
  Loader2,
  MoreVertical,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Webhook,
  MousePointer2,
  Database,
  Bot,
  History,
  ChevronRight,
  Trash2,
  Edit,
  Copy,
  Eye,
  Shield,
  X,
} from 'lucide-react';
import {
  Automation,
  AutomationTrigger,
  AutomationRun,
  AutomationAction,
} from '@amygdala/database';

interface AutomationWithStats extends Automation {
  run_stats: {
    total: number;
    success: number;
    failed: number;
    lastRun?: string;
  };
}

interface AutomationResponse {
  automations: AutomationWithStats[];
  total: number;
  summary: {
    enabled: number;
    disabled: number;
    triggerCounts: Record<string, number>;
  };
}

const triggerConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  scheduled: { icon: Clock, label: 'Scheduled', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  record_created: { icon: Plus, label: 'Record Created', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  record_updated: { icon: RefreshCw, label: 'Record Updated', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  record_matches: { icon: Database, label: 'Record Matches', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  agent_completed: { icon: Bot, label: 'Agent Completed', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  webhook: { icon: Webhook, label: 'Webhook', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
  manual: { icon: MousePointer2, label: 'Manual', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
};

function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

function getTriggerDescription(trigger: AutomationTrigger): string {
  switch (trigger.type) {
    case 'scheduled':
      const interval = trigger.interval;
      if (interval.type === 'days' && interval.at) {
        return `Daily at ${interval.at}`;
      }
      return `Every ${interval.value} ${interval.type}`;
    case 'record_created':
    case 'record_updated':
      return `When ${trigger.entityType} is ${trigger.type.replace('record_', '')}`;
    case 'record_matches':
      return `When ${trigger.entityType} matches conditions`;
    case 'agent_completed':
      return trigger.agentName ? `When ${trigger.agentName} completes` : 'When any agent completes';
    case 'webhook':
      return 'On webhook call';
    case 'manual':
      return trigger.buttonLabel || 'Manual trigger';
    default:
      return 'Unknown trigger';
  }
}

function getActionSummary(actions: AutomationAction[]): string {
  if (actions.length === 0) return 'No actions';
  if (actions.length === 1) {
    const action = actions[0];
    switch (action.type) {
      case 'create_record': return `Create ${action.entityType}`;
      case 'update_record': return 'Update record';
      case 'run_agent': return `Run ${action.agentName}`;
      case 'send_notification': return `Notify via ${action.channel}`;
      case 'generate_with_ai': return 'Generate with AI';
      case 'execute_webhook': return 'Call webhook';
      case 'check_ataccama_dq': return `Check DQ (${(action as { tables?: string[] }).tables?.length || 0} tables)`;
      default: return action.type;
    }
  }
  return `${actions.length} actions`;
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<AutomationWithStats[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<AutomationResponse['summary']>({ enabled: 0, disabled: 0, triggerCounts: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [enabledFilter, setEnabledFilter] = useState('all');
  const [triggerFilter, setTriggerFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<AutomationWithStats | null>(null);
  const [showRunHistory, setShowRunHistory] = useState(false);
  const [isRunning, setIsRunning] = useState<string | null>(null);

  const fetchAutomations = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (enabledFilter !== 'all') params.set('enabled', enabledFilter);
      if (triggerFilter !== 'all') params.set('trigger_type', triggerFilter);

      const res = await fetch(`/api/automations?${params.toString()}`);
      const data: AutomationResponse = await res.json();
      setAutomations(data.automations || []);
      setTotal(data.total || 0);
      setSummary(data.summary || { enabled: 0, disabled: 0, triggerCounts: {} });
    } catch (error) {
      console.error('Failed to fetch automations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, [enabledFilter, triggerFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAutomations();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleToggle = async (automation: AutomationWithStats) => {
    try {
      const res = await fetch(`/api/automations/${automation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !automation.enabled }),
      });
      if (res.ok) {
        fetchAutomations();
      }
    } catch (error) {
      console.error('Failed to toggle automation:', error);
    }
  };

  const handleRunNow = async (automation: AutomationWithStats) => {
    try {
      setIsRunning(automation.id);
      const res = await fetch(`/api/automations/${automation.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const result = await res.json();
        // Show success message or update UI
        console.log('Automation run result:', result);
        fetchAutomations();
      }
    } catch (error) {
      console.error('Failed to run automation:', error);
    } finally {
      setIsRunning(null);
    }
  };

  const handleDelete = async (automation: AutomationWithStats) => {
    if (!confirm(`Are you sure you want to delete "${automation.name}"?`)) return;

    try {
      const res = await fetch(`/api/automations/${automation.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchAutomations();
      }
    } catch (error) {
      console.error('Failed to delete automation:', error);
    }
  };

  return (
    <>
      <Header
        title="Automations"
        icon={<Zap className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAutomations} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Automation
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Automations</p>
                  <p className="text-2xl font-bold">{total}</p>
                </div>
                <Zap className="h-8 w-8 text-primary-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                  <p className="text-2xl font-bold text-green-600">{summary.enabled}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Disabled</p>
                  <p className="text-2xl font-bold text-gray-500">{summary.disabled}</p>
                </div>
                <Pause className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled</p>
                  <p className="text-2xl font-bold text-blue-600">{summary.triggerCounts['scheduled'] || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search automations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dropdown
            placeholder="Status"
            value={enabledFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Disabled' },
            ]}
            onChange={setEnabledFilter}
          />
          <Dropdown
            placeholder="Trigger"
            value={triggerFilter}
            options={[
              { value: 'all', label: 'All Triggers' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'record_created', label: 'Record Created' },
              { value: 'record_updated', label: 'Record Updated' },
              { value: 'record_matches', label: 'Record Matches' },
              { value: 'agent_completed', label: 'Agent Completed' },
              { value: 'webhook', label: 'Webhook' },
              { value: 'manual', label: 'Manual' },
            ]}
            onChange={setTriggerFilter}
          />
        </div>

        {/* Automations List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : automations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No automations yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Create your first automation to automate data governance tasks
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Automation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {automations.map((automation) => {
              const trigger = triggerConfig[automation.trigger.type] || triggerConfig.manual;
              const TriggerIcon = trigger.icon;

              return (
                <Card key={automation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Status & Info */}
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={() => handleToggle(automation)}
                          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                            automation.enabled
                              ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                          }`}
                        >
                          {automation.enabled ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Pause className="h-5 w-5" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {automation.name}
                            </h3>
                            <Badge className={trigger.color}>
                              <TriggerIcon className="h-3 w-3 mr-1" />
                              {trigger.label}
                            </Badge>
                          </div>

                          {automation.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                              {automation.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{getTriggerDescription(automation.trigger)}</span>
                            <span>•</span>
                            <span>{getActionSummary(automation.actions)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Stats & Actions */}
                      <div className="flex items-center gap-4">
                        {/* Run Stats */}
                        <div className="hidden sm:flex items-center gap-3 text-sm">
                          {automation.run_stats.total > 0 ? (
                            <>
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-3 w-3" />
                                {automation.run_stats.success}
                              </span>
                              {automation.run_stats.failed > 0 && (
                                <span className="flex items-center gap-1 text-red-600">
                                  <XCircle className="h-3 w-3" />
                                  {automation.run_stats.failed}
                                </span>
                              )}
                              <span className="text-gray-400">
                                {automation.run_stats.lastRun && formatRelativeTime(automation.run_stats.lastRun)}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-400">No runs yet</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRunNow(automation)}
                            disabled={isRunning === automation.id || !automation.enabled}
                            title="Run now"
                          >
                            {isRunning === automation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAutomation(automation);
                              setShowRunHistory(true);
                            }}
                            title="View history"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <ActionMenu
                            automation={automation}
                            onEdit={() => console.log('Edit', automation.id)}
                            onDuplicate={() => console.log('Duplicate', automation.id)}
                            onViewDetails={() => setSelectedAutomation(automation)}
                            onDelete={() => handleDelete(automation)}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Automation Modal */}
      {showCreateModal && (
        <AutomationBuilderModal
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            fetchAutomations();
          }}
        />
      )}

      {/* Run History Drawer */}
      {showRunHistory && selectedAutomation && (
        <RunHistoryDrawer
          automation={selectedAutomation}
          onClose={() => {
            setShowRunHistory(false);
            setSelectedAutomation(null);
          }}
        />
      )}
    </>
  );
}

// ============================================
// Action Menu Component
// ============================================

interface ActionMenuProps {
  automation: AutomationWithStats;
  onEdit: () => void;
  onDuplicate: () => void;
  onViewDetails: () => void;
  onDelete: () => void;
}

function ActionMenu({ automation, onEdit, onDuplicate, onViewDetails, onDelete }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
        <MoreVertical className="h-4 w-4" />
      </Button>
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={() => { onEdit(); setIsOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => { onDuplicate(); setIsOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </button>
          <button
            onClick={() => { onViewDetails(); setIsOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Eye className="h-4 w-4" />
            View Details
          </button>
          <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
          <button
            onClick={() => { onDelete(); setIsOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Automation Builder Modal
// ============================================

interface AutomationBuilderModalProps {
  automation?: AutomationWithStats;
  onClose: () => void;
  onSave: () => void;
}

function AutomationBuilderModal({ automation, onClose, onSave }: AutomationBuilderModalProps) {
  const [name, setName] = useState(automation?.name || '');
  const [description, setDescription] = useState(automation?.description || '');
  const [triggerType, setTriggerType] = useState(automation?.trigger.type || 'scheduled');
  const [entityType, setEntityType] = useState('asset');
  const [scheduleInterval, setScheduleInterval] = useState('days');
  const [scheduleValue, setScheduleValue] = useState('1');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [actionType, setActionType] = useState('create_record');
  const [isSaving, setIsSaving] = useState(false);

  // Ataccama DQ action config
  const [dqTables, setDqTables] = useState<string[]>(['BANK_TRANSACTIONS', 'CUSTOMER_360']);
  const [dqTableInput, setDqTableInput] = useState('');
  const [dqFailureThreshold, setDqFailureThreshold] = useState('70');
  const [dqCreateIssue, setDqCreateIssue] = useState(true);
  const [notifyChannel, setNotifyChannel] = useState<'email' | 'webhook'>('email');
  const [notifyRecipients, setNotifyRecipients] = useState('data-team@company.com');

  // Run agent action config
  const [agentName, setAgentName] = useState<string>('spotter');

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Build trigger
      let trigger: AutomationTrigger;
      switch (triggerType) {
        case 'scheduled':
          trigger = {
            type: 'scheduled',
            interval: {
              type: scheduleInterval as 'minutes' | 'hours' | 'days',
              value: parseInt(scheduleValue),
              at: scheduleInterval === 'days' ? scheduleTime : undefined,
            },
          };
          break;
        case 'record_created':
          trigger = {
            type: 'record_created',
            entityType: entityType as 'asset' | 'issue',
          };
          break;
        case 'record_updated':
          trigger = {
            type: 'record_updated',
            entityType: entityType as 'asset' | 'issue',
          };
          break;
        default:
          trigger = { type: 'manual', buttonLabel: 'Run', showOn: ['automation_list'] };
      }

      // Build action based on selection
      const actions: AutomationAction[] = [];
      switch (actionType) {
        case 'create_record':
          actions.push({
            type: 'create_record',
            entityType: 'issue',
            data: {
              title: 'Automation created issue for {{record.name}}',
              description: 'Created by automation: ' + name,
              severity: 'medium',
              issue_type: 'governance',
            },
          });
          break;
        case 'run_agent':
          actions.push({
            type: 'run_agent',
            agentName: agentName as 'spotter' | 'debugger' | 'quality' | 'documentarist' | 'trust' | 'transformation' | 'analyst',
          });
          break;
        case 'send_notification':
          actions.push({
            type: 'send_notification',
            channel: notifyChannel,
            ...(notifyChannel === 'email'
              ? { recipients: notifyRecipients.split(',').map(r => r.trim()) }
              : { webhookUrl: '{{env.SLACK_WEBHOOK_URL}}' }
            ),
            template: {
              subject: notifyChannel === 'email' ? `Automation Alert: ${name}` : undefined,
              body: 'Automation "{{automation.name}}" triggered',
            },
          });
          break;
        case 'check_ataccama_dq':
          // Add the DQ check action
          actions.push({
            type: 'check_ataccama_dq',
            tables: dqTables,
            thresholds: {
              excellent: 90,
              good: 75,
              fair: 60,
            },
            createIssueOnFailure: dqCreateIssue,
            failureThreshold: parseInt(dqFailureThreshold),
          } as AutomationAction);
          // Add notification action to send report
          actions.push({
            type: 'send_notification',
            channel: notifyChannel,
            ...(notifyChannel === 'email'
              ? { recipients: notifyRecipients.split(',').map(r => r.trim()) }
              : { webhookUrl: '{{env.SLACK_WEBHOOK_URL}}' }
            ),
            template: {
              subject: notifyChannel === 'email' ? `Data Quality Report - {{trigger.timestamp}}` : undefined,
              body: '{{previous_action.result.report}}',
            },
          });
          break;
      }

      const payload = {
        name,
        description,
        enabled: true,
        trigger,
        conditions: [],
        actions,
        created_by: 'user',
      };

      const url = automation ? `/api/automations/${automation.id}` : '/api/automations';
      const method = automation ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSave();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to save automation');
      }
    } catch (error) {
      console.error('Failed to save automation:', error);
      alert('Failed to save automation');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">
            {automation ? 'Edit Automation' : 'Create Automation'}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Name & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Daily Unowned Asset Check"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Finds assets without owners and creates issues"
              />
            </div>
          </div>

          {/* Trigger Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
              Trigger
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">When</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
                >
                  <option value="scheduled">On a schedule</option>
                  <option value="record_created">When record is created</option>
                  <option value="record_updated">When record is updated</option>
                  <option value="manual">Manual trigger</option>
                </select>
              </div>

              {triggerType === 'scheduled' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Every</label>
                    <Input
                      type="number"
                      min="1"
                      value={scheduleValue}
                      onChange={(e) => setScheduleValue(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Interval</label>
                    <select
                      value={scheduleInterval}
                      onChange={(e) => setScheduleInterval(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                  {scheduleInterval === 'days' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">At</label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {(triggerType === 'record_created' || triggerType === 'record_updated') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Entity Type</label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
                  >
                    <option value="asset">Asset</option>
                    <option value="issue">Issue</option>
                    <option value="data_product">Data Product</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Action Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
              Action
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Then</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
                >
                  <option value="create_record">Create an issue</option>
                  <option value="run_agent">Run an agent</option>
                  <option value="send_notification">Send notification</option>
                  <option value="check_ataccama_dq">Check Ataccama Data Quality</option>
                </select>
              </div>

              {/* Run agent config */}
              {actionType === 'run_agent' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Agent</label>
                  <select
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
                  >
                    <option value="spotter">Spotter (Anomaly Detection)</option>
                    <option value="debugger">Debugger (Root Cause Analysis)</option>
                    <option value="quality">Quality Agent (Rule Generation)</option>
                    <option value="documentarist">Documentarist (Documentation)</option>
                    <option value="trust">Trust Agent (Score Calculation)</option>
                    <option value="transformation">Transformation Agent</option>
                    <option value="analyst">Analyst (Ataccama MCP)</option>
                  </select>
                </div>
              )}

              {/* Send notification config */}
              {actionType === 'send_notification' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Channel</label>
                    <select
                      value={notifyChannel}
                      onChange={(e) => setNotifyChannel(e.target.value as 'email' | 'webhook')}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
                    >
                      <option value="email">Email</option>
                      <option value="webhook">Webhook (Slack)</option>
                    </select>
                  </div>
                  {notifyChannel === 'email' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Recipients (comma-separated)</label>
                      <Input
                        value={notifyRecipients}
                        onChange={(e) => setNotifyRecipients(e.target.value)}
                        placeholder="team@company.com, alerts@company.com"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Ataccama DQ check config */}
              {actionType === 'check_ataccama_dq' && (
                <div className="space-y-4 p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                  <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">Ataccama DQ Check Configuration</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Tables to Check</label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={dqTableInput}
                        onChange={(e) => setDqTableInput(e.target.value.toUpperCase())}
                        placeholder="TABLE_NAME"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && dqTableInput.trim()) {
                            e.preventDefault();
                            if (!dqTables.includes(dqTableInput.trim())) {
                              setDqTables([...dqTables, dqTableInput.trim()]);
                            }
                            setDqTableInput('');
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (dqTableInput.trim() && !dqTables.includes(dqTableInput.trim())) {
                            setDqTables([...dqTables, dqTableInput.trim()]);
                          }
                          setDqTableInput('');
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dqTables.map((table) => (
                        <span
                          key={table}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 rounded"
                        >
                          {table}
                          <button
                            type="button"
                            onClick={() => setDqTables(dqTables.filter(t => t !== table))}
                            className="hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Press Enter or click + to add tables. Common tables: BANK_TRANSACTIONS, CUSTOMER_360, TRANSACTIONS_GOLD
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Failure Threshold</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={dqFailureThreshold}
                        onChange={(e) => setDqFailureThreshold(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Create issue if DQ score below this %
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="dqCreateIssue"
                        checked={dqCreateIssue}
                        onChange={(e) => setDqCreateIssue(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="dqCreateIssue" className="text-sm">
                        Create issues for failures
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-cyan-200 dark:border-cyan-800 pt-4">
                    <label className="block text-sm font-medium mb-1">Send Report Via</label>
                    <select
                      value={notifyChannel}
                      onChange={(e) => setNotifyChannel(e.target.value as 'email' | 'webhook')}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
                    >
                      <option value="email">Email</option>
                      <option value="webhook">Webhook (Slack)</option>
                    </select>
                  </div>

                  {notifyChannel === 'email' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Recipients (comma-separated)</label>
                      <Input
                        value={notifyRecipients}
                        onChange={(e) => setNotifyRecipients(e.target.value)}
                        placeholder="data-team@company.com"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Saving...
              </>
            ) : (
              'Save Automation'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Run History Drawer
// ============================================

interface RunHistoryDrawerProps {
  automation: AutomationWithStats;
  onClose: () => void;
}

interface ActionResult {
  actionType: string;
  actionIndex: number;
  status: 'success' | 'failed' | 'skipped';
  result?: unknown;
  error?: string;
  duration_ms: number;
}

function RunHistoryDrawer({ automation, onClose }: RunHistoryDrawerProps) {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const res = await fetch(`/api/automations/${automation.id}/runs`);
        const data = await res.json();
        setRuns(data.runs || []);
      } catch (error) {
        console.error('Failed to fetch runs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRuns();
  }, [automation.id]);

  const toggleExpand = (runId: string) => {
    setExpandedRuns(prev => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  };

  const formatActionResult = (result: unknown): string => {
    if (!result) return 'No output';
    if (typeof result === 'string') return result;
    if (typeof result === 'object') {
      // Check for report field (DQ check output)
      const r = result as Record<string, unknown>;
      if (r.report) return String(r.report);
      // Check for notification result
      if (r.sent !== undefined) return `Notification ${r.sent ? 'sent' : 'not sent'} via ${r.channel || 'unknown'}`;
      // Check for issue creation
      if (r.created) return `Created ${r.entityType}: ${r.id}`;
      // Check for agent run
      if (r.ran) return `Ran ${r.agentName} (${r.success ? 'success' : 'failed'})`;
      // Default JSON
      return JSON.stringify(result, null, 2);
    }
    return String(result);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-gray-900 shadow-xl">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{automation.name} - Run History</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No runs yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => {
                const isExpanded = expandedRuns.has(run.id);
                const actions = (run.actions_executed || []) as ActionResult[];

                return (
                  <div
                    key={run.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    {/* Header - always visible */}
                    <button
                      onClick={() => toggleExpand(run.id)}
                      className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {run.status === 'success' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {run.status === 'failed' && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        {run.status === 'running' && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        )}
                        {run.status === 'skipped' && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="font-medium capitalize">{run.status}</span>
                        <span className="text-xs text-gray-500">
                          {actions.length > 0 && `• ${actions.length} action(s)`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {new Date(run.started_at).toLocaleString()}
                        </span>
                        <ChevronRight
                          className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
                        {/* Basic info */}
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-500">Trigger:</span>{' '}
                              <span className="font-medium">{run.trigger_type}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Duration:</span>{' '}
                              <span className="font-medium">
                                {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(2)}s` : '-'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Records:</span>{' '}
                              <span className="font-medium">{run.records_processed}</span>
                            </div>
                          </div>
                        </div>

                        {/* Error message */}
                        {run.error_message && (
                          <div className="mb-3 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">Error</p>
                            <p className="text-sm text-red-500">{run.error_message}</p>
                          </div>
                        )}

                        {/* Actions executed */}
                        {actions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                              Actions Executed
                            </p>
                            {actions.map((action, idx) => (
                              <div
                                key={idx}
                                className={`p-2 rounded border ${
                                  action.status === 'success'
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                    : action.status === 'failed'
                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                    : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium">
                                    {idx + 1}. {action.actionType.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {action.duration_ms}ms
                                  </span>
                                </div>

                                {/* Action output */}
                                {action.result && (
                                  <div className="mt-2">
                                    <p className="text-xs text-gray-500 mb-1">Output:</p>
                                    <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                                      {formatActionResult(action.result)}
                                    </pre>
                                  </div>
                                )}

                                {/* Action error */}
                                {action.error && (
                                  <p className="text-xs text-red-500 mt-1">
                                    Error: {action.error}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* No actions */}
                        {actions.length === 0 && !run.error_message && (
                          <p className="text-sm text-gray-500 italic">
                            No actions were executed
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
