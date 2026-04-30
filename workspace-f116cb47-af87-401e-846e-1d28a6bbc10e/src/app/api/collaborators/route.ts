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

  const collaborators = await prisma.pageCollaborator.findMany({
    where: { pageId },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true, role: true },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  return NextResponse.json({ collaborators })
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

  const { pageId, email, role } = body as Record<string, unknown>

  if (!pageId || typeof pageId !== 'string') {
    return NextResponse.json({ error: 'pageId is required' }, { status: 400 })
  }
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  // Only workspace members can add collaborators
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { workspaceId: true },
  })
  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }

  const link = await prisma.userWorkspace.findUnique({
    where: {
      userId_workspaceId: { userId: session.userId, workspaceId: page.workspaceId },
    },
  })
  if (!link) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Find target user by email
  const targetUser = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, name: true, email: true, avatar: true },
  })
  if (!targetUser) {
    return NextResponse.json(
      { error: 'No user found with that email address' },
      { status: 404 },
    )
  }

  const validRole =
    typeof role === 'string' && ['viewer', 'editor'].includes(role) ? role : 'viewer'

  // Upsert to avoid duplicate error
  const collaborator = await prisma.pageCollaborator.upsert({
    where: { pageId_userId: { pageId, userId: targetUser.id } },
    update: { role: validRole },
    create: {
      pageId,
      userId: targetUser.id,
      role: validRole,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true, role: true },
      },
    },
  })

  await logActivity(session.userId, 'collaborator.add', {
    pageId,
    targetUserId: targetUser.id,
    role: validRole,
  })

  return NextResponse.json({ collaborator }, { status: 201 })
}

export async function DELETE(request: Request) {
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

  const { pageId, userId } = body as Record<string, unknown>

  if (!pageId || typeof pageId !== 'string') {
    return NextResponse.json({ error: 'pageId is required' }, { status: 400 })
  }
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  // Only workspace members or the collaborator themselves can remove
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { workspaceId: true },
  })
  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }

  const isWorkspaceMember = await prisma.userWorkspace.findUnique({
    where: {
      userId_workspaceId: { userId: session.userId, workspaceId: page.workspaceId },
    },
  })

  const isSelf = session.userId === userId

  if (!isWorkspaceMember && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.pageCollaborator.findUnique({
    where: { pageId_userId: { pageId, userId } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 })
  }

  await prisma.pageCollaborator.delete({
    where: { pageId_userId: { pageId, userId } },
  })

  await logActivity(session.userId, 'collaborator.remove', {
    pageId,
    targetUserId: userId,
  })

  return NextResponse.json({ ok: true })
}
