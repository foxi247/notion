import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-utils'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get('limit')
  const userIdParam = searchParams.get('userId')

  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 500) : 50

  const where: Record<string, unknown> = {}
  if (userIdParam) {
    where.userId = userIdParam
  }

  const activities = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true, role: true },
      },
    },
  })

  return NextResponse.json({ activities })
}
