import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-utils'
import { logActivity } from '@/lib/activity-logger'

async function assertPageAccess(userId: string, pageId: string) {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { workspaceId: true },
  })
  if (!page) return null

  const link = await prisma.userWorkspace.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId: page.workspaceId },
    },
  })
  if (link) return page

  const collab = await prisma.pageCollaborator.findUnique({
    where: { pageId_userId: { pageId, userId } },
  })
  if (collab) return page

  return null
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const pageId = searchParams.get('pageId')

  if (!pageId) {
    return NextResponse.json(
      { error: 'pageId query param is required' },
      { status: 400 }
    )
  }

  const access = await assertPageAccess(session.userId, pageId)
  if (!access) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  const tasks = await prisma.task.findMany({
    where: { pageId },
    orderBy: { order: 'asc' },
    include: {
      subtasks: { orderBy: { order: 'asc' } },
    },
  })

  return NextResponse.json({ tasks })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    pageId,
    title,
    description,
    status,
    priority,
    dueDate,
    tags,
    columnId,
    order,
  } = body as Record<string, unknown>

  if (!pageId || typeof pageId !== 'string') {
    return NextResponse.json({ error: 'pageId is required' }, { status: 400 })
  }
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const access = await assertPageAccess(session.userId, pageId)
  if (!access) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  // Validate columnId if provided
  if (columnId && typeof columnId === 'string') {
    const col = await prisma.kanbanColumn.findUnique({
      where: { id: columnId },
      select: { pageId: true },
    })
    if (!col || col.pageId !== pageId) {
      return NextResponse.json({ error: 'Invalid columnId' }, { status: 400 })
    }
  }

  let nextOrder: number
  if (typeof order === 'number') {
    nextOrder = order
  } else {
    const maxOrder = await prisma.task.aggregate({
      where: { pageId },
      _max: { order: true },
    })
    nextOrder = (maxOrder._max.order ?? -1) + 1
  }

  const task = await prisma.task.create({
    data: {
      pageId,
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : null,
      status: typeof status === 'string' ? status : 'todo',
      priority: typeof priority === 'string' ? priority : 'medium',
      dueDate: typeof dueDate === 'string' ? new Date(dueDate) : null,
      tags: typeof tags === 'string' ? tags : null,
      columnId: typeof columnId === 'string' ? columnId : null,
      order: nextOrder,
    },
    include: { subtasks: true },
  })

  await logActivity(session.userId, 'task.create', {
    taskId: task.id,
    pageId,
    title: task.title,
  })

  return NextResponse.json({ task }, { status: 201 })
}
