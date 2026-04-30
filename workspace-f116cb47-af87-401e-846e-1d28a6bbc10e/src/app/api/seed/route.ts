import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth-utils'
import { getSession } from '@/lib/auth-utils'

export async function POST() {
  // Allow in development unconditionally, or require admin session in production
  const isDev = process.env.NODE_ENV === 'development'

  if (!isDev) {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
    }
  }

  // --- Users ---
  const [demoPassword, adminPassword] = await Promise.all([
    hashPassword('demo1234'),
    hashPassword('admin1234'),
  ])

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@nexusai.app' },
    update: {},
    create: {
      email: 'demo@nexusai.app',
      name: 'Demo User',
      password: demoPassword,
      role: 'user',
      language: 'en',
    },
  })

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@nexusai.app' },
    update: {},
    create: {
      email: 'admin@nexusai.app',
      name: 'Admin',
      password: adminPassword,
      role: 'admin',
      language: 'en',
    },
  })

  // --- Workspace ---
  const existingUW = await prisma.userWorkspace.findFirst({
    where: { userId: demoUser.id },
    include: { workspace: true },
  })

  let workspace = existingUW?.workspace

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: { name: 'Demo Workspace', icon: '🚀' },
    })
    await prisma.userWorkspace.create({
      data: { userId: demoUser.id, workspaceId: workspace.id },
    })
  }

  // Also link admin to the workspace
  await prisma.userWorkspace.upsert({
    where: { userId_workspaceId: { userId: adminUser.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: adminUser.id, workspaceId: workspace.id },
  })

  // --- Pages ---
  const notePage = await prisma.page.create({
    data: {
      workspaceId: workspace.id,
      title: 'Welcome to NexusAI',
      icon: '👋',
      type: 'note',
      order: 0,
    },
  })

  const kanbanPage = await prisma.page.create({
    data: {
      workspaceId: workspace.id,
      title: 'Sprint Board',
      icon: '📋',
      type: 'kanban',
      order: 1,
    },
  })

  const taskPage = await prisma.page.create({
    data: {
      workspaceId: workspace.id,
      title: 'My Tasks',
      icon: '✅',
      type: 'task',
      order: 2,
    },
  })

  // --- Blocks for the note page ---
  await prisma.block.createMany({
    data: [
      {
        pageId: notePage.id,
        type: 'heading1',
        content: 'Welcome to NexusAI',
        order: 0,
      },
      {
        pageId: notePage.id,
        type: 'text',
        content:
          'NexusAI is your all-in-one workspace for notes, tasks, and collaboration. Get started by exploring the demo content below.',
        order: 1,
      },
      {
        pageId: notePage.id,
        type: 'heading2',
        content: 'Key Features',
        order: 2,
      },
      {
        pageId: notePage.id,
        type: 'bulleted_list',
        content: 'Rich text editing with blocks',
        order: 3,
      },
      {
        pageId: notePage.id,
        type: 'bulleted_list',
        content: 'Kanban boards for project management',
        order: 4,
      },
      {
        pageId: notePage.id,
        type: 'bulleted_list',
        content: 'AI-powered writing assistance',
        order: 5,
      },
      {
        pageId: notePage.id,
        type: 'bulleted_list',
        content: 'Real-time collaboration',
        order: 6,
      },
      {
        pageId: notePage.id,
        type: 'todo',
        content: 'Explore the Sprint Board page',
        checked: false,
        order: 7,
      },
      {
        pageId: notePage.id,
        type: 'todo',
        content: 'Create your first page',
        checked: false,
        order: 8,
      },
      {
        pageId: notePage.id,
        type: 'todo',
        content: 'Try the AI assistant',
        checked: false,
        order: 9,
      },
    ],
  })

  // --- Kanban columns ---
  const [todoCol, inProgressCol, reviewCol, doneCol] = await Promise.all([
    prisma.kanbanColumn.create({
      data: { pageId: kanbanPage.id, title: 'To Do', order: 0, color: '#6366f1' },
    }),
    prisma.kanbanColumn.create({
      data: { pageId: kanbanPage.id, title: 'In Progress', order: 1, color: '#f59e0b' },
    }),
    prisma.kanbanColumn.create({
      data: { pageId: kanbanPage.id, title: 'Review', order: 2, color: '#8b5cf6' },
    }),
    prisma.kanbanColumn.create({
      data: { pageId: kanbanPage.id, title: 'Done', order: 3, color: '#10b981' },
    }),
  ])

  // --- Tasks on kanban page ---
  const task1 = await prisma.task.create({
    data: {
      pageId: kanbanPage.id,
      columnId: todoCol.id,
      title: 'Design new landing page',
      description: 'Create wireframes and high-fidelity mockups for the marketing landing page.',
      status: 'todo',
      priority: 'high',
      tags: 'design,marketing',
      order: 0,
    },
  })

  await prisma.taskSubtask.createMany({
    data: [
      { taskId: task1.id, title: 'Research competitor landing pages', order: 0 },
      { taskId: task1.id, title: 'Create wireframes', order: 1 },
      { taskId: task1.id, title: 'Design hi-fi mockups', order: 2 },
    ],
  })

  const task2 = await prisma.task.create({
    data: {
      pageId: kanbanPage.id,
      columnId: inProgressCol.id,
      title: 'Implement authentication flow',
      description: 'Build login, register, and password reset pages with JWT auth.',
      status: 'in_progress',
      priority: 'high',
      tags: 'backend,auth',
      order: 0,
    },
  })

  await prisma.taskSubtask.createMany({
    data: [
      { taskId: task2.id, title: 'Login endpoint', checked: true, order: 0 },
      { taskId: task2.id, title: 'Register endpoint', checked: true, order: 1 },
      { taskId: task2.id, title: 'JWT token handling', checked: true, order: 2 },
      { taskId: task2.id, title: 'Password reset flow', checked: false, order: 3 },
    ],
  })

  await prisma.task.create({
    data: {
      pageId: kanbanPage.id,
      columnId: reviewCol.id,
      title: 'Write API documentation',
      description: 'Document all REST API endpoints with request/response examples.',
      status: 'review',
      priority: 'medium',
      tags: 'docs',
      order: 0,
    },
  })

  await prisma.task.create({
    data: {
      pageId: kanbanPage.id,
      columnId: doneCol.id,
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment.',
      status: 'done',
      priority: 'medium',
      tags: 'devops',
      order: 0,
    },
  })

  // --- Tasks on task page ---
  const personalTask = await prisma.task.create({
    data: {
      pageId: taskPage.id,
      title: 'Review pull requests',
      status: 'todo',
      priority: 'high',
      tags: 'engineering',
      order: 0,
    },
  })

  await prisma.taskSubtask.createMany({
    data: [
      { taskId: personalTask.id, title: 'PR #42 - Add dark mode', order: 0 },
      { taskId: personalTask.id, title: 'PR #43 - Fix mobile layout', order: 1 },
    ],
  })

  await prisma.task.create({
    data: {
      pageId: taskPage.id,
      title: 'Update project dependencies',
      status: 'todo',
      priority: 'low',
      tags: 'maintenance',
      order: 1,
    },
  })

  await prisma.task.create({
    data: {
      pageId: taskPage.id,
      title: 'Weekly team sync',
      description: 'Prepare agenda and slides for the weekly engineering sync.',
      status: 'done',
      priority: 'medium',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      tags: 'meetings',
      order: 2,
    },
  })

  return NextResponse.json({
    ok: true,
    data: {
      users: [
        { email: 'demo@nexusai.app', password: 'demo1234', role: 'user' },
        { email: 'admin@nexusai.app', password: 'admin1234', role: 'admin' },
      ],
      workspace: { id: workspace.id, name: workspace.name },
      pages: [notePage.id, kanbanPage.id, taskPage.id],
    },
  })
}
