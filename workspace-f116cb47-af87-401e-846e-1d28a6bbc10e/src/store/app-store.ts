import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/lib/i18n'

export interface User {
  id: string
  email: string
  name: string
  role: string
  avatar?: string | null
  language?: string
}

export interface Workspace {
  id: string
  name: string
  icon: string
  description?: string | null
}

export interface Page {
  id: string
  title: string
  icon: string
  type: string
  cover?: string | null
  parentId?: string | null
  order: number
  isFavorite: boolean
  isArchived: boolean
  workspaceId: string
  createdAt: string
  updatedAt: string
}

export interface Block {
  id: string
  type: string
  content: string
  checked: boolean
  order: number
  metadata?: Record<string, unknown> | null
  pageId: string
  createdAt: string
  updatedAt: string
}

export type ToastVariant = 'default' | 'success' | 'error' | 'warning'

export interface Toast {
  id: string
  title: string
  message?: string
  variant?: ToastVariant
  duration?: number
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved'

interface AppState {
  // Auth
  user: User | null
  setUser: (user: User | null) => void

  // Workspace
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  setWorkspaces: (workspaces: Workspace[]) => void
  setCurrentWorkspace: (workspace: Workspace | null) => void

  // Pages
  pages: Page[]
  currentPage: Page | null
  setPages: (pages: Page[]) => void
  setCurrentPage: (page: Page | null) => void
  updatePage: (id: string, updates: Partial<Page>) => void
  addPage: (page: Page) => void
  removePage: (id: string) => void

  // Blocks
  blocks: Block[]
  setBlocks: (blocks: Block[]) => void
  updateBlock: (id: string, updates: Partial<Block>) => void
  addBlock: (block: Block) => void
  removeBlock: (id: string) => void

  // UI state
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  zenMode: boolean
  setZenMode: (v: boolean) => void
  showAI: boolean
  setShowAI: (v: boolean) => void
  showAdmin: boolean
  setShowAdmin: (v: boolean) => void
  language: Language
  setLanguage: (lang: Language) => void
  saveStatus: SaveStatus
  setSaveStatus: (s: SaveStatus) => void

  // Toasts
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  // Collaboration
  collaborators: Array<{ userId: string; name: string; color: string; pageId: string }>
  setCollaborators: (collaborators: Array<{ userId: string; name: string; color: string; pageId: string }>) => void

  // Onboarding
  onboardingComplete: boolean
  setOnboardingComplete: (v: boolean) => void

  // Recent pages (for page switcher)
  recentPageIds: string[]
  addRecentPage: (pageId: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      setUser: (user) => set({ user }),

      // Workspace
      workspaces: [],
      currentWorkspace: null,
      setWorkspaces: (workspaces) => set({ workspaces }),
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),

      // Pages
      pages: [],
      currentPage: null,
      setPages: (pages) => set({ pages }),
      setCurrentPage: (page) => set({ currentPage: page }),
      updatePage: (id, updates) =>
        set((state) => ({
          pages: state.pages.map((p) => (p.id === id ? { ...p, ...updates } : p)),
          currentPage:
            state.currentPage?.id === id
              ? { ...state.currentPage, ...updates }
              : state.currentPage,
        })),
      addPage: (page) => set((state) => ({ pages: [...state.pages, page] })),
      removePage: (id) =>
        set((state) => ({
          pages: state.pages.filter((p) => p.id !== id),
          currentPage: state.currentPage?.id === id ? null : state.currentPage,
        })),

      // Blocks
      blocks: [],
      setBlocks: (blocks) => set({ blocks }),
      updateBlock: (id, updates) =>
        set((state) => ({
          blocks: state.blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),
      addBlock: (block) => set((state) => ({ blocks: [...state.blocks, block] })),
      removeBlock: (id) =>
        set((state) => ({ blocks: state.blocks.filter((b) => b.id !== id) })),

      // UI
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      zenMode: false,
      setZenMode: (v) => set({ zenMode: v }),
      showAI: false,
      setShowAI: (v) => set({ showAI: v }),
      showAdmin: false,
      setShowAdmin: (v) => set({ showAdmin: v }),
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),
      saveStatus: 'saved',
      setSaveStatus: (s) => set({ saveStatus: s }),

      // Toasts
      toasts: [],
      addToast: (toast) => {
        const id = Math.random().toString(36).slice(2, 9)
        set((state) => ({ toasts: [...state.toasts, { id, ...toast }] }))
        setTimeout(
          () => get().removeToast(id),
          toast.duration ?? 4000
        )
      },
      removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

      // Collaboration
      collaborators: [],
      setCollaborators: (collaborators) => set({ collaborators }),

      // Onboarding
      onboardingComplete: false,
      setOnboardingComplete: (v) => set({ onboardingComplete: v }),

      // Recent pages
      recentPageIds: [],
      addRecentPage: (pageId) =>
        set((state) => ({
          recentPageIds: [
            pageId,
            ...state.recentPageIds.filter((id) => id !== pageId),
          ].slice(0, 20),
        })),
    }),
    {
      name: 'nexusai-store',
      partialize: (state) => ({
        // Only persist UI preferences and recent activity — NOT database entities
        sidebarCollapsed: state.sidebarCollapsed,
        language: state.language,
        onboardingComplete: state.onboardingComplete,
        recentPageIds: state.recentPageIds,
        zenMode: state.zenMode,
      }),
    }
  )
)
