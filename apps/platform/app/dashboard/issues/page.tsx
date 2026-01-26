'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Card, Badge, Button, Avatar, Dropdown } from '@amygdala/ui';
import {
  AlertTriangle,
  Plus,
  MessageSquare,
  Calendar,
  Filter,
  ChevronDown,
  MoreVertical,
  Flag,
  List,
} from 'lucide-react';

interface Issue {
  id: number;
  title: string;
  category: string;
  categoryColor: string;
  date: string;
  description: string;
  comments: number;
  assignees: string[];
  priority?: 'high' | 'medium' | 'low';
  asset?: string;
  status: 'todo' | 'in_progress' | 'done';
}

const issues: Issue[] = [
  {
    id: 1,
    title: 'Missing values in CUSTOMER_EMAIL',
    category: 'Data Quality',
    categoryColor: 'border-purple-300 text-purple-700 bg-purple-50',
    date: 'Jan 26, 2026',
    description: '15% of customer email records contain null values. This affects downstream marketing campaigns...',
    comments: 5,
    assignees: ['MZ', 'JD'],
    priority: 'high',
    asset: 'CRM_CUSTOMERS',
    status: 'todo',
  },
  {
    id: 2,
    title: 'Unusual revenue spike detected',
    category: 'Anomaly',
    categoryColor: 'border-orange-300 text-orange-700 bg-orange-50',
    date: 'Jan 25, 2026',
    description: 'Daily revenue shows 340% increase on Jan 24. Investigating potential data quality issue...',
    comments: 12,
    assignees: ['AB'],
    priority: 'high',
    asset: 'GOLD_DAILY_REVENUE',
    status: 'in_progress',
  },
  {
    id: 3,
    title: 'Add branch validation rules',
    category: 'Enhancement',
    categoryColor: 'border-blue-300 text-blue-700 bg-blue-50',
    date: 'Jan 24, 2026',
    description: 'Create validation rules to ensure branch_id references exist in ref_branches table...',
    comments: 3,
    assignees: ['MZ'],
    status: 'in_progress',
  },
  {
    id: 4,
    title: 'Data freshness alert resolved',
    category: 'Alert',
    categoryColor: 'border-green-300 text-green-700 bg-green-50',
    date: 'Jan 23, 2026',
    description: 'SILVER_TRANSACTIONS table was stale for 4 hours. Root cause: ETL job timeout.',
    comments: 8,
    assignees: ['JD', 'MZ'],
    asset: 'SILVER_TRANSACTIONS',
    status: 'done',
  },
  {
    id: 5,
    title: 'Invalid phone formats',
    category: 'Data Quality',
    categoryColor: 'border-purple-300 text-purple-700 bg-purple-50',
    date: 'Jan 22, 2026',
    description: 'Phone number validation rule applied. 15% of records now flagged for manual review.',
    comments: 2,
    assignees: ['AB', 'JD'],
    asset: 'CUSTOMER_PROFILE',
    status: 'done',
  },
];

const columns = [
  { id: 'todo', title: 'To do', color: 'border-gray-300' },
  { id: 'in_progress', title: 'In progress', color: 'border-blue-400' },
  { id: 'done', title: 'Done', color: 'border-green-400' },
];

const filterTabs = [
  { id: 'all', label: 'All' },
  { id: 'author', label: 'Author' },
  { id: 'assignee', label: 'Assignee' },
];

function IssueCard({ issue }: { issue: Issue }) {
  return (
    <Card className="group cursor-pointer transition-shadow hover:shadow-md">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <h3 className="font-medium text-gray-900 dark:text-white">{issue.title}</h3>
          <button className="text-gray-400 opacity-0 transition group-hover:opacity-100 hover:text-gray-600">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${issue.categoryColor} dark:bg-opacity-20`}
          >
            {issue.category}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Calendar className="h-3 w-3" />
            {issue.date}
          </span>
          {issue.priority === 'high' && (
            <Flag className="h-4 w-4 text-red-500" />
          )}
        </div>

        <p className="mt-3 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
          {issue.description}
        </p>

        {issue.asset && (
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              <List className="h-3 w-3" />
              {issue.asset}
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs">{issue.comments}</span>
          </div>
          <div className="flex -space-x-2">
            {issue.assignees.map((initials, idx) => (
              <Avatar key={idx} initials={initials} size="sm" className="ring-2 ring-white dark:ring-gray-900" />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function IssuesPage() {
  const [activeTab, setActiveTab] = useState('all');

  const getIssuesByStatus = (status: string) => issues.filter((issue) => issue.status === status);

  return (
    <>
      <Header
        title="Issues"
        icon={<AlertTriangle className="h-5 w-5" />}
        actions={
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Issue
          </Button>
        }
      />

      <main className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Dropdown
              placeholder="Author"
              options={[
                { value: 'all', label: 'All Authors' },
                { value: 'mz', label: 'Martin Z.' },
                { value: 'jd', label: 'John D.' },
              ]}
            />
            <Dropdown
              placeholder="Due date"
              options={[
                { value: 'all', label: 'Any date' },
                { value: 'today', label: 'Due today' },
                { value: 'week', label: 'This week' },
              ]}
            />
            <Dropdown
              placeholder="Priority"
              options={[
                { value: 'all', label: 'All priorities' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
            />
          </div>

          <div className="flex rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {columns.map((column) => {
            const columnIssues = getIssuesByStatus(column.id);
            return (
              <div key={column.id}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full border-2 ${column.color}`} />
                    <h2 className="font-medium text-gray-900 dark:text-white">{column.title}</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{columnIssues.length}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {columnIssues.map((issue) => (
                    <IssueCard key={issue.id} issue={issue} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
