'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, Button, cn } from '@amygdala/ui';
import {
  ChevronRight,
  Search,
  Bell,
  HelpCircle,
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
} from 'lucide-react';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = '';
  for (const path of paths) {
    currentPath += `/${path}`;
    const name = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
    breadcrumbs.push({ name, href: currentPath });
  }

  return breadcrumbs;
}

interface HeaderProps {
  title?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function Header({ title, icon, actions }: HeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left side - Breadcrumbs and Title */}
        <div className="flex items-center gap-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.href}>
                {idx > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
                {idx === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-gray-900 dark:text-white">{crumb.name}</span>
                ) : (
                  <Link
                    href={crumb.href || '#'}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    {crumb.name}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Page Title with Icon */}
          {title && (
            <>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <div className="flex items-center gap-2">
                {icon && <span className="text-gray-500 dark:text-gray-400">{icon}</span>}
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
              </div>
            </>
          )}
        </div>

        {/* Right side - Actions and User */}
        <div className="flex items-center gap-3">
          {/* Search button */}
          <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
            <Search className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* Help */}
          <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300">
            <HelpCircle className="h-5 w-5" />
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Custom actions */}
          {actions}

          {/* User menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Avatar initials="MZ" size="sm" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-gray-200 bg-white py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Martin Zahumensky</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">martin@amygdala.io</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </div>
                <div className="border-t border-gray-200 py-1 dark:border-gray-700">
                  <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50 dark:text-red-400 dark:hover:bg-gray-700">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
