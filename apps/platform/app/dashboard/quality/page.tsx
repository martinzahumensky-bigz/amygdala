'use client';

import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, QualityBar, Badge } from '@amygdala/ui';
import { CheckCircle2, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';

const qualityMetrics = [
  { name: 'Overall DQ Score', value: 87, trend: '+3%', status: 'good' },
  { name: 'Completeness', value: 94, trend: '+1%', status: 'good' },
  { name: 'Validity', value: 82, trend: '-2%', status: 'warning' },
  { name: 'Consistency', value: 91, trend: '+5%', status: 'good' },
];

const recentRules = [
  { name: 'Email Format Validation', asset: 'CRM_CUSTOMERS', passed: 85, failed: 15 },
  { name: 'Phone Number Format', asset: 'CUSTOMER_PROFILE', passed: 90, failed: 10 },
  { name: 'Branch ID Reference', asset: 'SILVER_TRANSACTIONS', passed: 98, failed: 2 },
  { name: 'Currency Code Check', asset: 'SALES_ORDERS', passed: 100, failed: 0 },
];

export default function QualityPage() {
  return (
    <>
      <Header
        title="Data Quality"
        icon={<CheckCircle2 className="h-5 w-5" />}
      />

      <main className="p-6 space-y-6">
        {/* Quality Score Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {qualityMetrics.map((metric) => (
            <Card key={metric.name}>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{metric.name}</p>
                <div className="mt-2 flex items-end justify-between">
                  <QualityBar value={metric.value} size="md" />
                  <span
                    className={`text-sm font-medium ${
                      metric.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {metric.trend}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quality Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Rule Evaluations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRules.map((rule) => (
                <div
                  key={rule.name}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{rule.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{rule.asset}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-sm text-green-600">{rule.passed}% passed</span>
                    </div>
                    {rule.failed > 0 ? (
                      <Badge variant="warning">{rule.failed}% failed</Badge>
                    ) : (
                      <Badge variant="success">All passed</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
