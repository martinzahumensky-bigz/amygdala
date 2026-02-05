'use client';

import { Header } from '@/components/Header';
import { Card, CardContent } from '@amygdala/ui';
import Link from 'next/link';
import {
  Brain,
  Bot,
  MessageSquare,
  Plug,
  Code,
  Zap,
  Shield,
  Sparkles,
  RefreshCw,
  Eye,
  Wrench,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react';

const pillars = [
  {
    title: 'Multi-Agent Architecture',
    description:
      'Specialized AI agents that excel at specific tasks - the Spotter detects anomalies, the Debugger investigates root causes, the Quality Agent generates rules, and more. These agents collaborate and can call upon each other.',
    detail:
      'When you ask Claude "merge these two tables", it knows to invoke Amygdala\'s Matching Agent - the specialist at entity resolution - and delivers results directly in your workflow.',
    icon: Bot,
    color: 'from-purple-500 to-purple-700',
    href: '/dashboard/agents',
    linkText: 'Explore Agents',
  },
  {
    title: 'AI as Your Interface',
    description:
      'Forget clicking through endless menus. Natural language becomes your primary interface to the entire data governance platform. Ask questions, trigger scans, investigate issues - all through conversation.',
    detail:
      'The AI orchestrator understands context, maintains conversation history, and coordinates multiple agents to fulfill complex requests without you needing to understand the underlying systems.',
    icon: MessageSquare,
    color: 'from-cyan-500 to-cyan-700',
    href: '/dashboard/chat',
    linkText: 'Start Chatting',
  },
  {
    title: 'MCP-First Integration',
    description:
      'Model Context Protocol (MCP) enables Amygdala to serve autonomous AI agents across your organization. Any AI assistant can programmatically access data quality metrics, catalog information, and governance capabilities.',
    detail:
      'Your data scientists\' AI copilots can query trust scores. Your analysts\' assistants can check quality rules. MCP unlocks true autonomous data operations across all tools and teams.',
    icon: Plug,
    color: 'from-green-500 to-green-700',
    href: '/dashboard/analyst',
    linkText: 'Explore Analyst Agent',
  },
  {
    title: 'Dynamic Code Generation',
    description:
      'No more drag-and-drop transformation builders. AI generates Python or PySpark code based on your business requirements, iterates until accuracy thresholds are met, then executes in ephemeral sandbox environments.',
    detail:
      'Describe complex matching logic, deduplication rules, or data repairs in plain language. The agent generates code, tests on samples, refines based on results, and only executes the final version after approval.',
    icon: Code,
    color: 'from-pink-500 to-pink-700',
    href: '/dashboard/transformations',
    linkText: 'View Transformations',
  },
  {
    title: 'Intelligent Automation Agents',
    description:
      'Traditional automation relies on predefined workflows that break when facing unexpected situations. Amygdala\'s automation agents can adapt to unpredictable, first-time-observed issues.',
    detail:
      'They don\'t just follow scripts - they understand context, make decisions, and take appropriate action. Reactive response to anomalies, contextual decision-making, and self-improving behavior.',
    icon: Zap,
    color: 'from-yellow-500 to-orange-600',
    href: '/dashboard/automations',
    linkText: 'Configure Automations',
  },
];

export default function AboutPage() {
  return (
    <>
      <Header title="What is Amygdala?" icon={<Info className="h-5 w-5" />} />

      <main className="p-6 space-y-8 max-w-5xl mx-auto">
        {/* Brain Analogy Section */}
        <Card className="overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary-500 to-accent-500" />
          <CardContent className="p-6 lg:p-8">
            <div className="grid gap-8 lg:grid-cols-2 items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-accent-100 dark:bg-accent-900/30 px-4 py-2 text-sm text-accent-700 dark:text-accent-400 mb-4">
                  <Brain className="h-4 w-4" />
                  Why "Amygdala"?
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Your Data's Threat Detection System
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  The amygdala is the part of the brain responsible for detecting threats and
                  triggering autonomous responses - all without conscious thought. It processes
                  danger signals and initiates protective actions in milliseconds.
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  Just like its biological namesake,{' '}
                  <span className="text-gray-900 dark:text-white font-medium">Amygdala</span>{' '}
                  continuously monitors your data ecosystem for anomalies, quality issues, and
                  trust-eroding problems. When a threat is detected, autonomous AI agents spring
                  into action - investigating root causes, generating fixes, and restoring trust
                  without manual intervention.
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <div className="flex -space-x-2">
                    <div className="h-10 w-10 rounded-full bg-cyan-500 flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                      <Eye className="h-5 w-5 text-white" />
                    </div>
                    <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                      <Wrench className="h-5 w-5 text-white" />
                    </div>
                    <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Autonomous agents working 24/7
                  </span>
                </div>
              </div>

              {/* Threat Detection Flow */}
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">
                        Threat Detected
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-500">
                        Missing values in revenue report increased by 47%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-gray-400 text-sm pl-4">
                    <div className="h-8 border-l-2 border-dashed border-gray-300 dark:border-gray-600" />
                  </div>

                  <div className="flex items-center gap-3 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 p-4">
                    <Eye className="h-5 w-5 text-cyan-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-cyan-700 dark:text-cyan-400">
                        Spotter Agent Activated
                      </p>
                      <p className="text-xs text-cyan-600 dark:text-cyan-500">
                        Tracing lineage to identify source of null values
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-gray-400 text-sm pl-4">
                    <div className="h-8 border-l-2 border-dashed border-gray-300 dark:border-gray-600" />
                  </div>

                  <div className="flex items-center gap-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">
                        Issue Resolved
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-500">
                        Root cause identified: upstream ETL job failure
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Five Pillars */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Next-Generation Data Trust
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Five pillars that define how Amygdala transforms data governance from reactive workflows
            to proactive, autonomous intelligence.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <Link key={pillar.title} href={pillar.href} className="group">
                  <Card className="h-full transition-all hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div
                          className={`rounded-xl bg-gradient-to-br ${pillar.color} p-3 flex-shrink-0`}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {pillar.title}
                          </h3>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {pillar.description}
                          </p>
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                            {pillar.detail}
                          </p>
                          <div className="mt-3 flex items-center gap-1 text-primary-600 dark:text-primary-400 text-sm font-medium">
                            {pillar.linkText}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Automation Features */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 p-3">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Beyond Traditional Workflows
                </h3>
                <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                  Intelligent Automation
                </span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
                <Shield className="h-5 w-5 text-yellow-500 mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Reactive Response
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Responds to anomalies as they occur, not just scheduled checks
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
                <Sparkles className="h-5 w-5 text-yellow-500 mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Contextual Decisions
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Understands business impact and prioritizes accordingly
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
                <RefreshCw className="h-5 w-5 text-yellow-500 mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">Self-Improving</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Learns from resolved issues to prevent future occurrences
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tagline */}
        <div className="text-center py-8">
          <p className="text-lg text-gray-500 dark:text-gray-400 italic">
            "Trust your data through autonomous AI agents"
          </p>
        </div>
      </main>
    </>
  );
}
