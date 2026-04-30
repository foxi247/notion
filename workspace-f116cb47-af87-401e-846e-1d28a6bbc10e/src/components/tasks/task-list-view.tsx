'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, ChevronDown, ChevronRight, Check,
  Calendar, Tag, AlertCircle, Flag, Circle,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Subtask {
  id: string
  title: string
  checked: boolean
  order: number
}

interface Task {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  order: number
  dueDate?: string | null
  tags?: string | null
  pageId: string
  columnId?: string | null
  subtasks: Subtask[]
}

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  low:    { label: 'Low',    color: 'text-emerald-500 bg-emerald-500/10' },
  medium: { label: 'Medium', color: 'text-yellow-500 bg-yellow-500/10' },
  high:   { label: 'High',   color: 'text-red-500 bg-red-500/10' },
}

// ─── Task Row ─────────────────────────────────────────────────────────────────
function TaskRow({
  task,
  onToggle,
  onDelete,
  onUpdate,
}: {
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, data: Partial<Task>) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(task.title)
  const titleRef = useRef<HTMLInputElement>(null)
  const isDone = task.status === 'done'
  const pm = PRIORITY_META[task.priority] ?? PRIORITY_META.medium
  const tags = task.tags ? task.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
  const doneSubtasks = task.subtasks.filter((s) => s.checked).length
  const totalSubtasks = task.subtasks.length

  const saveTitle = () => {
    setEditingTitle(false)
    if (titleVal.trim() && titleVal !== task.title) {
      onUpdate(task.id, { title: titleVal.trim() })
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="group border border-border/60 rounded-xl overflow-hidden bg-card hover:border-border transition-colors"
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            isDone
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-border hover:border-primary'
          }`}
        >
          {isDone && <Check className="w-3 h-3" />}
        </button>

        {/* Title */}
        {editingTitle ? (
          <input
            ref={titleRef}
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleVal(task.title) } }}
            className="flex-1 bg-transparent outline-none text-sm font-medium"
            autoFocus
          />
        ) : (
          <span
            onDoubleClick={() => setEditingTitle(true)}
            className={`flex-1 text-sm font-medium cursor-text truncate ${isDone ? 'line-through text-muted-foreground' : ''}`}
          >
            {task.title || 'Untitled'}
          </span>
        )}

        {/* Priority */}
        <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${pm.color}`}>
          {pm.label}
        </span>

        {/* Due date */}
        {task.dueDate && (
          <span className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="shrink-0 flex gap-1">
            {tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Subtask progress */}
        {totalSubtasks > 0 && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {doneSubtasks}/{totalSubtasks}
          </span>
        )}

        {/* Expand button */}
        {(task.description || totalSubtasks > 0) && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground transition-colors"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Delete */}
        <button
          onClick={() => onDelete(task.id)}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/60"
          >
            <div className="px-12 py-3 space-y-3">
              {task.description && (
                <p className="text-sm text-muted-foreground">{task.description}</p>
              )}
              {task.subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${sub.checked ? 'bg-primary border-primary' : 'border-border'}`}>
                    {sub.checked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                  </div>
                  <span className={`text-sm ${sub.checked ? 'line-through text-muted-foreground' : ''}`}>
                    {sub.title}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Task List View ────────────────────────────────────────────────────────────
export default function TaskListView({ pageId }: { pageId: string }) {
  const { addToast } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all')
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?pageId=${pageId}`)
      if (!res.ok) throw new Error()
      const { tasks: fetched } = await res.json()
      setTasks(fetched ?? [])
    } catch {
      addToast({ title: 'Failed to load tasks', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [pageId, addToast])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleToggle = async (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t))
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  const handleDelete = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    addToast({ title: 'Task deleted', variant: 'success' })
  }

  const handleUpdate = async (id: string, data: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t))
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || adding) return
    setAdding(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, title: newTitle.trim(), priority: 'medium' }),
      })
      if (!res.ok) throw new Error()
      const { task } = await res.json()
      setTasks((prev) => [...prev, task])
      setNewTitle('')
      inputRef.current?.focus()
    } catch {
      addToast({ title: 'Failed to create task', variant: 'error' })
    } finally {
      setAdding(false)
    }
  }

  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const totalTasks = tasks.length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const filtered = tasks.filter((t) =>
    filter === 'all' ? true : filter === 'done' ? t.status === 'done' : t.status !== 'done'
  ).sort((a, b) => a.order - b.order)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Tasks</h1>
          {totalTasks > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{doneTasks}/{totalTasks} completed</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-6 bg-muted p-1 rounded-lg w-fit">
          {(['all', 'todo', 'done'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Circle className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">
                {filter === 'done' ? 'No completed tasks' : 'No tasks yet'}
              </p>
              <p className="text-xs opacity-60 mt-1">Add a task below to get started</p>
            </div>
          )}
        </div>

        {/* Add task form */}
        <form onSubmit={handleAddTask} className="mt-4 flex items-center gap-3 border border-dashed border-border rounded-xl px-4 py-3 hover:border-border/80 transition-colors">
          <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a task…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/50"
          />
          {newTitle.trim() && (
            <button
              type="submit"
              disabled={adding}
              className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Add
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
