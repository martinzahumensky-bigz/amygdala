import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Amygdala - Agentic Data Trust Platform',
  description: 'Next-generation platform for building trust in your data through autonomous AI agents',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  );
}
