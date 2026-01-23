import Link from 'next/link';
import {
  BookOpen,
  Eye,
  Wrench,
  CheckCircle,
  RefreshCw,
  Star,
  ArrowRight,
  Database,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

const agents = [
  {
    name: 'Documentarist',
    description: 'Catalogs assets by tracing from reports to sources',
    icon: BookOpen,
    color: 'bg-purple-500',
  },
  {
    name: 'Spotter',
    description: 'Detects anomalies that would make users distrust data',
    icon: Eye,
    color: 'bg-cyan-500',
  },
  {
    name: 'Debugger',
    description: 'Investigates issues and finds root causes',
    icon: Wrench,
    color: 'bg-orange-500',
  },
  {
    name: 'Quality Agent',
    description: 'Generates and enforces contextual quality rules',
    icon: CheckCircle,
    color: 'bg-green-500',
  },
  {
    name: 'Transformation Agent',
    description: 'Repairs data and creates derived assets',
    icon: RefreshCw,
    color: 'bg-pink-500',
  },
  {
    name: 'Trust Agent',
    description: 'Calculates holistic trust scores',
    icon: Star,
    color: 'bg-yellow-500',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-accent-900">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-400 to-accent-500" />
              <span className="text-xl font-bold text-white">Amygdala</span>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Agentic Data Trust
            <span className="block bg-gradient-to-r from-primary-300 to-accent-400 bg-clip-text text-transparent">
              Platform
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
            Build trust in your data through autonomous AI agents that detect anomalies,
            debug issues, and validate quality - starting from the reports users actually see.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-900 shadow-lg transition hover:bg-gray-100"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/martinzahumensky-bigz/amygdala"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
            <Database className="h-8 w-8 text-primary-400" />
            <h3 className="mt-4 font-semibold text-white">Top-Down Discovery</h3>
            <p className="mt-2 text-sm text-gray-400">
              Start from reports and trace lineage back to source tables
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
            <AlertTriangle className="h-8 w-8 text-accent-400" />
            <h3 className="mt-4 font-semibold text-white">Anomaly Detection</h3>
            <p className="mt-2 text-sm text-gray-400">
              Spot the issues that make users say "I don't trust this data"
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-6 backdrop-blur-sm">
            <TrendingUp className="h-8 w-8 text-green-400" />
            <h3 className="mt-4 font-semibold text-white">Trust Scores</h3>
            <p className="mt-2 text-sm text-gray-400">
              Holistic ratings that consider the entire data supply chain
            </p>
          </div>
        </div>
      </section>

      {/* Agents Grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">
          6 Autonomous Agents
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="group rounded-xl bg-white/5 p-6 backdrop-blur-sm transition hover:bg-white/10"
            >
              <div className={`inline-flex rounded-lg ${agent.color} p-3`}>
                <agent.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-4 font-semibold text-white">{agent.name}</h3>
              <p className="mt-2 text-sm text-gray-400">{agent.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500 sm:px-6 lg:px-8">
          Built with Claude by Anthropic
        </div>
      </footer>
    </div>
  );
}
