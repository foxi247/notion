'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Building2,
  FileText,
  Layers,
  CheckSquare,
  Activity,
  ArrowLeft,
  RefreshCw,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAppStore } from '@/store/app-store'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalWorkspaces: number
  totalPages: number
  totalBlocks: number
  totalTasks: number
}

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  avatar?: string | null
  lastLoginAt?: string | null
  loginCount?: number
  isActive?: boolean
}

interface ActivityEntry {
  id: string
  userId: string
  userName?: string
  action: string
  metadata?: Record<string, unknown>
  createdAt: string
}

interface DailyActivityPoint {
  date: string
  count: number
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function actionLabel(action: string): string {
  return action.replace('.', ' ').replace(/_/g, ' ')
}

const REFRESH_INTERVAL = 30_000

export function AdminPanel() {
  const { user, setShowAdmin, addToast } = useAppStore()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [dailyActivity, setDailyActivity] = useState<DailyActivityPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch('/api/activities?limit=50')
      if (!res.ok) return
      const data = await res.json()
      const list: ActivityEntry[] = data.activities ?? []
      setActivities(list)

      // Build daily activity chart data (last 7 days)
      const counts: Record<string, number> = {}
      const now = new Date()
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        counts[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0
      }
      for (const a of list) {
        const key = new Date(a.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
        if (key in counts) counts[key]++
      }
      setDailyActivity(
        Object.entries(counts).map(([date, count]) => ({ date, count }))
      )
    } catch {
      // silently ignore
    }
  }, [])

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, usersRes] = await Promise.allSettled([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
      ])

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const d = await statsRes.value.json()
        setStats(d.stats ?? d)
      }
      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        const d = await usersRes.value.json()
        setUsers(d.users ?? [])
      }

      await fetchActivities()
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [fetchActivities])

  useEffect(() => {
    fetchAll()
    intervalRef.current = setInterval(fetchActivities, REFRESH_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchAll, fetchActivities])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchActivities()
    setRefreshing(false)
  }

  const handleUserAction = async (
    userId: string,
    action: 'activate' | 'deactivate' | 'make-admin' | 'remove-admin'
  ) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error('Action failed')
      addToast({ title: 'Updated', message: 'User updated successfully', variant: 'success' })
      await fetchAll()
    } catch {
      addToast({ title: 'Error', message: 'Could not update user', variant: 'error' })
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Shield className="h-16 w-16 text-muted-foreground/40" />
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm text-muted-foreground">Admin privileges required.</p>
        <Button variant="outline" onClick={() => setShowAdmin(false)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Workspace
        </Button>
      </div>
    )
  }

  const statCards = stats
    ? [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Active Users', value: stats.activeUsers, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Workspaces', value: stats.totalWorkspaces, icon: Building2, color: 'text-violet-500', bg: 'bg-violet-500/10' },
        { label: 'Pages', value: stats.totalPages, icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { label: 'Blocks', value: stats.totalBlocks, icon: Layers, color: 'text-pink-500', bg: 'bg-pink-500/10' },
        { label: 'Tasks', value: stats.totalTasks, icon: CheckSquare, color: 'text-orange-500', bg: 'bg-orange-500/10' },
      ]
    : []

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowAdmin(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workspace
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Admin Panel</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border bg-muted/40 h-24 animate-pulse" />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
              >
                {statCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl border bg-card p-4 shadow-sm space-y-2"
                  >
                    <div className={`inline-flex rounded-lg p-1.5 ${card.bg}`}>
                      <card.icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{card.value.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Daily Activity Chart */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold mb-4">Activity (Last 7 Days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyActivity} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--card))',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <ScrollArea className="max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Logins</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-4 bg-muted rounded animate-pulse" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                {u.avatar && <AvatarImage src={u.avatar} alt={u.name} />}
                                <AvatarFallback className="text-xs">
                                  {getInitials(u.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{u.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.email}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={u.role === 'admin' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {u.role}
                            </Badge>
                            {u.isActive === false && (
                              <Badge variant="destructive" className="ml-1 text-xs">
                                inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.lastLoginAt ? formatRelativeTime(u.lastLoginAt) : '—'}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {u.loginCount ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {u.isActive !== false ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                  onClick={() => handleUserAction(u.id, 'deactivate')}
                                  title="Deactivate"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-600"
                                  onClick={() => handleUserAction(u.id, 'activate')}
                                  title="Activate"
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {u.role === 'admin' ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => handleUserAction(u.id, 'remove-admin')}
                                  title="Remove Admin"
                                  disabled={u.id === user?.id}
                                >
                                  <ShieldOff className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => handleUserAction(u.id, 'make-admin')}
                                  title="Make Admin"
                                >
                                  <Shield className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Recent Activity</span>
                <Badge variant="secondary" className="text-xs">
                  Auto-refresh 30s
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <ScrollArea className="h-[500px]">
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                    <Activity className="h-10 w-10 opacity-30" />
                    <p className="text-sm">No activity recorded</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {activities.map((a) => (
                      <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
                          <Activity className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{a.userName ?? 'User'}</span>{' '}
                            <span className="text-muted-foreground">{actionLabel(a.action)}</span>
                          </p>
                          {a.metadata && (
                            <p className="text-xs text-muted-foreground truncate">
                              {(a.metadata.title as string) ?? (a.metadata.pageId as string) ?? ''}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(a.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
