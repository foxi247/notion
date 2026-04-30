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
    return NextResponse.json({ error: 'pageId query param is required' }, { status: 400 })
  }

  const access = await assertPageAccess(session.userId, pageId)
  if (!access) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  const blocks = await prisma.block.findMany({
    where: { pageId },
    orderBy: { order: 'asc' },
  })

  return NextResponse.json({ blocks })
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

  const { pageId, type, content, checked, order, metadata } =
    body as Record<string, unknown>

  if (!pageId || typeof pageId !== 'string') {
    return NextResponse.json({ error: 'pageId is required' }, { status: 400 })
  }

  const access = await assertPageAccess(session.userId, pageId)
  if (!access) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  }

  // Determine next order
  let nextOrder: number
  if (typeof order === 'number') {
    nextOrder = order
  } else {
    const maxOrder = await prisma.block.aggregate({
      where: { pageId },
      _max: { order: true },
    })
    nextOrder = (maxOrder._max.order ?? -1) + 1
  }

  const block = await prisma.block.create({
    data: {
      pageId,
      type: typeof type === 'string' ? type : 'text',
      content: typeof content === 'string' ? content : '',
      checked: typeof checked === 'boolean' ? checked : false,
      order: nextOrder,
      metadata: metadata !== undefined ? (metadata as object) : null,
    },
  })

  await logActivity(session.userId, 'block.create', {
    blockId: block.id,
    pageId,
    type: block.type,
  })

  return NextResponse.json({ block }, { status: 201 })
}
