import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/shared/theme-provider'

export const metadata: Metadata = {
  title: 'NexusAI — AI-Powered Workspace',
  description:
    'A Notion-like productivity platform with deep AI integration. Notes, tasks, kanban, and real-time collaboration.',
  icons: { icon: '/logo.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
