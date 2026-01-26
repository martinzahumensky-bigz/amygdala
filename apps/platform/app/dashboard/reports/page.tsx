'use client';

import { Header } from '@/components/Header';
import { Card, CardContent, Badge, Button } from '@amygdala/ui';
import { BarChart3, FileText, TrendingUp, Download, Eye } from 'lucide-react';
import Link from 'next/link';

const reports = [
  {
    id: 1,
    name: 'Daily Revenue Report',
    description: 'Aggregated revenue by branch and date',
    lastRun: '2 hours ago',
    status: 'healthy',
    trustScore: 94,
  },
  {
    id: 2,
    name: 'Branch Performance',
    description: 'Monthly performance metrics by branch',
    lastRun: '1 day ago',
    status: 'warning',
    trustScore: 78,
  },
  {
    id: 3,
    name: 'Customer Acquisition',
    description: 'New customer trends and demographics',
    lastRun: '3 hours ago',
    status: 'healthy',
    trustScore: 91,
  },
  {
    id: 4,
    name: 'Transaction Summary',
    description: 'Weekly transaction volume analysis',
    lastRun: '6 hours ago',
    status: 'critical',
    trustScore: 45,
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'healthy':
      return <Badge variant="success">Healthy</Badge>;
    case 'warning':
      return <Badge variant="warning">Warning</Badge>;
    case 'critical':
      return <Badge variant="danger">Critical</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default function ReportsPage() {
  return (
    <>
      <Header
        title="Reports"
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <Button size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            New Report
          </Button>
        }
      />

      <main className="p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.id} className="group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-primary-50 p-2 dark:bg-primary-900/30">
                    <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  {getStatusBadge(report.status)}
                </div>

                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">{report.name}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{report.description}</p>

                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Trust: {report.trustScore}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{report.lastRun}</span>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="mr-1.5 h-4 w-4" />
                    View
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
