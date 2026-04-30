import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import {
  hashPassword,
  signToken,
  setSessionCookie,
} from '@/lib/auth-utils'
import { logActivity } from '@/lib/activity-logger'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, email, password } = body as Record<string, unknown>

  // --- Validation ---
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json(
      { error: 'Name must be at least 2 characters' },
      { status: 400 }
    )
  }
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    )
  }

  const normalizedEmail = email.trim().toLowerCase()

  // --- Check uniqueness ---
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Email is already registered' },
      { status: 409 }
    )
  }

  // --- Create user + workspace in a transaction ---
  const hashed = await hashPassword(password)

  const { user, workspace } = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashed,
        role: 'user',
      },
    })

    const newWorkspace = await tx.workspace.create({
      data: {
        name: 'My Workspace',
        icon: '📝',
      },
    })

    await tx.userWorkspace.create({
      data: {
        userId: newUser.id,
        workspaceId: newWorkspace.id,
      },
    })

    return { user: newUser, workspace: newWorkspace }
  })

  // --- Session ---
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

  await logActivity(user.id, 'user.register', { email: user.email })

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar ?? null,
        language: user.language,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        icon: workspace.icon,
      },
    },
    { status: 201 }
  )
}
