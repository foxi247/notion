import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-utils'
import { logActivity } from '@/lib/activity-logger'

type RouteContext = { params: Promise<{ id: string }> }

async function assertMember(userId: string, workspaceId: string) {
  const link = await prisma.userWorkspace.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  })
  return link !== null
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const isMember = await assertMember(session.userId, id)
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      users: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true, role: true },
          },
        },
      },
    },
  })

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  return NextResponse.json({ workspace })
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const isMember = await assertMember(session.userId, id)
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, icon, description } = body as Record<string, unknown>

  const data: Record<string, unknown> = {}
  if (typeof name === 'string') data.name = name.trim()
  if (typeof icon === 'string') data.icon = icon
  if (typeof description === 'string') data.description = description.trim()

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    )
  }

  const workspace = await prisma.workspace.update({
    where: { id },
    data,
  })

  await logActivity(session.userId, 'workspace.update', {
    workspaceId: id,
    changes: Object.keys(data),
  })

  return NextResponse.json({ workspace })
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const isMember = await assertMember(session.userId, id)
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.workspace.delete({ where: { id } })

  await logActivity(session.userId, 'workspace.delete', { workspaceId: id })

  return NextResponse.json({ ok: true })
}
