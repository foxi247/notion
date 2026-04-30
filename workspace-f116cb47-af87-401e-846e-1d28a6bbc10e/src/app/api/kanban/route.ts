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
      { status: 400 },
    )
  }

  const access = await assertPageAccess(session.userId, pageId)
  if (!access) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  const columns = await prisma.kanbanColumn.findMany({
    where: { pageId },
    orderBy: { order: 'asc' },
    include: {
      tasks: {
        orderBy: { order: 'asc' },
        include: { subtasks: { orderBy: { order: 'asc' } } },
      },
    },
  })

  return NextResponse.json({ columns })
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

  const { pageId, title, order, color } = body as Record<string, unknown>

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

  let nextOrder: number
  if (typeof order === 'number') {
    nextOrder = order
  } else {
    const maxOrder = await prisma.kanbanColumn.aggregate({
      where: { pageId },
      _max: { order: true },
    })
    nextOrder = (maxOrder._max.order ?? -1) + 1
  }

  const column = await prisma.kanbanColumn.create({
    data: {
      pageId,
      title: title.trim(),
      order: nextOrder,
      color: typeof color === 'string' ? color : '#6366f1',
    },
    include: { tasks: true },
  })

  await logActivity(session.userId, 'kanban.column.create', {
    columnId: column.id,
    pageId,
    title: column.title,
  })

  return NextResponse.json({ column }, { status: 201 })
}
