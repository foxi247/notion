import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-utils'
import { logActivity } from '@/lib/activity-logger'

type RouteContext = { params: Promise<{ id: string }> }

async function assertBlockAccess(userId: string, blockId: string) {
  const block = await prisma.block.findUnique({
    where: { id: blockId },
    include: { page: { select: { workspaceId: true } } },
  })
  if (!block) return null

  const link = await prisma.userWorkspace.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: block.page.workspaceId,
      },
    },
  })
  if (link) return block

  const collab = await prisma.pageCollaborator.findUnique({
    where: { pageId_userId: { pageId: block.pageId, userId } },
  })
  if (collab) return block

  return null
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const block = await assertBlockAccess(session.userId, id)
  if (!block) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { content, checked, type, order, metadata } =
    body as Record<string, unknown>

  const data: Record<string, unknown> = {}
  if (typeof content === 'string') data.content = content
  if (typeof checked === 'boolean') data.checked = checked
  if (typeof type === 'string') data.type = type
  if (typeof order === 'number') data.order = order
  if (metadata !== undefined) data.metadata = metadata

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    )
  }

  const updated = await prisma.block.update({ where: { id }, data })

  await logActivity(session.userId, 'block.update', {
    blockId: id,
    pageId: block.pageId,
    changes: Object.keys(data),
  })

  return NextResponse.json({ block: updated })
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const block = await assertBlockAccess(session.userId, id)
  if (!block) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  await prisma.block.delete({ where: { id } })

  await logActivity(session.userId, 'block.delete', {
    blockId: id,
    pageId: block.pageId,
  })

  return NextResponse.json({ ok: true })
}
