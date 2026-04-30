'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronDown, Plus, Search, Settings, Moon, Sun, Monitor,
  Star, Archive, Trash2, MoreHorizontal, FileText, CheckSquare, Columns,
  LayoutDashboard, LogOut, User, Shield, Sparkles, SidebarClose, SidebarOpen,
  FolderOpen, Folder, Home, ChevronUp,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAppStore, type Page } from '@/store/app-store'
import { createTranslator } from '@/lib/i18n'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PAGE_TYPE_ICONS: Record<string, React.ReactNode> = {
  note: <FileText className="w-3.5 h-3.5" />,
  task: <CheckSquare className="w-3.5 h-3.5" />,
  kanban: <Columns className="w-3.5 h-3.5" />,
  calendar: <LayoutDashboard className="w-3.5 h-3.5" />,
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, cb])
}

// ─── Context Menu ─────────────────────────────────────────────────────────────
interface ContextMenuState {
  x: number
  y: number
  pageId: string
}

function PageContextMenu({
  menu,
  onClose,
  onFavorite,
  onArchive,
  onDelete,
  isFavorite,
  isArchived,
}: {
  menu: ContextMenuState
  onClose: () => void
  onFavorite: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  isFavorite: boolean
  isArchived: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, onClose)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.1 }}
      style={{ top: menu.y, left: menu.x }}
      className="fixed z-[200] bg-popover border border-border rounded-xl shadow-xl py-1.5 min-w-[160px] text-sm"
    >
      <button
        onClick={() => { onFavorite(menu.pageId); onClose() }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-accent transition-colors"
      >
        <Star className="w-3.5 h-3.5" />
        {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      </button>
      <button
        onClick={() => { onArchive(menu.pageId); onClose() }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-accent transition-colors"
      >
        <Archive className="w-3.5 h-3.5" />
        {isArchived ? 'Unarchive' : 'Archive'}
      </button>
      <div className="my-1 border-t border-border/60" />
      <button
        onClick={() => { onDelete(menu.pageId); onClose() }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-destructive/10 text-destructive transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
    </motion.div>
  )
}

// ─── Page Tree Item ───────────────────────────────────────────────────────────
function PageItem({
  page,
  depth = 0,
  children,
  isActive,
  onSelect,
  onContextMenu,
  onAddChild,
}: {
  page: Page
  depth?: number
  children?: Page[]
  isActive: boolean
  onSelect: (p: Page) => void
  onContextMenu: (e: React.MouseEvent, p: Page) => void
  onAddChild: (parentId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = children && children.length > 0

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors ${
          isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => onSelect(page)}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, page) }}
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
          className={`shrink-0 w-4 h-4 flex items-center justify-center rounded transition-colors hover:bg-accent ${
            hasChildren ? 'opacity-60 hover:opacity-100' : 'invisible'
          }`}
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>

        {/* Page icon */}
        <span className="shrink-0 text-sm leading-none">
          {page.icon || '📄'}
        </span>

        {/* Title */}
        <span className="flex-1 text-xs font-medium truncate min-w-0">
          {page.title || 'Untitled'}
        </span>

        {/* Actions on hover */}
        <span className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onAddChild(page.id) }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title="Add sub-page"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onContextMenu(e, page) }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title="More options"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </span>
      </div>

      {/* Children */}
      <AnimatePresence initial={false}>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {children!.map((child) => (
              <PageItem
                key={child.id}
                page={child}
                depth={depth + 1}
                isActive={isActive && false}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
                onAddChild={onAddChild}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── New Page Type Picker ─────────────────────────────────────────────────────
const PAGE_TYPES = [
  { type: 'note', label: 'Note', icon: '📄', description: 'Rich text with blocks' },
  { type: 'task', label: 'Task list', icon: '✅', description: 'Track tasks & subtasks' },
  { type: 'kanban', label: 'Kanban board', icon: '📋', description: 'Visual board with columns' },
]

function NewPagePicker({
  onSelect,
  onClose,
}: {
  onSelect: (type: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, onClose)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className="absolute left-2 right-2 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
    >
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-2.5 pb-1.5">
        New page
      </p>
      {PAGE_TYPES.map((t) => (
        <button
          key={t.type}
          onClick={() => { onSelect(t.type); onClose() }}
          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent transition-colors text-left"
        >
          <span className="text-lg leading-none">{t.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{t.label}</p>
            <p className="text-xs text-muted-foreground leading-tight">{t.description}</p>
          </div>
        </button>
      ))}
    </motion.div>
  )
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export default function AppSidebar({ onSearch }: { onSearch?: () => void }) {
  const {
    user, setUser,
    pages, setPages, addPage, updatePage, removePage, currentPage,
    workspaces, currentWorkspace,
    setCurrentPage, addRecentPage,
    sidebarCollapsed, setSidebarCollapsed,
    showAdmin, setShowAdmin,
    showAI, setShowAI,
    addToast,
    language,
  } = useAppStore()

  const t = createTranslator(language)
  const { theme, setTheme } = useTheme()
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [showNewPicker, setShowNewPicker] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [creatingPage, setCreatingPage] = useState(false)

  const newPickerRef = useRef<HTMLDivElement>(null)

  // Build tree
  const rootPages = pages.filter((p) => !p.parentId && !p.isArchived)
  const archivedPages = pages.filter((p) => p.isArchived)
  const favoritePages = pages.filter((p) => p.isFavorite && !p.isArchived)
  const childrenOf = useCallback(
    (parentId: string) => pages.filter((p) => p.parentId === parentId && !p.isArchived),
    [pages]
  )

  const handleSelect = useCallback(
    (page: Page) => {
      setCurrentPage(page)
      addRecentPage(page.id)
    },
    [setCurrentPage, addRecentPage]
  )

  const handleContextMenu = useCallback((e: React.MouseEvent, page: Page) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, pageId: page.id })
  }, [])

  const handleFavorite = useCallback(
    async (pageId: string) => {
      const page = pages.find((p) => p.id === pageId)
      if (!page) return
      const newVal = !page.isFavorite
      updatePage(pageId, { isFavorite: newVal })
      await fetch(`/api/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: newVal }),
      })
    },
    [pages, updatePage]
  )

  const handleArchive = useCallback(
    async (pageId: string) => {
      const page = pages.find((p) => p.id === pageId)
      if (!page) return
      const newVal = !page.isArchived
      updatePage(pageId, { isArchived: newVal })
      if (currentPage?.id === pageId) setCurrentPage(null)
      await fetch(`/api/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: newVal }),
      })
      addToast({
        title: newVal ? 'Page archived' : 'Page restored',
        variant: 'success',
      })
    },
    [pages, updatePage, currentPage, setCurrentPage, addToast]
  )

  const handleDelete = useCallback(
    async (pageId: string) => {
      removePage(pageId)
      if (currentPage?.id === pageId) setCurrentPage(null)
      const res = await fetch(`/api/pages/${pageId}`, { method: 'DELETE' })
      if (!res.ok) {
        addToast({ title: 'Failed to delete page', variant: 'error' })
      } else {
        addToast({ title: 'Page deleted', variant: 'success' })
      }
    },
    [removePage, currentPage, setCurrentPage, addToast]
  )

  const createPage = useCallback(
    async (type: string, parentId?: string) => {
      if (!currentWorkspace) return
      setCreatingPage(true)
      try {
        const res = await fetch('/api/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: currentWorkspace.id,
            title: 'Untitled',
            icon: type === 'task' ? '✅' : type === 'kanban' ? '📋' : '📄',
            type,
            parentId: parentId ?? null,
          }),
        })
        if (!res.ok) throw new Error('Failed to create page')
        const { page } = await res.json()
        addPage(page)
        setCurrentPage(page)
        addRecentPage(page.id)
      } catch {
        addToast({ title: 'Failed to create page', variant: 'error' })
      } finally {
        setCreatingPage(false)
      }
    },
    [currentWorkspace, addPage, setCurrentPage, addRecentPage, addToast]
  )

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setCurrentPage(null)
    setPages([])
  }, [setUser, setCurrentPage, setPages])

  const nextTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  // Collapsed sidebar — show only icons
  if (sidebarCollapsed) {
    return (
      <div className="h-full flex flex-col items-center py-3 gap-1 bg-sidebar">
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground"
          title="Expand sidebar"
        >
          <SidebarOpen className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setShowAI(!showAI)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground"
          title="AI Assistant"
        >
          <Sparkles className="w-4 h-4" />
        </button>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground"
            title="Admin Panel"
          >
            <Shield className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground select-none overflow-hidden">
      {/* ── Workspace header ── */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-sidebar-border/60 shrink-0">
        <span className="text-xl leading-none">
          {currentWorkspace?.icon ?? '📝'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">
            {currentWorkspace?.name ?? 'NexusAI'}
          </p>
          <p className="text-[10px] text-sidebar-foreground/50 leading-tight truncate">
            {user?.email ?? ''}
          </p>
        </div>
        <button
          onClick={() => setSidebarCollapsed(true)}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground"
          title="Collapse sidebar"
        >
          <SidebarClose className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Search button ── */}
      <div className="px-2 pt-2 shrink-0">
        <button
          onClick={onSearch}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground text-xs"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="text-[10px] bg-sidebar-accent text-sidebar-foreground/40 px-1 py-0.5 rounded font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Nav shortcuts ── */}
      <div className="px-2 pt-1 shrink-0 space-y-0.5">
        <button
          onClick={() => setCurrentPage(null)}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-xs ${
            !currentPage ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/70'
          }`}
        >
          <Home className="w-3.5 h-3.5 shrink-0" />
          Home
        </button>
        <button
          onClick={() => { setShowAI(!showAI) }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-xs ${
            showAI ? 'bg-sidebar-primary/10 text-sidebar-primary' : 'text-sidebar-foreground/70'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          AI Assistant
        </button>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-xs ${
              showAdmin ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/70'
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            Admin Panel
          </button>
        )}
      </div>

      {/* ── Favorites section ── */}
      {favoritePages.length > 0 && (
        <div className="px-2 pt-3 shrink-0">
          <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-1 mb-1">
            Favorites
          </p>
          {favoritePages.map((p) => (
            <PageItem
              key={p.id}
              page={p}
              isActive={currentPage?.id === p.id}
              onSelect={handleSelect}
              onContextMenu={handleContextMenu}
              onAddChild={(pid) => createPage('note', pid)}
            />
          ))}
        </div>
      )}

      {/* ── Pages section ── */}
      <div className="flex-1 overflow-y-auto px-2 pt-3 pb-2 min-h-0">
        <div className="flex items-center justify-between px-1 mb-1">
          <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest">
            Pages
          </p>
          <div className="relative" ref={newPickerRef}>
            <button
              onClick={() => setShowNewPicker((v) => !v)}
              disabled={creatingPage}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-sidebar-accent transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground disabled:opacity-40"
              title="New page"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
              {showNewPicker && (
                <NewPagePicker
                  onSelect={(type) => createPage(type)}
                  onClose={() => setShowNewPicker(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {rootPages.length === 0 ? (
          <div className="text-center py-6 text-sidebar-foreground/30">
            <FolderOpen className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No pages yet</p>
          </div>
        ) : (
          rootPages
            .sort((a, b) => a.order - b.order)
            .map((p) => (
              <PageItem
                key={p.id}
                page={p}
                children={childrenOf(p.id)}
                isActive={currentPage?.id === p.id}
                onSelect={handleSelect}
                onContextMenu={handleContextMenu}
                onAddChild={(pid) => createPage('note', pid)}
              />
            ))
        )}

        {/* New page quick button */}
        <button
          onClick={() => createPage('note')}
          disabled={creatingPage}
          className="mt-2 w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/40 hover:text-sidebar-foreground text-xs disabled:opacity-40 border border-dashed border-sidebar-border/60 hover:border-sidebar-border"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          Add a page
        </button>

        {/* Archived section */}
        {archivedPages.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="w-full flex items-center gap-2 px-1 py-1 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest hover:text-sidebar-foreground/60 transition-colors"
            >
              {showArchived ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Archive className="w-3 h-3" />
              Archived ({archivedPages.length})
            </button>
            <AnimatePresence>
              {showArchived && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {archivedPages.map((p) => (
                    <PageItem
                      key={p.id}
                      page={p}
                      isActive={currentPage?.id === p.id}
                      onSelect={handleSelect}
                      onContextMenu={handleContextMenu}
                      onAddChild={() => {}}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div className="shrink-0 border-t border-sidebar-border/60 px-2 py-2 space-y-0.5">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(nextTheme)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground text-xs"
        >
          <ThemeIcon className="w-3.5 h-3.5 shrink-0" />
          {theme === 'dark' ? 'Dark mode' : theme === 'light' ? 'Light mode' : 'System'}
        </button>

        {/* User profile */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors cursor-default">
          <div className="w-6 h-6 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sm shrink-0">
            {user?.avatar || user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate leading-tight">{user?.name}</p>
            <p className="text-[10px] text-sidebar-foreground/40 truncate leading-tight">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-sidebar-foreground/40"
            title="Sign out"
          >
            <LogOut className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (() => {
          const page = pages.find((p) => p.id === contextMenu.pageId)
          if (!page) return null
          return (
            <PageContextMenu
              key="ctx"
              menu={contextMenu}
              onClose={() => setContextMenu(null)}
              onFavorite={handleFavorite}
              onArchive={handleArchive}
              onDelete={handleDelete}
              isFavorite={page.isFavorite}
              isArchived={page.isArchived}
            />
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
