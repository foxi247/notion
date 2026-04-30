import { getSession as getServerSession } from './auth-utils'
import type { SessionPayload } from './auth-utils'

export type { SessionPayload }

export async function getCurrentUser(): Promise<SessionPayload | null> {
  return getServerSession()
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getServerSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireAuth()
  if (session.role !== 'admin') {
    throw new Error('Forbidden')
  }
  return session
}
