'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  CheckSquare,
  CheckCheck,
  AlignLeft,
  Plus,
  Star,
  Clock,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'

interface Task {
  id: string
  title: string
  status: string
  pageId: string
}

interface StatsData {
  totalPages: number
  totalTasks: number
  completedTasks: number
  wordsWritten: number
}

function getGreeting(name: string): string {
  const hour = new Date().getHours()
  let period = 'evening'
  if (hour >= 5 && hour < 12) period = 'morning'
  else if (hour >= 12 && hour < 17) period = 'afternoon'
  return `Good ${period}, ${name}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatFullDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export function DashboardView() {
  const { user, pages, currentWorkspace, addPage, setCurrentPage, addToast } = useAppStore()
  const [stats, setStats] = useState<StatsData>({
    totalPages: 0,
    totalTasks: 0,
    completedTasks: 0,
    wordsWritten: 0,
  })
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const fetchStats = useCallback(async () => {
    if (!currentWorkspace) return
    try {
      setLoading(true)

      // Fetch pages
      const pagesRes = await fetch(`/api/pages?workspaceId=${currentWorkspace.id}`)
      if (!pagesRes.ok) return
      const pagesData = await pagesRes.json()
      const fetchedPages: typeof pages = pagesData.pages ?? []

      // Fetch tasks for all pages in parallel
      const taskResults = await Promise.allSettled(
        fetchedPages.map((p) =>
          fetch(`/api/tasks?pageId=${p.id}`).then((r) => (r.ok ? r.json() : { tasks: [] }))
        )
      )

      let totalTasks = 0
      let completedTasks = 0
      for (const result of taskResults) {
        if (result.status === 'fulfilled') {
          const tasks: Task[] = result.value?.tasks ?? []
          totalTasks += tasks.length
          completedTasks += tasks.filter((t) => t.status === 'done').length
        }
      }

      // Fetch word count stats
      let wordsWritten = 0
      const statsRes = await fetch(`/api/pages/stats?workspaceId=${currentWorkspace.id}`)
      if (statsRes.ok) {
        const statsMap: Record<string, number> = await statsRes.json()
        wordsWritten = Object.values(statsMap).reduce((a, b) => a + b, 0)
      }

      setStats({
        totalPages: fetchedPages.length,
        totalTasks,
        completedTasks,
        wordsWritten,
      })
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleCreatePage = async () => {
    if (!currentWorkspace || creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          title: 'Untitled',
          icon: '📄',
          type: 'note',
        }),
      })
      if (!res.ok) throw new Error('Failed to create page')
      const data = await res.json()
      addPage(data.page)
      setCurrentPage(data.page)
    } catch {
      addToast({ title: 'Error', message: 'Could not create page', variant: 'error' })
    } finally {
      setCreating(false)
    }
  }

  const recentPages = [...pages]
    .filter((p) => !p.isArchived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)

  const favoritePages = pages.filter((p) => p.isFavorite && !p.isArchived)

  const statCards = [
    {
      label: 'Total Pages',
      value: stats.totalPages,
      icon: FileText,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Total Tasks',
      value: stats.totalTasks,
      icon: CheckSquare,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'Completed',
      value: stats.completedTasks,
      icon: CheckCheck,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Words Written',
      value: stats.wordsWritten.toLocaleString(),
      icon: AlignLeft,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
  ]

  if (!user) return null

  return (
    <motion.div
      className="flex flex-col gap-8 px-6 py-10 max-w-5xl mx-auto w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{getGreeting(user.name)}</h1>
        <p className="text-muted-foreground text-sm">{formatFullDate()}</p>
      </motion.div>

      {/* Stats bar */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border bg-card p-4 flex items-center gap-3 shadow-sm"
          >
            <div className={`rounded-lg p-2 ${card.bg}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-lg font-semibold leading-tight">
                {loading ? '—' : card.value}
              </p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Recent Pages */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Recent Pages</h2>
          </div>
          <Button size="sm" onClick={handleCreatePage} disabled={creating}>
            <Plus className="h-4 w-4 mr-1" />
            New Page
          </Button>
        </div>

        {recentPages.length === 0 ? (
          <EmptyState onCreatePage={handleCreatePage} creating={creating} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentPages.map((page) => (
              <motion.button
                key={page.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentPage(page)}
                className="rounded-xl border bg-card p-4 text-left shadow-sm hover:border-primary/40 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5">{page.icon || '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate group-hover:text-primary transition-colors">
                      {page.title || 'Untitled'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(page.updatedAt)}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Favorite Pages */}
      {favoritePages.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            <h2 className="text-base font-semibold">Favorites</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {favoritePages.map((page) => (
              <motion.button
                key={page.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setCurrentPage(page)}
                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:border-amber-400/60 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-colors"
              >
                <span>{page.icon || '⭐'}</span>
                <span className="font-medium">{page.title || 'Untitled'}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

function EmptyState({
  onCreatePage,
  creating,
}: {
  onCreatePage: () => void
  creating: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 py-16 px-6 text-center gap-4"
    >
      <div className="relative">
        <BookOpen className="h-16 w-16 text-muted-foreground/40" strokeWidth={1} />
        <div className="absolute -top-1 -right-1 rounded-full bg-primary/10 p-1">
          <Plus className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-lg">No pages yet</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Create your first page to start writing, planning, and organizing your ideas.
        </p>
      </div>
      <Button onClick={onCreatePage} disabled={creating} size="lg">
        <Plus className="h-4 w-4 mr-2" />
        Create your first page
      </Button>
    </motion.div>
  )
}
