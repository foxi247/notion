import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { clearSessionCookie } from '@/lib/auth-utils'

export async function POST() {
  const cookieData = clearSessionCookie()
  const cookieStore = await cookies()
  cookieStore.set(
    cookieData.name,
    cookieData.value,
    cookieData.options as Parameters<typeof cookieStore.set>[2]
  )

  return NextResponse.json({ ok: true })
}
