import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import {
  getSession,
  hashPassword,
  verifyPassword,
  signToken,
  setSessionCookie,
} from '@/lib/auth-utils'
import { logActivity } from '@/lib/activity-logger'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      language: true,
      isActive: true,
      lastLoginAt: true,
      loginCount: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user })
}

export async function PATCH(request: Request) {
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

  const { name, avatar, language } = body as Record<string, unknown>

  const data: Record<string, unknown> = {}
  if (typeof name === 'string') {
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 },
      )
    }
    data.name = name.trim()
  }
  if (typeof avatar === 'string' || avatar === null) data.avatar = avatar
  if (typeof language === 'string') data.language = language

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: session.userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      language: true,
      isActive: true,
      lastLoginAt: true,
      loginCount: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // Refresh session cookie with updated data
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
    cookieData.options as Parameters<typeof cookieStore.set>[2],
  )

  await logActivity(session.userId, 'user.profile.update', {
    changes: Object.keys(data),
  })

  return NextResponse.json({ user })
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

  const { action, currentPassword, newPassword } = body as Record<string, unknown>

  if (action !== 'changePassword') {
    return NextResponse.json(
      { error: 'Unknown action. Use action: "changePassword"' },
      { status: 400 },
    )
  }

  if (!currentPassword || typeof currentPassword !== 'string') {
    return NextResponse.json({ error: 'currentPassword is required' }, { status: 400 })
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return NextResponse.json(
      { error: 'newPassword must be at least 8 characters' },
      { status: 400 },
    )
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const valid = await verifyPassword(currentPassword, user.password)
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }

  const hashed = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: session.userId },
    data: { password: hashed },
  })

  await logActivity(session.userId, 'user.password.change', {})

  return NextResponse.json({ ok: true })
}
