import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-utils'
import { logActivity } from '@/lib/activity-logger'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userWorkspaces = await prisma.userWorkspace.findMany({
    where: { userId: session.userId },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  })

  const workspaces = userWorkspaces.map((uw) => ({
    id: uw.workspace.id,
    name: uw.workspace.name,
    icon: uw.workspace.icon,
    description: uw.workspace.description,
    createdAt: uw.workspace.createdAt,
    updatedAt: uw.workspace.updatedAt,
  }))

  return NextResponse.json({ workspaces })
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

  const { name, icon, description } = body as Record<string, unknown>

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Workspace name is required' },
      { status: 400 }
    )
  }

  const { workspace } = await prisma.$transaction(async (tx) => {
    const newWorkspace = await tx.workspace.create({
      data: {
        name: name.trim(),
        icon: typeof icon === 'string' ? icon : '📝',
        description:
          typeof description === 'string' ? description.trim() : undefined,
      },
    })

    await tx.userWorkspace.create({
      data: {
        userId: session.userId,
        workspaceId: newWorkspace.id,
      },
    })

    return { workspace: newWorkspace }
  })

  await logActivity(session.userId, 'workspace.create', {
    workspaceId: workspace.id,
    name: workspace.name,
  })

  return NextResponse.json({ workspace }, { status: 201 })
}
