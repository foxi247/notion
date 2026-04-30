'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Check, Trash2, Inbox } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAppStore } from '@/store/app-store'

interface Activity {
  id: string
  action: string
  userId: string
  userName: string
  userAvatar?: string
  pageTitle?: string
  createdAt: string
  read: boolean
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function UserAvatar({ name, avatar, color }: { name: string; avatar?: string; color: string }) {
  if (avatar) {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 overflow-hidden">
        <span className="text-base leading-none">{avatar}</span>
      </div>
    )
  }
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
      style={{ backgroundColor: color }}
    >
      {getInitials(name)}
    </div>
  )
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
]

function colorForUser(userId: string) {
  let hash = 0
  for (const ch of userId) hash = ((hash << 5) - hash) + ch.charCodeAt(0)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function NotificationCenter() {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace)
  const collaborators = useAppStore((s) => s.collaborators)

  const [open, setOpen] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const unread = activities.filter((a) => !a.read).length

  const fetchActivities = useCallback(async () => {
    if (!currentWorkspace?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/activity?workspaceId=${currentWorkspace.id}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities ?? [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace?.id])

  useEffect(() => {
    if (open) fetchActivities()
  }, [open, fetchActivities])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markAllRead = () => {
    setActivities((prev) => prev.map((a) => ({ ...a, read: true })))
  }

  const clearAll = () => {
    setActivities([])
  }

  const markRead = (id: string) => {
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)))
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-80 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Notifications</span>
                {unread > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 text-xs rounded-full font-medium">
                    {unread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent transition-colors flex items-center gap-1"
                    title="Mark all read"
                  >
                    <Check className="w-3 h-3" />
                    All read
                  </button>
                )}
                {activities.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded hover:bg-accent transition-colors flex items-center gap-1"
                    title="Clear all"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Activity feed */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-4 h-4 border-2 border-border border-t-foreground rounded-full animate-spin" />
                </div>
              ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Inbox className="w-8 h-8 opacity-30" />
                  <span className="text-sm">No notifications yet</span>
                </div>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    onClick={() => markRead(activity.id)}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors border-b border-border/50 last:border-0 ${
                      !activity.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <UserAvatar
                      name={activity.userName}
                      avatar={activity.userAvatar}
                      color={colorForUser(activity.userId)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug">
                        <span className="font-medium">{activity.userName}</span>{' '}
                        <span className="text-muted-foreground">{activity.action}</span>
                        {activity.pageTitle && (
                          <>
                            {' '}
                            <span className="font-medium text-foreground">{activity.pageTitle}</span>
                          </>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!activity.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
