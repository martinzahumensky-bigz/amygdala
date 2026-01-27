'use client';

import { Sidebar } from '@/components/Sidebar';
import { ChatProvider } from '@/contexts/ChatContext';
import { ChatDrawer } from '@/components/ChatDrawer';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar />
        <div className="lg:pl-64">{children}</div>
        <ChatDrawer />
      </div>
    </ChatProvider>
  );
}
