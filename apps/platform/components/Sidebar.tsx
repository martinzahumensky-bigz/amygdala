'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@amygdala/ui';
import {
  Home,
  Sparkles,
  Search,
  PlayCircle,
  Database,
  FileText,
  BookOpen,
  GitBranch,
  List,
  CheckCircle2,
  BarChart3,
  Settings,
  Bell,
  Star,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Shield,
  MessageSquare,
} from 'lucide-react';

interface NavItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    items: [
      { name: 'Home', href: '/dashboard', icon: Home },
      { name: 'Chat', href: '/dashboard/chat', icon: MessageSquare },
      { name: 'AI Agents', href: '/dashboard/agents', icon: Sparkles },
      { name: 'Jobs', href: '/dashboard/jobs', icon: PlayCircle },
      { name: 'Search', href: '/dashboard/search', icon: Search },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { name: 'Reference Data', href: '/dashboard/reference', icon: Database },
    ],
  },
  {
    title: 'Catalog',
    items: [
      {
        name: 'Data Catalog',
        icon: Database,
        children: [
          { name: 'All Assets', href: '/dashboard/catalog', icon: List },
          { name: 'Report Items', href: '/dashboard/catalog/reports', icon: FileText },
        ],
      },
      {
        name: 'Lineage',
        icon: GitBranch,
        children: [
          { name: 'Sources', href: '/dashboard/lineage/sources', icon: Database },
        ],
      },
      { name: 'Glossary', href: '/dashboard/glossary', icon: BookOpen },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { name: 'Trust Index', href: '/dashboard/trust-index', icon: Shield },
      { name: 'Data Quality', href: '/dashboard/quality', icon: CheckCircle2 },
      { name: 'Issues', href: '/dashboard/issues', icon: List },
      { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
    ],
  },
];

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.href && pathname === item.href;
  const isChildActive = item.children?.some((child) => child.href && pathname === child.href);

  React.useEffect(() => {
    if (isChildActive) setIsExpanded(true);
  }, [isChildActive]);

  const Icon = item.icon;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
            isChildActive && 'text-primary-700 dark:text-primary-400',
            depth > 0 && 'pl-9'
          )}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1 text-left">{item.name}</span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </button>
        {isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children?.map((child) => (
              <NavItemComponent key={child.name} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href || '#'}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
        depth > 0 && 'pl-9'
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span>{item.name}</span>
    </Link>
  );
}

export function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg bg-white p-2 shadow-md lg:hidden dark:bg-gray-800"
      >
        <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900',
          'transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500">
              <span className="text-sm font-bold text-white">A</span>
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">Amygdala</span>
          </Link>
          <div className="flex items-center gap-1">
            <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
              <Bell className="h-5 w-5" />
            </button>
            <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
              <Star className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {navigation.map((section, idx) => (
              <div key={idx}>
                {section.title && (
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavItemComponent key={item.name} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
