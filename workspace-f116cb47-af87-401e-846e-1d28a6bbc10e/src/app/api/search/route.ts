import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-utils'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const workspaceId = searchParams.get('workspaceId')

  if (!q || q.length === 0) {
    return NextResponse.json({ error: 'q query param is required' }, { status: 400 })
  }
  if (!workspaceId) {
    return NextResponse.json(
      { error: 'workspaceId query param is required' },
      { status: 400 },
    )
  }

  // Verify workspace membership
  const link = await prisma.userWorkspace.findUnique({
    where: {
      userId_workspaceId: { userId: session.userId, workspaceId },
    },
  })
  if (!link) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [pages, blocks, tasks] = await Promise.all([
    prisma.page.findMany({
      where: {
        workspaceId,
        isArchived: false,
        title: { contains: q, mode: 'insensitive' },
      },
      select: {
        id: true,
        title: true,
        icon: true,
        type: true,
        parentId: true,
        updatedAt: true,
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    }),

    prisma.block.findMany({
      where: {
        page: { workspaceId, isArchived: false },
        content: { contains: q, mode: 'insensitive' },
      },
      select: {
        id: true,
        type: true,
        content: true,
        pageId: true,
        page: { select: { id: true, title: true, icon: true } },
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    }),

    prisma.task.findMany({
      where: {
        page: { workspaceId, isArchived: false },
        title: { contains: q, mode: 'insensitive' },
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        pageId: true,
        page: { select: { id: true, title: true, icon: true } },
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  return NextResponse.json({ pages, blocks, tasks })
}
