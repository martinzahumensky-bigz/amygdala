import Link from 'next/link';
import {
  BarChart3,
  Users,
  Phone,
  FileText,
  Building2,
  AlertTriangle,
  Settings,
  ArrowRight
} from 'lucide-react';

const reports = [
  {
    name: 'Daily Revenue',
    description: 'Executive summary of daily banking revenue',
    href: '/reports/revenue',
    icon: BarChart3,
  },
  {
    name: 'Branch Performance',
    description: 'Compare branch-level performance metrics',
    href: '/reports/branch-performance',
    icon: Building2,
  },
  {
    name: 'Loan Portfolio',
    description: 'Overview of loan book health',
    href: '/reports/loan-portfolio',
    icon: FileText,
  },
];

const applications = [
  {
    name: 'Customer 360',
    description: 'Complete customer profile view',
    href: '/crm/customer-360',
    icon: Users,
  },
  {
    name: 'Call Center',
    description: 'Customer service agent interface',
    href: '/crm/call-center',
    icon: Phone,
  },
];

export default function MeridianHomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-primary-800">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">Meridian Bank</span>
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  SIMULATION
                </span>
              </div>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
              <Settings className="h-4 w-4" />
              Admin Panel
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-amber-300" />
            <div>
              <h1 className="text-2xl font-bold text-white">
                Simulated Banking Environment
              </h1>
              <p className="mt-1 text-primary-100">
                This is a demonstration environment for the Amygdala data trust platform.
                Data and reports are simulated with intentional quality issues.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Reports Section */}
        <section className="mb-12">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">Reports</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {reports.map((report) => (
              <Link
                key={report.name}
                href={report.href}
                className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-primary-300 hover:shadow-md"
              >
                <div className="inline-flex rounded-lg bg-primary-50 p-3 text-primary-600">
                  <report.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 group-hover:text-primary-600">
                  {report.name}
                </h3>
                <p className="mt-2 text-sm text-gray-500">{report.description}</p>
                <div className="mt-4 flex items-center text-sm font-medium text-primary-600">
                  View Report
                  <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Applications Section */}
        <section>
          <h2 className="mb-6 text-xl font-semibold text-gray-900">Applications</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {applications.map((app) => (
              <Link
                key={app.name}
                href={app.href}
                className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-primary-300 hover:shadow-md"
              >
                <div className="inline-flex rounded-lg bg-primary-50 p-3 text-primary-600">
                  <app.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 group-hover:text-primary-600">
                  {app.name}
                </h3>
                <p className="mt-2 text-sm text-gray-500">{app.description}</p>
                <div className="mt-4 flex items-center text-sm font-medium text-primary-600">
                  Open Application
                  <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Data Info */}
        <section className="mt-12 rounded-xl bg-gray-100 p-6">
          <h3 className="font-semibold text-gray-900">About This Simulation</h3>
          <div className="mt-4 grid gap-6 text-sm text-gray-600 sm:grid-cols-3">
            <div>
              <p className="font-medium text-gray-900">Data Warehouse Layers</p>
              <ul className="mt-2 space-y-1">
                <li>Landing Zone (raw files)</li>
                <li>Bronze (loaded data)</li>
                <li>Silver (cleaned data)</li>
                <li>Gold (aggregated)</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-900">Simulated Issues</p>
              <ul className="mt-2 space-y-1">
                <li>Missing data (pipeline failures)</li>
                <li>Format issues (phone, email)</li>
                <li>Reference data gaps</li>
                <li>Anomalies (spikes, drops)</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-900">Sample Data</p>
              <ul className="mt-2 space-y-1">
                <li>5,000 customers</li>
                <li>6 months of transactions</li>
                <li>20 branches</li>
                <li>Loan portfolio</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500 sm:px-6 lg:px-8">
          Meridian Bank is a fictional institution for demonstration purposes only.
        </div>
      </footer>
    </div>
  );
}
