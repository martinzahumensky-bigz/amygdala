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
  TrendingUp,
  Brain,
  Bot,
  MessageSquare,
  Plug,
  Code,
  Zap,
  Shield,
  Sparkles,
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

      {/* Why Amygdala? - Brain Analogy Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-r from-white/10 to-white/5 p-8 backdrop-blur-sm lg:p-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-accent-500/20 px-4 py-2 text-sm text-accent-300 mb-6">
                <Brain className="h-4 w-4" />
                Why "Amygdala"?
              </div>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Your Data's Threat Detection System
              </h2>
              <p className="mt-4 text-lg text-gray-300">
                The amygdala is the part of the brain responsible for detecting threats and triggering
                autonomous responses - all without conscious thought. It processes danger signals and
                initiates protective actions in milliseconds.
              </p>
              <p className="mt-4 text-gray-400">
                Just like its biological namesake, <span className="text-white font-medium">Amygdala</span> continuously
                monitors your data ecosystem for anomalies, quality issues, and trust-eroding problems. When a threat
                is detected, autonomous AI agents spring into action - investigating root causes, generating fixes,
                and restoring trust without manual intervention.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div className="flex -space-x-2">
                  <div className="h-10 w-10 rounded-full bg-cyan-500 flex items-center justify-center ring-2 ring-primary-900">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center ring-2 ring-primary-900">
                    <Wrench className="h-5 w-5 text-white" />
                  </div>
                  <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center ring-2 ring-primary-900">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                </div>
                <span className="text-sm text-gray-400">
                  Autonomous agents working 24/7
                </span>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-2xl blur-3xl" />
              <div className="relative rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                    <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-300">Threat Detected</p>
                      <p className="text-xs text-red-400/80">Missing values in revenue report increased by 47%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm pl-4">
                    <div className="h-8 border-l-2 border-dashed border-gray-600" />
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-4">
                    <Eye className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-cyan-300">Spotter Agent Activated</p>
                      <p className="text-xs text-cyan-400/80">Tracing lineage to identify source of null values</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm pl-4">
                    <div className="h-8 border-l-2 border-dashed border-gray-600" />
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-300">Issue Resolved</p>
                      <p className="text-xs text-green-400/80">Root cause identified: upstream ETL job failure</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Pillars Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Next-Generation Data Trust
          </h2>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            Five pillars that define how Amygdala transforms data governance from reactive workflows
            to proactive, autonomous intelligence.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pillar 1: Multi-Agent Architecture */}
          <Link href="/dashboard/agents" className="group">
            <div className="h-full rounded-2xl bg-white/5 border border-white/10 p-6 transition-all hover:bg-white/10 hover:border-white/20">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 p-3">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white group-hover:text-primary-300 transition-colors">
                    Multi-Agent Architecture
                  </h3>
                  <p className="mt-2 text-gray-400">
                    Specialized AI agents that excel at specific tasks - the Spotter detects anomalies,
                    the Debugger investigates root causes, the Quality Agent generates rules, and more.
                    These agents collaborate and can call upon each other.
                  </p>
                  <p className="mt-3 text-sm text-gray-500">
                    When you ask Claude "merge these two tables", it knows to invoke Amygdala's Matching Agent -
                    the specialist at entity resolution - and delivers results directly in your workflow.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-primary-400 text-sm font-medium">
                    Explore Agents
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Pillar 2: AI as Interface */}
          <Link href="/dashboard/chat" className="group">
            <div className="h-full rounded-2xl bg-white/5 border border-white/10 p-6 transition-all hover:bg-white/10 hover:border-white/20">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 p-3">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white group-hover:text-primary-300 transition-colors">
                    AI as Your Interface
                  </h3>
                  <p className="mt-2 text-gray-400">
                    Forget clicking through endless menus. Natural language becomes your primary interface
                    to the entire data governance platform. Ask questions, trigger scans, investigate issues -
                    all through conversation.
                  </p>
                  <p className="mt-3 text-sm text-gray-500">
                    The AI orchestrator understands context, maintains conversation history, and coordinates
                    multiple agents to fulfill complex requests without you needing to understand the underlying systems.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-primary-400 text-sm font-medium">
                    Start Chatting
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Pillar 3: MCP Integration */}
          <Link href="/dashboard/analyst" className="group">
            <div className="h-full rounded-2xl bg-white/5 border border-white/10 p-6 transition-all hover:bg-white/10 hover:border-white/20">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-gradient-to-br from-green-500 to-green-700 p-3">
                  <Plug className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white group-hover:text-primary-300 transition-colors">
                    MCP-First Integration
                  </h3>
                  <p className="mt-2 text-gray-400">
                    Model Context Protocol (MCP) enables Amygdala to serve autonomous AI agents across
                    your organization. Any AI assistant can programmatically access data quality metrics,
                    catalog information, and governance capabilities.
                  </p>
                  <p className="mt-3 text-sm text-gray-500">
                    Your data scientists' AI copilots can query trust scores. Your analysts' assistants can
                    check quality rules. MCP unlocks true autonomous data operations across all tools and teams.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-primary-400 text-sm font-medium">
                    Explore Analyst Agent
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Pillar 4: Generated Code on Ephemeral Instances */}
          <Link href="/dashboard/transformations" className="group">
            <div className="h-full rounded-2xl bg-white/5 border border-white/10 p-6 transition-all hover:bg-white/10 hover:border-white/20">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-gradient-to-br from-pink-500 to-pink-700 p-3">
                  <Code className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white group-hover:text-primary-300 transition-colors">
                    Dynamic Code Generation
                  </h3>
                  <p className="mt-2 text-gray-400">
                    No more drag-and-drop transformation builders. AI generates Python or PySpark code based on
                    your business requirements, iterates until accuracy thresholds are met, then executes in
                    ephemeral sandbox environments.
                  </p>
                  <p className="mt-3 text-sm text-gray-500">
                    Describe complex matching logic, deduplication rules, or data repairs in plain language.
                    The agent generates code, tests on samples, refines based on results, and only executes
                    the final version after approval - all with full audit trail.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-primary-400 text-sm font-medium">
                    View Transformations
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Pillar 5: Automation Agents */}
          <Link href="/dashboard/automations" className="group lg:col-span-2">
            <div className="h-full rounded-2xl bg-gradient-to-r from-white/5 to-white/10 border border-white/10 p-6 transition-all hover:from-white/10 hover:to-white/15 hover:border-white/20">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 p-3">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold text-white group-hover:text-primary-300 transition-colors">
                      Intelligent Automation Agents
                    </h3>
                    <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-300">
                      Beyond Workflows
                    </span>
                  </div>
                  <p className="mt-2 text-gray-400 max-w-3xl">
                    Traditional automation relies on predefined workflows that break when facing unexpected situations.
                    Amygdala's automation agents can adapt to unpredictable, first-time-observed issues. They don't just
                    follow scripts - they understand context, make decisions, and take appropriate action.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-white/5 p-3">
                      <Shield className="h-5 w-5 text-yellow-400 mb-2" />
                      <p className="text-sm font-medium text-white">Reactive Response</p>
                      <p className="text-xs text-gray-500">Responds to anomalies as they occur, not just scheduled checks</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3">
                      <Sparkles className="h-5 w-5 text-yellow-400 mb-2" />
                      <p className="text-sm font-medium text-white">Contextual Decisions</p>
                      <p className="text-xs text-gray-500">Understands business impact and prioritizes accordingly</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3">
                      <RefreshCw className="h-5 w-5 text-yellow-400 mb-2" />
                      <p className="text-sm font-medium text-white">Self-Improving</p>
                      <p className="text-xs text-gray-500">Learns from resolved issues to prevent future occurrences</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-primary-400 text-sm font-medium">
                    Configure Automations
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
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
