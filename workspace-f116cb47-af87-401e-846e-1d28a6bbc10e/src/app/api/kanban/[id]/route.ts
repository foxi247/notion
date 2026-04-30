import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-utils'
import { logActivity } from '@/lib/activity-logger'

type RouteContext = { params: Promise<{ id: string }> }

async function assertColumnAccess(userId: string, columnId: string) {
  const column = await prisma.kanbanColumn.findUnique({
    where: { id: columnId },
    include: { page: { select: { workspaceId: true, id: true } } },
  })
  if (!column) return null

  const link = await prisma.userWorkspace.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId: column.page.workspaceId },
    },
  })
  if (link) return column

  const collab = await prisma.pageCollaborator.findUnique({
    where: { pageId_userId: { pageId: column.pageId, userId } },
  })
  if (collab) return column

  return null
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const column = await assertColumnAccess(session.userId, id)
  if (!column) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, color, order } = body as Record<string, unknown>

  const data: Record<string, unknown> = {}
  if (typeof title === 'string') data.title = title.trim()
  if (typeof color === 'string') data.color = color
  if (typeof order === 'number') data.order = order

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const updated = await prisma.kanbanColumn.update({
    where: { id },
    data,
    include: {
      tasks: {
        orderBy: { order: 'asc' },
        include: { subtasks: { orderBy: { order: 'asc' } } },
      },
    },
  })

  await logActivity(session.userId, 'kanban.column.update', {
    columnId: id,
    pageId: column.pageId,
    changes: Object.keys(data),
  })

  return NextResponse.json({ column: updated })
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const column = await assertColumnAccess(session.userId, id)
  if (!column) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  await prisma.kanbanColumn.delete({ where: { id } })

  await logActivity(session.userId, 'kanban.column.delete', {
    columnId: id,
    pageId: column.pageId,
    title: column.title,
  })

  return NextResponse.json({ ok: true })
}
