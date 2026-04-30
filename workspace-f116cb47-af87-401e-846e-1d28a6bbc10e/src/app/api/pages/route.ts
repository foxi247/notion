import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-utils'
import { logActivity } from '@/lib/activity-logger'

async function assertWorkspaceMember(userId: string, workspaceId: string) {
  const link = await prisma.userWorkspace.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  })
  return link !== null
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json(
      { error: 'workspaceId query param is required' },
      { status: 400 }
    )
  }

  const isMember = await assertWorkspaceMember(session.userId, workspaceId)
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const pages = await prisma.page.findMany({
    where: { workspaceId },
    orderBy: { order: 'asc' },
  })

  return NextResponse.json({ pages })
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
    workspaceId,
    title,
    icon,
    type,
    parentId,
    cover,
  } = body as Record<string, unknown>

  if (!workspaceId || typeof workspaceId !== 'string') {
    return NextResponse.json(
      { error: 'workspaceId is required' },
      { status: 400 }
    )
  }

  const isMember = await assertWorkspaceMember(session.userId, workspaceId)
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Validate parentId belongs to same workspace
  if (parentId && typeof parentId === 'string') {
    const parent = await prisma.page.findUnique({
      where: { id: parentId },
      select: { workspaceId: true },
    })
    if (!parent || parent.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: 'Invalid parentId' },
        { status: 400 }
      )
    }
  }

  // Determine next order value
  const maxOrder = await prisma.page.aggregate({
    where: { workspaceId, parentId: typeof parentId === 'string' ? parentId : null },
    _max: { order: true },
  })
  const nextOrder = (maxOrder._max.order ?? -1) + 1

  const page = await prisma.page.create({
    data: {
      workspaceId,
      title: typeof title === 'string' ? title.trim() : 'Untitled',
      icon: typeof icon === 'string' ? icon : '📄',
      type: typeof type === 'string' ? type : 'note',
      parentId: typeof parentId === 'string' ? parentId : null,
      cover: typeof cover === 'string' ? cover : null,
      order: nextOrder,
    },
  })

  await logActivity(session.userId, 'page.create', {
    pageId: page.id,
    workspaceId,
    title: page.title,
  })

  return NextResponse.json({ page }, { status: 201 })
}
