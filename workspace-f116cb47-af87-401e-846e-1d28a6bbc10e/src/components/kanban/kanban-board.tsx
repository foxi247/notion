'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, MoreHorizontal, GripVertical, X, Check,
  Calendar, ChevronDown, Flag,
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore } from '@/store/app-store'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Subtask { id: string; title: string; checked: boolean; order: number }
interface Task {
  id: string; title: string; description?: string | null; status: string
  priority: string; order: number; dueDate?: string | null; tags?: string | null
  pageId: string; columnId?: string | null; subtasks: Subtask[]
}
interface Column { id: string; title: string; order: number; color: string; tasks: Task[] }

const PRIORITY_COLORS: Record<string, string> = {
  low:    'text-emerald-500',
  medium: 'text-yellow-500',
  high:   'text-red-500',
}

// ─── Sortable Task Card ───────────────────────────────────────────────────────
function TaskCard({
  task, onClick,
}: {
  task: Task; onClick: (t: Task) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const tags = task.tags ? task.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
  const doneCount = task.subtasks?.filter((s) => s.checked).length ?? 0
  const totalCount = task.subtasks?.length ?? 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border border-border/60 rounded-xl p-3.5 cursor-pointer hover:border-border hover:shadow-sm transition-all group"
      onClick={() => onClick(task)}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center text-muted-foreground/30 group-hover:text-muted-foreground/60 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm font-medium leading-snug">{task.title || 'Untitled'}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground truncate">{task.description}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium}`}>
              <Flag className="w-3 h-3 inline-block mr-0.5" />
              {task.priority}
            </span>
            {task.dueDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
            {totalCount > 0 && (
              <span className="text-xs text-muted-foreground">{doneCount}/{totalCount} ✓</span>
            )}
            {tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Task Detail Modal ─────────────────────────────────────────────────────────
function TaskModal({
  task, onClose, onUpdate, onDelete,
}: {
  task: Task; onClose: () => void
  onUpdate: (id: string, data: Partial<Task>) => void
  onDelete: (id: string) => void
}) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [priority, setPriority] = useState(task.priority)

  const save = () => {
    onUpdate(task.id, { title: title.trim() || 'Untitled', description: description || null, priority })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-md bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-sm">Task Details</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="Add a description…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          {task.subtasks?.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subtasks</label>
              <div className="space-y-1">
                {task.subtasks.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${s.checked ? 'bg-primary border-primary' : 'border-border'}`}>
                      {s.checked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                    </div>
                    <span className={s.checked ? 'line-through text-muted-foreground' : ''}>{s.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-border flex items-center justify-between">
          <button
            onClick={() => { onDelete(task.id); onClose() }}
            className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-accent transition-colors">
              Cancel
            </button>
            <button onClick={save} className="px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              Save
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────
function KanbanColumn({
  column, onAddTask, onEditTitle, onDeleteColumn, onTaskClick,
}: {
  column: Column
  onAddTask: (columnId: string) => void
  onEditTitle: (id: string, title: string) => void
  onDeleteColumn: (id: string) => void
  onTaskClick: (task: Task) => void
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(column.title)

  const saveTitle = () => {
    setEditingTitle(false)
    if (titleVal.trim() && titleVal !== column.title) onEditTitle(column.id, titleVal.trim())
  }

  return (
    <div className="flex flex-col w-72 shrink-0" style={{ borderLeft: `3px solid ${column.color}` }}>
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 rounded-t-xl border border-border/60 border-b-0">
        {editingTitle ? (
          <input
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleVal(column.title) } }}
            className="flex-1 bg-transparent outline-none text-sm font-semibold"
            autoFocus
          />
        ) : (
          <button
            onDoubleClick={() => setEditingTitle(true)}
            className="flex-1 text-left text-sm font-semibold truncate"
          >
            {column.title}
          </button>
        )}
        <span className="shrink-0 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
          {column.tasks.length}
        </span>
        <button
          onClick={() => onDeleteColumn(column.id)}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground/40 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Tasks */}
      <div
        className="flex-1 border border-border/60 border-t-0 rounded-b-xl overflow-hidden"
      >
        <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="p-2 space-y-2 min-h-[120px]">
            <AnimatePresence mode="popLayout">
              {column.tasks.length === 0 ? (
                <div className="border-2 border-dashed border-border/40 rounded-xl h-24 flex items-center justify-center text-xs text-muted-foreground/40">
                  Drop tasks here
                </div>
              ) : (
                column.tasks
                  .sort((a, b) => a.order - b.order)
                  .map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <TaskCard task={task} onClick={onTaskClick} />
                    </motion.div>
                  ))
              )}
            </AnimatePresence>
          </div>
        </SortableContext>

        {/* Add task */}
        <button
          onClick={() => onAddTask(column.id)}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40 transition-colors border-t border-border/40"
        >
          <Plus className="w-3.5 h-3.5" /> Add task
        </button>
      </div>
    </div>
  )
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────
export default function KanbanBoard({ pageId }: { pageId: string }) {
  const { addToast } = useAppStore()
  const [columns, setColumns] = useState<Column[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  const fetchBoard = useCallback(async () => {
    try {
      const [colRes, taskRes] = await Promise.all([
        fetch(`/api/kanban?pageId=${pageId}`),
        fetch(`/api/tasks?pageId=${pageId}`),
      ])
      const { columns: cols } = await colRes.json()
      const { tasks } = await taskRes.json()

      const enriched: Column[] = (cols ?? []).map((col: Omit<Column, 'tasks'>) => ({
        ...col,
        tasks: (tasks ?? []).filter((t: Task) => t.columnId === col.id),
      }))
      setColumns(enriched.sort((a: Column, b: Column) => a.order - b.order))
    } catch {
      addToast({ title: 'Failed to load board', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [pageId, addToast])

  useEffect(() => { fetchBoard() }, [fetchBoard])

  const addColumn = async () => {
    const res = await fetch('/api/kanban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId, title: 'New Column', color: '#6366f1' }),
    })
    if (!res.ok) return
    const { column } = await res.json()
    setColumns((prev) => [...prev, { ...column, tasks: [] }])
  }

  const deleteColumn = async (id: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== id))
    await fetch(`/api/kanban/${id}`, { method: 'DELETE' })
    addToast({ title: 'Column deleted', variant: 'success' })
  }

  const editColumnTitle = async (id: string, title: string) => {
    setColumns((prev) => prev.map((c) => c.id === id ? { ...c, title } : c))
    await fetch(`/api/kanban/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  }

  const addTask = async (columnId: string) => {
    const col = columns.find((c) => c.id === columnId)
    if (!col) return
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId, columnId, title: 'New Task', priority: 'medium', order: col.tasks.length }),
    })
    if (!res.ok) return
    const { task } = await res.json()
    setColumns((prev) => prev.map((c) => c.id === columnId ? { ...c, tasks: [...c.tasks, task] } : c))
    addToast({ title: 'Task added', variant: 'success' })
  }

  const updateTask = async (id: string, data: Partial<Task>) => {
    setColumns((prev) =>
      prev.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
      }))
    )
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  }

  const deleteTask = async (id: string) => {
    setColumns((prev) =>
      prev.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== id) }))
    )
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    addToast({ title: 'Task deleted', variant: 'success' })
  }

  // ── DnD ──────────────────────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const findTaskColumn = (taskId: string) => columns.find((c) => c.tasks.some((t) => t.id === taskId))

  const handleDragStart = (e: DragStartEvent) => setActiveTaskId(String(e.active.id))
  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveTaskId(null)
    const { active, over } = e
    if (!over) return

    const activeColId = findTaskColumn(String(active.id))?.id
    const overColId = findTaskColumn(String(over.id))?.id ?? columns.find((c) => c.id === String(over.id))?.id
    if (!activeColId || !overColId) return

    if (activeColId === overColId) {
      // Reorder within same column
      setColumns((prev) =>
        prev.map((col) => {
          if (col.id !== activeColId) return col
          const oldIdx = col.tasks.findIndex((t) => t.id === active.id)
          const newIdx = col.tasks.findIndex((t) => t.id === over.id)
          if (oldIdx === newIdx) return col
          const reordered = arrayMove(col.tasks, oldIdx, newIdx).map((t, i) => ({ ...t, order: i }))
          return { ...col, tasks: reordered }
        })
      )
    } else {
      // Move to different column
      const task = findTaskColumn(String(active.id))?.tasks.find((t) => t.id === active.id)
      if (!task) return
      setColumns((prev) =>
        prev.map((col) => {
          if (col.id === activeColId) return { ...col, tasks: col.tasks.filter((t) => t.id !== active.id) }
          if (col.id === overColId) return { ...col, tasks: [...col.tasks, { ...task, columnId: overColId }] }
          return col
        })
      )
      await fetch(`/api/tasks/${active.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId: overColId }),
      })
    }
  }

  const activeTask = activeTaskId
    ? columns.flatMap((c) => c.tasks).find((t) => t.id === activeTaskId) ?? null
    : null

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full overflow-x-auto">
        <div className="p-6 min-h-full">
          <h1 className="text-2xl font-bold mb-6">Board</h1>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 items-start pb-6">
              {columns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  onAddTask={addTask}
                  onEditTitle={editColumnTitle}
                  onDeleteColumn={deleteColumn}
                  onTaskClick={setSelectedTask}
                />
              ))}

              {/* Add column */}
              <button
                onClick={addColumn}
                className="shrink-0 w-72 flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border/40 hover:border-border text-muted-foreground/50 hover:text-muted-foreground transition-colors text-sm"
              >
                <Plus className="w-4 h-4" /> Add column
              </button>
            </div>

            <DragOverlay>
              {activeTask && (
                <div className="rotate-2 shadow-2xl">
                  <TaskCard task={activeTask} onClick={() => {}} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Task modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskModal
            key={selectedTask.id}
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={updateTask}
            onDelete={deleteTask}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
