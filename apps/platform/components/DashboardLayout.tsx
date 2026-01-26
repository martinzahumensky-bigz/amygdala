'use client';

import * as React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function DashboardLayout({ children, title, icon, actions }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="lg:pl-64">
        <Header title={title} icon={icon} actions={actions} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
