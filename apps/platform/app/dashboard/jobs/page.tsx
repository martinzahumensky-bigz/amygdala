'use client';

import { Header } from '@/components/Header';
import { Card, CardContent, Badge, Button } from '@amygdala/ui';
import { PlayCircle, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const jobs = [
  {
    id: 1,
    name: 'Spotter - Full Scan',
    status: 'running',
    startTime: '10:45 AM',
    duration: '2m 34s',
    progress: 67,
  },
  {
    id: 2,
    name: 'Trust Score Calculation',
    status: 'scheduled',
    startTime: '12:00 PM',
    duration: '-',
    progress: 0,
  },
  {
    id: 3,
    name: 'Daily ETL Pipeline',
    status: 'completed',
    startTime: '6:00 AM',
    duration: '15m 22s',
    progress: 100,
  },
  {
    id: 4,
    name: 'Quality Rules Evaluation',
    status: 'failed',
    startTime: '8:30 AM',
    duration: '3m 45s',
    progress: 45,
    error: 'Connection timeout to source database',
  },
];

function getStatusIcon(status: string) {
  switch (status) {
    case 'running':
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
    case 'scheduled':
      return <Clock className="h-4 w-4 text-gray-400" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'running':
      return <Badge variant="info">Running</Badge>;
    case 'scheduled':
      return <Badge>Scheduled</Badge>;
    case 'completed':
      return <Badge variant="success">Completed</Badge>;
    case 'failed':
      return <Badge variant="danger">Failed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default function JobsPage() {
  return (
    <>
      <Header
        title="Jobs"
        icon={<PlayCircle className="h-5 w-5" />}
        actions={
          <Button size="sm" className="gap-2">
            <PlayCircle className="h-4 w-4" />
            Run Job
          </Button>
        }
      />

      <main className="p-6 space-y-4">
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{job.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Started: {job.startTime} • Duration: {job.duration}
                    </p>
                    {job.error && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{job.error}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {job.status === 'running' && (
                    <div className="w-32">
                      <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{job.progress}%</p>
                    </div>
                  )}
                  {getStatusBadge(job.status)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </>
  );
}
