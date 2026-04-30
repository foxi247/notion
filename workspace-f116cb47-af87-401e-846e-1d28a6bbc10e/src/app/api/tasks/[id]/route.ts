import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-utils'
import { logActivity } from '@/lib/activity-logger'

type RouteContext = { params: Promise<{ id: string }> }

async function assertTaskAccess(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      page: { select: { workspaceId: true } },
      subtasks: { orderBy: { order: 'asc' } },
    },
  })
  if (!task) return null

  const link = await prisma.userWorkspace.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId: task.page.workspaceId },
    },
  })
  if (link) return task

  const collab = await prisma.pageCollaborator.findUnique({
    where: { pageId_userId: { pageId: task.pageId, userId } },
  })
  if (collab) return task

  return null
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const task = await assertTaskAccess(session.userId, id)
  if (!task) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  return NextResponse.json({ task })
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await assertTaskAccess(session.userId, id)
  if (!existing) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    title,
    description,
    status,
    priority,
    dueDate,
    tags,
    columnId,
    order,
    // subtask toggling
    subtaskId,
    subtaskChecked,
  } = body as Record<string, unknown>

  // Handle subtask toggle as a special case
  if (typeof subtaskId === 'string') {
    if (typeof subtaskChecked !== 'boolean') {
      return NextResponse.json(
        { error: 'subtaskChecked (boolean) is required when subtaskId is provided' },
        { status: 400 },
      )
    }
    const subtask = await prisma.taskSubtask.findFirst({
      where: { id: subtaskId, taskId: id },
    })
    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
    }
    const updated = await prisma.taskSubtask.update({
      where: { id: subtaskId },
      data: { checked: subtaskChecked },
    })
    return NextResponse.json({ subtask: updated })
  }

  const data: Record<string, unknown> = {}
  if (typeof title === 'string') data.title = title.trim()
  if (typeof description === 'string' || description === null)
    data.description = description
  if (typeof status === 'string') data.status = status
  if (typeof priority === 'string') data.priority = priority
  if (typeof dueDate === 'string') data.dueDate = new Date(dueDate)
  if (dueDate === null) data.dueDate = null
  if (typeof tags === 'string' || tags === null) data.tags = tags
  if (typeof columnId === 'string' || columnId === null) data.columnId = columnId
  if (typeof order === 'number') data.order = order

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const task = await prisma.task.update({
    where: { id },
    data,
    include: { subtasks: { orderBy: { order: 'asc' } } },
  })

  await logActivity(session.userId, 'task.update', {
    taskId: id,
    changes: Object.keys(data),
  })

  return NextResponse.json({ task })
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const task = await assertTaskAccess(session.userId, id)
  if (!task) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  await prisma.task.delete({ where: { id } })

  await logActivity(session.userId, 'task.delete', {
    taskId: id,
    pageId: task.pageId,
    title: task.title,
  })

  return NextResponse.json({ ok: true })
}

// POST /api/tasks/[id] with action "addSubtask" in body to create a subtask
export async function POST(request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const task = await assertTaskAccess(session.userId, id)
  if (!task) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, title, order } = body as Record<string, unknown>

  if (action !== 'addSubtask') {
    return NextResponse.json(
      { error: 'Unknown action. Use action: "addSubtask"' },
      { status: 400 },
    )
  }

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  let nextOrder: number
  if (typeof order === 'number') {
    nextOrder = order
  } else {
    const maxOrder = await prisma.taskSubtask.aggregate({
      where: { taskId: id },
      _max: { order: true },
    })
    nextOrder = (maxOrder._max.order ?? -1) + 1
  }

  const subtask = await prisma.taskSubtask.create({
    data: {
      taskId: id,
      title: title.trim(),
      checked: false,
      order: nextOrder,
    },
  })

  await logActivity(session.userId, 'subtask.create', {
    subtaskId: subtask.id,
    taskId: id,
    title: subtask.title,
  })

  return NextResponse.json({ subtask }, { status: 201 })
}
