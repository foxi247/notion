import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import {
  verifyPassword,
  signToken,
  setSessionCookie,
} from '@/lib/auth-utils'
import { logActivity } from '@/lib/activity-logger'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, password } = body as Record<string, unknown>

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }
  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  if (!user.isActive) {
    return NextResponse.json(
      { error: 'Account is deactivated' },
      { status: 403 }
    )
  }

  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  // Update login metadata
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      loginCount: { increment: 1 },
    },
  })

  // Fetch first workspace
  const userWorkspace = await prisma.userWorkspace.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  })

  // Session
  const token = signToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
    language: user.language,
  })

  const cookieData = setSessionCookie(token)
  const cookieStore = await cookies()
  cookieStore.set(
    cookieData.name,
    cookieData.value,
    cookieData.options as Parameters<typeof cookieStore.set>[2]
  )

  await logActivity(user.id, 'user.login', { email: user.email })

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar ?? null,
      language: user.language,
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount + 1,
    },
    workspace: userWorkspace
      ? {
          id: userWorkspace.workspace.id,
          name: userWorkspace.workspace.name,
          icon: userWorkspace.workspace.icon,
          description: userWorkspace.workspace.description,
        }
      : null,
  })
}
