'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useAppStore } from '@/store/app-store'
import { createTranslator } from '@/lib/i18n'
import AuthScreen from '@/components/auth/auth-screens'
import AppSidebar from '@/components/sidebar/app-sidebar'

// ─── Dynamic imports (avoid SSR issues for heavy editor components) ───────────
const BlockEditor = dynamic(() => import('@/components/editor/block-editor'), {
  loading: () => <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>,
  ssr: false,
})
const TaskListViewComponent = dynamic(() => import('@/components/tasks/task-list-view'), { ssr: false })
const KanbanBoardComponent = dynamic(() => import('@/components/kanban/kanban-board'), { ssr: false })

// ─── Stub only if real component unavailable ──────────────────────────────────

function DashboardView() {
  const { currentWorkspace, pages, setCurrentPage, recentPageIds } = useAppStore()
  const recentPages = recentPageIds
    .map((id) => pages.find((p) => p.id === id))
    .filter(Boolean) as typeof pages

  return (
    <div className="flex-1 overflow-y-auto p-10">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Greeting */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-1">
            {currentWorkspace?.name ?? 'NexusAI'}
          </h1>
          <p className="text-muted-foreground">
            Select a page from the sidebar or create a new one to get started.
          </p>
        </div>

        {/* Recent pages */}
        {recentPages.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Recently visited
            </h2>
            <div className="grid gap-1.5">
              {recentPages.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setCurrentPage(p)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left w-full group"
                >
                  <span className="text-lg">{p.icon || '📄'}</span>
                  <span className="text-sm font-medium flex-1 truncate">{p.title || 'Untitled'}</span>
                  <span className="text-xs text-muted-foreground capitalize opacity-0 group-hover:opacity-100 transition-opacity">
                    {p.type}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Favorites */}
        {pages.filter((p) => p.isFavorite && !p.isArchived).length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Favorites
            </h2>
            <div className="grid gap-1.5">
              {pages
                .filter((p) => p.isFavorite && !p.isArchived)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setCurrentPage(p)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left w-full"
                  >
                    <span className="text-lg">{p.icon || '⭐'}</span>
                    <span className="text-sm font-medium flex-1 truncate">{p.title || 'Untitled'}</span>
                    <span className="text-xs text-muted-foreground capitalize">{p.type}</span>
                  </button>
                ))}
            </div>
          </section>
        )}

        {/* All pages */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            All pages
          </h2>
          {pages.filter((p) => !p.isArchived).length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-5xl mb-4">✨</p>
              <p className="text-base font-medium mb-1">No pages yet</p>
              <p className="text-sm opacity-70">Create your first page using the sidebar.</p>
            </div>
          ) : (
            <div className="grid gap-1.5">
              {pages
                .filter((p) => !p.isArchived && !p.parentId)
                .sort((a, b) => a.order - b.order)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setCurrentPage(p)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left w-full group"
                  >
                    <span className="text-lg">{p.icon || '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.title || 'Untitled'}</p>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize opacity-0 group-hover:opacity-100 transition-opacity">
                      {p.type}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function BlockEditorView({ pageId }: { pageId: string }) {
  return <BlockEditor pageId={pageId} />
}

function TaskListView({ pageId }: { pageId: string }) {
  return <TaskListViewComponent pageId={pageId} />
}

function KanbanBoardView({ pageId }: { pageId: string }) {
  return <KanbanBoardComponent pageId={pageId} />
}

function AdminPanelView() {
  const { setShowAdmin } = useAppStore()
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Admin Panel</h1>
      <p className="text-muted-foreground text-sm">Admin panel — coming soon.</p>
      <button
        onClick={() => setShowAdmin(false)}
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
      >
        Back to workspace
      </button>
    </div>
  )
}

// ─── Toast Container ──────────────────────────────────────────────────────────
function ToastContainer() {
  const { toasts, removeToast } = useAppStore()

  const variantStyles: Record<string, string> = {
    default:
      'bg-popover border border-border text-foreground',
    success:
      'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    error:
      'bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300',
    warning:
      'bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-300',
  }

  return (
    <div className="fixed bottom-8 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className={`pointer-events-auto min-w-[280px] max-w-sm rounded-xl shadow-lg px-4 py-3 ${variantStyles[toast.variant ?? 'default']}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs mt-0.5 opacity-80 leading-snug">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 mt-0.5 opacity-60 hover:opacity-100 transition-opacity text-base leading-none"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── AI Panel Sidebar ─────────────────────────────────────────────────────────
function AIPanelView() {
  const { setShowAI } = useAppStore()
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">✨</span>
          <span className="font-semibold text-sm">AI Assistant</span>
        </div>
        <button
          onClick={() => setShowAI(false)}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          aria-label="Close AI panel"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl mb-4 shadow-lg">
          ✨
        </div>
        <p className="text-sm font-medium mb-1">AI features coming soon</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Summarise, draft, and ask questions about your pages.
        </p>
      </div>
    </div>
  )
}

// ─── Search / Command Palette Dialog ─────────────────────────────────────────
function SearchDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { pages, setCurrentPage, addRecentPage } = useAppStore()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim()
    ? pages.filter(
        (p) =>
          !p.isArchived &&
          (p.title.toLowerCase().includes(query.toLowerCase()) ||
            p.type.toLowerCase().includes(query.toLowerCase()))
      )
    : pages.filter((p) => !p.isArchived).slice(0, 8)

  const handleSelect = (page: (typeof pages)[number]) => {
    setCurrentPage(page)
    addRecentPage(page.id)
    onClose()
    setQuery('')
  }

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-xl bg-popover rounded-2xl shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <svg
            className="w-4 h-4 text-muted-foreground shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">No pages found.</p>
          ) : (
            <>
              <div className="px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {query.trim() ? 'Results' : 'Recent'}
                </span>
              </div>
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left"
                >
                  <span className="text-lg">{p.icon || '📄'}</span>
                  <span className="text-sm font-medium flex-1 truncate">
                    {p.title || 'Untitled'}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize opacity-60">
                    {p.type}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border/60 flex items-center gap-4 text-xs text-muted-foreground">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Status Bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  const { saveStatus, currentPage, user, zenMode } = useAppStore()

  if (zenMode) return null

  const statusLabel =
    saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'unsaved'
      ? 'Unsaved changes'
      : 'All changes saved'

  const statusDot =
    saveStatus === 'saving'
      ? 'bg-yellow-400'
      : saveStatus === 'unsaved'
      ? 'bg-red-400'
      : 'bg-emerald-400'

  return (
    <footer className="h-6 shrink-0 flex items-center justify-between px-4 text-xs text-muted-foreground border-t border-border/50 bg-background/90 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {currentPage && (
          <>
            <span>{currentPage.icon || '📄'}</span>
            <span className="truncate max-w-[200px]">{currentPage.title || 'Untitled'}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
          {statusLabel}
        </span>
        {user && <span className="hidden sm:block opacity-60">{user.email}</span>}
        <span className="opacity-40">NexusAI v0.2</span>
      </div>
    </footer>
  )
}

// ─── Zen Mode Exit Hint ───────────────────────────────────────────────────────
function ZenModeHint() {
  const { setZenMode } = useAppStore()
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
    >
      <button
        onClick={() => setZenMode(false)}
        className="px-4 py-2 rounded-full bg-popover/95 backdrop-blur border border-border text-xs text-muted-foreground hover:text-foreground transition-colors shadow-lg"
      >
        Press <kbd className="font-mono mx-0.5">Esc</kbd> to exit focus mode
      </button>
    </motion.div>
  )
}

// ─── Page Content Router ──────────────────────────────────────────────────────
function PageContent() {
  const { currentPage } = useAppStore()

  if (!currentPage) return <DashboardView />

  switch (currentPage.type) {
    case 'task':
      return <TaskListView pageId={currentPage.id} />
    case 'kanban':
      return <KanbanBoardView pageId={currentPage.id} />
    case 'note':
    default:
      return <BlockEditorView pageId={currentPage.id} />
  }
}

// ─── Workspace View ───────────────────────────────────────────────────────────
function WorkspaceView({
  onSearchOpen,
}: {
  onSearchOpen: () => void
}) {
  const { sidebarCollapsed, zenMode, showAI } = useAppStore()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {!zenMode && (
          <motion.div
            key="sidebar"
            initial={false}
            animate={{ width: sidebarCollapsed ? 60 : 240 }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="shrink-0 overflow-hidden border-r border-border/60"
          >
            <AppSidebar onSearch={onSearchOpen} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content + status bar */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PageContent />
        <StatusBar />
      </div>

      {/* AI panel */}
      <AnimatePresence>
        {showAI && !zenMode && (
          <motion.div
            key="ai-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="shrink-0 overflow-hidden border-l border-border/60"
          >
            <AIPanelView />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Root Page ────────────────────────────────────────────────────────────────
export default function Page() {
  const {
    user,
    showAdmin,
    setWorkspaces,
    setCurrentWorkspace,
    setPages,
    addToast,
    zenMode,
    setZenMode,
    language,
  } = useAppStore()

  const t = createTranslator(language)
  const [loading, setLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const bootstrappedRef = useRef(false)

  // ── Fetch workspaces & pages once after login ──────────────────────────────
  const bootstrap = useCallback(async () => {
    if (bootstrappedRef.current) return
    bootstrappedRef.current = true
    setLoading(true)

    try {
      const wsRes = await fetch('/api/workspaces')
      if (wsRes.ok) {
        const wsJson = await wsRes.json()
        const workspaces = wsJson.workspaces ?? wsJson ?? []
        setWorkspaces(workspaces)
        if (workspaces.length > 0) {
          setCurrentWorkspace(workspaces[0])

          const pgRes = await fetch(`/api/pages?workspaceId=${workspaces[0].id}`)
          if (pgRes.ok) {
            const pgJson = await pgRes.json()
            setPages(pgJson.pages ?? pgJson ?? [])
          }
        }
      }
    } catch {
      addToast({ title: t('common.error'), message: 'Failed to load workspace.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [setWorkspaces, setCurrentWorkspace, setPages, addToast, t])

  useEffect(() => {
    if (user) {
      bootstrap()
    } else {
      // Reset bootstrap flag on logout so next login re-fetches
      bootstrappedRef.current = false
    }
  }, [user, bootstrap])

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
      if (mod && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
      if (e.key === 'Escape') {
        if (searchOpen) setSearchOpen(false)
        else if (zenMode) setZenMode(false)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [searchOpen, zenMode, setZenMode])

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <AuthScreen />
        <ToastContainer />
      </>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent"
          />
          <p className="text-sm text-muted-foreground">Loading workspace…</p>
        </div>
      </div>
    )
  }

  // ── Admin panel ────────────────────────────────────────────────────────────
  if (showAdmin) {
    return (
      <>
        <AdminPanelView />
        <ToastContainer />
      </>
    )
  }

  // ── Main workspace ─────────────────────────────────────────────────────────
  return (
    <>
      <WorkspaceView onSearchOpen={() => setSearchOpen(true)} />

      <AnimatePresence>
        {searchOpen && (
          <SearchDialog key="search" open={searchOpen} onClose={() => setSearchOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>{zenMode && <ZenModeHint key="zen-hint" />}</AnimatePresence>

      <ToastContainer />
    </>
  )
}
