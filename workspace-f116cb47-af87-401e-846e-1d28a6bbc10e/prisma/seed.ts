import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database…')

  // ── Admin user ────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123456', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nexusai.app' },
    update: {},
    create: {
      email: 'admin@nexusai.app',
      name: 'Admin',
      password: adminPassword,
      role: 'admin',
      avatar: '🛡️',
      language: 'en',
    },
  })
  console.log('✓ Admin user:', admin.email)

  // ── Demo user ─────────────────────────────────────────────────────────────
  const demoPassword = await bcrypt.hash('demo123456', 12)
  const demo = await prisma.user.upsert({
    where: { email: 'demo@nexusai.app' },
    update: {},
    create: {
      email: 'demo@nexusai.app',
      name: 'Demo User',
      password: demoPassword,
      role: 'user',
      avatar: '👤',
      language: 'en',
    },
  })
  console.log('✓ Demo user:', demo.email)

  // ── Workspace for admin ───────────────────────────────────────────────────
  let workspace = await prisma.workspace.findFirst({
    where: { users: { some: { userId: admin.id } } },
  })

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'NexusAI Workspace',
        icon: '🚀',
        description: 'Default admin workspace',
        users: { create: { userId: admin.id } },
      },
    })
  }
  console.log('✓ Workspace:', workspace.name)

  // Add demo user to workspace if not already member
  await prisma.userWorkspace.upsert({
    where: { userId_workspaceId: { userId: demo.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: demo.id, workspaceId: workspace.id },
  })

  // ── Welcome note page ─────────────────────────────────────────────────────
  let welcomePage = await prisma.page.findFirst({
    where: { workspaceId: workspace.id, title: 'Welcome to NexusAI' },
  })

  if (!welcomePage) {
    welcomePage = await prisma.page.create({
      data: {
        workspaceId: workspace.id,
        title: 'Welcome to NexusAI',
        icon: '👋',
        type: 'note',
        order: 0,
      },
    })

    await prisma.block.createMany({
      data: [
        { pageId: welcomePage.id, type: 'h1', content: 'Welcome to NexusAI! 🚀', order: 0 },
        { pageId: welcomePage.id, type: 'text', content: 'This is your Notion-like workspace. Use the sidebar to create pages, and this editor to add content.', order: 1 },
        { pageId: welcomePage.id, type: 'h2', content: 'Getting started', order: 2 },
        { pageId: welcomePage.id, type: 'bulleted', content: 'Create a new page from the sidebar', order: 3 },
        { pageId: welcomePage.id, type: 'bulleted', content: 'Type / in the editor for block commands', order: 4 },
        { pageId: welcomePage.id, type: 'bulleted', content: 'Press ⌘K to search', order: 5 },
        { pageId: welcomePage.id, type: 'todo', content: 'Read this welcome page', checked: true, order: 6 },
        { pageId: welcomePage.id, type: 'todo', content: 'Create your first page', order: 7 },
        { pageId: welcomePage.id, type: 'todo', content: 'Try the kanban board', order: 8 },
      ],
    })
  }
  console.log('✓ Welcome page created')

  // ── Sample kanban page ─────────────────────────────────────────────────────
  let kanbanPage = await prisma.page.findFirst({
    where: { workspaceId: workspace.id, type: 'kanban', title: 'Project Board' },
  })

  if (!kanbanPage) {
    kanbanPage = await prisma.page.create({
      data: {
        workspaceId: workspace.id,
        title: 'Project Board',
        icon: '📋',
        type: 'kanban',
        order: 1,
      },
    })

    const [todo, inProgress, done] = await Promise.all([
      prisma.kanbanColumn.create({ data: { pageId: kanbanPage.id, title: 'To Do', order: 0, color: '#6366f1' } }),
      prisma.kanbanColumn.create({ data: { pageId: kanbanPage.id, title: 'In Progress', order: 1, color: '#f59e0b' } }),
      prisma.kanbanColumn.create({ data: { pageId: kanbanPage.id, title: 'Done', order: 2, color: '#10b981' } }),
    ])

    await prisma.task.createMany({
      data: [
        { pageId: kanbanPage.id, columnId: todo.id, title: 'Design the homepage', priority: 'high', order: 0 },
        { pageId: kanbanPage.id, columnId: todo.id, title: 'Set up authentication', priority: 'medium', order: 1 },
        { pageId: kanbanPage.id, columnId: inProgress.id, title: 'Build the block editor', priority: 'high', order: 0 },
        { pageId: kanbanPage.id, columnId: done.id, title: 'Initial project setup', priority: 'low', status: 'done', order: 0 },
        { pageId: kanbanPage.id, columnId: done.id, title: 'Database schema', priority: 'medium', status: 'done', order: 1 },
      ],
    })
  }
  console.log('✓ Kanban page created')

  // ── Sample task list page ──────────────────────────────────────────────────
  let taskPage = await prisma.page.findFirst({
    where: { workspaceId: workspace.id, type: 'task', title: 'My Tasks' },
  })

  if (!taskPage) {
    taskPage = await prisma.page.create({
      data: {
        workspaceId: workspace.id,
        title: 'My Tasks',
        icon: '✅',
        type: 'task',
        order: 2,
      },
    })

    await prisma.task.createMany({
      data: [
        { pageId: taskPage.id, title: 'Review project requirements', priority: 'high', order: 0 },
        { pageId: taskPage.id, title: 'Write documentation', priority: 'medium', order: 1 },
        { pageId: taskPage.id, title: 'Deploy to production', priority: 'high', order: 2, status: 'done' },
      ],
    })
  }
  console.log('✓ Task page created')

  console.log('\n✅ Seed complete!')
  console.log('   Admin: admin@nexusai.app / admin123456')
  console.log('   Demo:  demo@nexusai.app  / demo123456')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
