import prisma from './db'

export async function logActivity(
  userId: string | null,
  action: string,
  details?: Record<string, unknown>
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        details: details ?? null,
      },
    })
  } catch {
    // Non-critical — don't let logging failures break requests
  }
}
