import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-utils'
import { logActivity } from '@/lib/activity-logger'

type RouteContext = { params: Promise<{ id: string }> }

async function assertPageAccess(userId: string, pageId: string) {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { workspaceId: true },
  })
  if (!page) return null

  // Check workspace membership
  const link = await prisma.userWorkspace.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId: page.workspaceId },
    },
  })
  if (link) return page

  // Check page collaborator
  const collab = await prisma.pageCollaborator.findUnique({
    where: { pageId_userId: { pageId, userId } },
  })
  if (collab) return page

  return null
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const access = await assertPageAccess(session.userId, id)
  if (!access) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  const page = await prisma.page.findUnique({
    where: { id },
    include: {
      blocks: { orderBy: { order: 'asc' } },
      tasks: {
        orderBy: { order: 'asc' },
        include: { subtasks: { orderBy: { order: 'asc' } } },
      },
      columns: { orderBy: { order: 'asc' } },
    },
  })

  return NextResponse.json({ page })
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const access = await assertPageAccess(session.userId, id)
  if (!access) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, icon, cover, isFavorite, isArchived, order, parentId } =
    body as Record<string, unknown>

  const data: Record<string, unknown> = {}
  if (typeof title === 'string') data.title = title.trim()
  if (typeof icon === 'string') data.icon = icon
  if (typeof cover === 'string' || cover === null) data.cover = cover
  if (typeof isFavorite === 'boolean') data.isFavorite = isFavorite
  if (typeof isArchived === 'boolean') data.isArchived = isArchived
  if (typeof order === 'number') data.order = order
  if (typeof parentId === 'string' || parentId === null) data.parentId = parentId

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    )
  }

  const page = await prisma.page.update({ where: { id }, data })

  await logActivity(session.userId, 'page.update', {
    pageId: id,
    changes: Object.keys(data),
  })

  return NextResponse.json({ page })
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Only workspace members can delete pages
  const page = await prisma.page.findUnique({
    where: { id },
    select: { workspaceId: true, title: true },
  })
  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }

  const link = await prisma.userWorkspace.findUnique({
    where: {
      userId_workspaceId: {
        userId: session.userId,
        workspaceId: page.workspaceId,
      },
    },
  })
  if (!link) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.page.delete({ where: { id } })

  await logActivity(session.userId, 'page.delete', {
    pageId: id,
    title: page.title,
  })

  return NextResponse.json({ ok: true })
}
