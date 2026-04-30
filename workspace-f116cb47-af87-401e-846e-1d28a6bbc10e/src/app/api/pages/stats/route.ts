import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-utils'

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ')
}

function countWords(text: string): number {
  const clean = stripHtml(text).trim()
  if (!clean) return 0
  return clean.split(/\s+/).filter(Boolean).length
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

  // Verify workspace membership
  const link = await prisma.userWorkspace.findUnique({
    where: {
      userId_workspaceId: { userId: session.userId, workspaceId },
    },
  })
  if (!link) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const pages = await prisma.page.findMany({
    where: { workspaceId },
    select: {
      id: true,
      blocks: {
        select: { content: true },
      },
    },
  })

  const stats: Record<string, number> = {}

  for (const page of pages) {
    let total = 0
    for (const block of page.blocks) {
      total += countWords(block.content)
    }
    stats[page.id] = total
  }

  return NextResponse.json(stats)
}
