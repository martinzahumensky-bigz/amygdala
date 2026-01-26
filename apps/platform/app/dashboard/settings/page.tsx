'use client';

import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@amygdala/ui';
import { Settings, User, Bell, Shield, Database } from 'lucide-react';

export default function SettingsPage() {
  return (
    <>
      <Header title="Settings" icon={<Settings className="h-5 w-5" />} />

      <main className="p-6 space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name
                </label>
                <Input defaultValue="Martin Zahumensky" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <Input defaultValue="martin@amygdala.io" type="email" />
              </div>
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive email alerts for new issues
                </p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Agent Alerts</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Get notified when agents detect anomalies
                </p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded" />
            </div>
          </CardContent>
        </Card>

        {/* Connection Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure connections to your data sources and warehouses.
            </p>
            <Button variant="outline" className="mt-4">
              Manage Connections
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
