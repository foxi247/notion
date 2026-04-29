import { Server } from 'socket.io';

const PORT = 3005;
const io = new Server(PORT, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserCursor {
  userId: string;
  name: string;
  avatar: string;
  x: number;
  y: number;
  color: string;
  lastUpdate: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  content: string;
  timestamp: number;
  pageId: string;
}

interface RoomUser {
  userId: string;
  name: string;
  avatar: string;
  color: string;
}

interface RoomState {
  cursors: Map<string, UserCursor>;
  chatHistory: ChatMessage[];
  users: Map<string, RoomUser>;
}

interface WorkspaceRoomState {
  users: Map<string, UserUser>;
}

interface UserUser {
  userId: string;
  name: string;
  avatar: string;
  color: string;
  pageId: string | null;
}

// ─── In-memory state ────────────────────────────────────────────────────────

// Page rooms (existing)
const rooms = new Map<string, RoomState>();

// Workspace rooms (new)
const workspaceRooms = new Map<string, WorkspaceRoomState>();

// Socket → userId mapping for clean disconnect
const socketUserMap = new Map<string, {
  userId: string;
  name: string;
  avatar: string;
  color: string;
  pageRooms: Set<string>;
  workspaceRooms: Set<string>;
}>();

const COLORS = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#64748b'
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getOrCreateRoom(pageId: string): RoomState {
  if (!rooms.has(pageId)) {
    rooms.set(pageId, {
      cursors: new Map(),
      chatHistory: [],
      users: new Map(),
    });
  }
  return rooms.get(pageId)!;
}

function getOrCreateWorkspaceRoom(workspaceId: string): WorkspaceRoomState {
  if (!workspaceRooms.has(workspaceId)) {
    workspaceRooms.set(workspaceId, {
      users: new Map(),
    });
  }
  return workspaceRooms.get(workspaceId)!;
}

function getColor(userId: string, users: Map<string, RoomUser>): string {
  let colorIdx = 0;
  for (const existingId of users.keys()) {
    if (existingId === userId) return users.get(userId)!.color;
    colorIdx++;
  }
  return COLORS[colorIdx % COLORS.length];
}

function getWorkspaceColor(userId: string, users: Map<string, UserUser>): string {
  let colorIdx = 0;
  for (const existingId of users.keys()) {
    if (existingId === userId) return users.get(userId)!.color;
    colorIdx++;
  }
  return COLORS[colorIdx % COLORS.length];
}

function getSocketData(socketId: string) {
  return socketUserMap.get(socketId);
}

function setSocketData(socketId: string, data: typeof socketUserMap extends Map<string, infer V> ? V : never) {
  socketUserMap.set(socketId, data);
}

// ─── Connection handling ───────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Collab] Connected: ${socket.id}`);

  // Initialize socket data
  setSocketData(socket.id, {
    userId: '',
    name: '',
    avatar: '',
    color: COLORS[0],
    pageRooms: new Set(),
    workspaceRooms: new Set(),
  });

  // ─── Workspace-level presence ──────────────────────────────────────────

  socket.on('join-workspace', (data: { workspaceId: string; userId: string; name: string; avatar: string }) => {
    const { workspaceId, userId, name, avatar } = data;
    socket.join(`ws:${workspaceId}`);
    const wsRoom = getOrCreateWorkspaceRoom(workspaceId);
    const color = getWorkspaceColor(userId, wsRoom.users);

    wsRoom.users.set(userId, { userId, name, avatar, color, pageId: null });

    // Update socket mapping
    const sd = getSocketData(socket.id);
    if (sd) {
      sd.userId = userId;
      sd.name = name;
      sd.avatar = avatar;
      sd.color = color;
      sd.workspaceRooms.add(workspaceId);
    }

    // Send existing workspace state
    socket.emit('workspace-state', {
      users: Array.from(wsRoom.users.values()).filter(u => u.userId !== userId),
    });

    // Notify others in workspace
    socket.to(`ws:${workspaceId}`).emit('workspace-user-joined', { userId, name, avatar, color });
    console.log(`[Collab] ${name} joined workspace ${workspaceId}`);
  });

  socket.on('leave-workspace', (data: { workspaceId: string; userId: string }) => {
    const { workspaceId, userId } = data;
    socket.leave(`ws:${workspaceId}`);
    const wsRoom = workspaceRooms.get(workspaceId);
    if (wsRoom) {
      wsRoom.users.delete(userId);
      socket.to(`ws:${workspaceId}`).emit('workspace-user-left', { userId });

      if (wsRoom.users.size === 0) {
        workspaceRooms.delete(workspaceId);
      }
    }

    const sd = getSocketData(socket.id);
    if (sd) {
      sd.workspaceRooms.delete(workspaceId);
    }
  });

  // ─── Page-level presence (existing, enhanced) ──────────────────────────

  socket.on('join-page', (data: { pageId: string; userId: string; name: string; avatar: string }) => {
    const { pageId, userId, name, avatar } = data;
    socket.join(pageId);
    const room = getOrCreateRoom(pageId);
    const color = getColor(userId, room.users);

    room.users.set(userId, { userId, name, avatar, color });

    // Update socket mapping
    const sd = getSocketData(socket.id);
    if (sd) {
      sd.userId = userId;
      sd.name = name;
      sd.avatar = avatar;
      sd.color = color;
      sd.pageRooms.add(pageId);
    }

    // Update workspace room with the page this user is viewing
    for (const wsId of (sd?.workspaceRooms ?? [])) {
      const wsRoom = workspaceRooms.get(wsId);
      if (wsRoom) {
        const wsUser = wsRoom.users.get(userId);
        if (wsUser) {
          wsUser.pageId = pageId;
        }
      }
    }

    // Send existing state
    socket.emit('room-state', {
      users: Array.from(room.users.values()),
      chatHistory: room.chatHistory.slice(-50),
      cursors: Array.from(room.cursors.values()),
    });

    // Notify others
    socket.to(pageId).emit('user-joined', { userId, name, avatar, color });
    console.log(`[Collab] ${name} joined page ${pageId}`);
  });

  socket.on('leave-page', (data: { pageId: string; userId: string }) => {
    const { pageId, userId } = data;
    socket.leave(pageId);
    const room = rooms.get(pageId);
    if (room) {
      room.users.delete(userId);
      room.cursors.delete(userId);
      socket.to(pageId).emit('user-left', { userId });

      if (room.users.size === 0) {
        rooms.delete(pageId);
      }
    }

    // Clear pageId from workspace room
    const sd = getSocketData(socket.id);
    if (sd) {
      sd.pageRooms.delete(pageId);
      for (const wsId of sd.workspaceRooms) {
        const wsRoom = workspaceRooms.get(wsId);
        if (wsRoom) {
          const wsUser = wsRoom.users.get(userId);
          if (wsUser && wsUser.pageId === pageId) {
            wsUser.pageId = null;
          }
        }
      }
    }
  });

  // ─── Cursor movement (broadcast to page + workspace) ───────────────────

  socket.on('cursor-move', (data: { pageId: string; userId: string; x: number; y: number }) => {
    const { pageId, userId, x, y } = data;
    const room = rooms.get(pageId);
    if (!room) return;

    room.cursors.set(userId, {
      userId,
      name: room.users.get(userId)?.name || 'Anonymous',
      avatar: room.users.get(userId)?.avatar || '👤',
      x,
      y,
      color: room.users.get(userId)?.color || '#6366f1',
      lastUpdate: Date.now(),
    });

    const cursorData = {
      userId,
      x,
      y,
      pageId,
      name: room.users.get(userId)?.name,
      avatar: room.users.get(userId)?.avatar,
      color: room.users.get(userId)?.color,
    };

    // Broadcast to page room
    socket.to(pageId).emit('cursor-update', cursorData);

    // Also broadcast to workspace room (so cursors appear across workspace)
    const sd = getSocketData(socket.id);
    if (sd) {
      for (const wsId of sd.workspaceRooms) {
        socket.to(`ws:${wsId}`).emit('workspace-cursor-update', cursorData);
      }
    }
  });

  // ─── Block content sync ────────────────────────────────────────────────

  socket.on('block-change', (data: { pageId: string; blockId: string; content: string; type: string; checked: boolean; order: number }) => {
    const { pageId, blockId, content, type, checked, order } = data;
    const room = rooms.get(pageId);
    if (!room) return;

    const user = room.users.get(data.userId || '');
    const changeData = {
      pageId,
      blockId,
      content,
      type,
      checked,
      order,
      userId: data.userId,
      userName: user?.name || 'Anonymous',
      timestamp: Date.now(),
    };

    socket.to(pageId).emit('block-change', changeData);
  });

  // ─── Page update sync ──────────────────────────────────────────────────

  socket.on('page-update', (data: { workspaceId: string; pageId: string; action: 'update' | 'create' | 'delete'; page?: { id: string; title: string; icon: string; type: string } }) => {
    const { workspaceId, pageId, action, page } = data;
    const sd = getSocketData(socket.id);

    const updateData = {
      workspaceId,
      pageId,
      action,
      page,
      userId: sd?.userId || '',
      userName: sd?.name || 'Anonymous',
      timestamp: Date.now(),
    };

    // Broadcast to all users in the workspace room
    io.to(`ws:${workspaceId}`).emit('page-update', updateData);
  });

  // ─── Chat message (existing) ───────────────────────────────────────────

  socket.on('chat-message', (data: { pageId: string; userId: string; content: string }) => {
    const { pageId, userId, content } = data;
    const room = rooms.get(pageId);
    if (!room) return;

    const user = room.users.get(userId);
    if (!user) return;

    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      userName: user.name,
      avatar: user.avatar,
      content,
      timestamp: Date.now(),
      pageId,
    };

    room.chatHistory.push(message);
    if (room.chatHistory.length > 100) {
      room.chatHistory = room.chatHistory.slice(-100);
    }

    io.to(pageId).emit('new-chat-message', message);
  });

  // ─── Typing indicator (existing) ───────────────────────────────────────

  socket.on('typing', (data: { pageId: string; userId: string; isTyping: boolean }) => {
    const { pageId, userId, isTyping } = data;
    socket.to(pageId).emit('user-typing', { userId, isTyping });
  });

  // ─── Disconnect (enhanced cleanup) ─────────────────────────────────────

  socket.on('disconnect', () => {
    console.log(`[Collab] Disconnected: ${socket.id}`);
    const sd = getSocketData(socket.id);
    if (!sd) return;

    // Clean up from all page rooms
    for (const pageId of sd.pageRooms) {
      const room = rooms.get(pageId);
      if (room) {
        room.users.delete(sd.userId);
        room.cursors.delete(sd.userId);
        io.to(pageId).emit('user-left', { userId: sd.userId });

        if (room.users.size === 0) {
          rooms.delete(pageId);
        }
      }
    }

    // Clean up from all workspace rooms
    for (const wsId of sd.workspaceRooms) {
      const wsRoom = workspaceRooms.get(wsId);
      if (wsRoom) {
        wsRoom.users.delete(sd.userId);
        io.to(`ws:${wsId}`).emit('workspace-user-left', { userId: sd.userId });

        if (wsRoom.users.size === 0) {
          workspaceRooms.delete(wsId);
        }
      }
    }

    socketUserMap.delete(socket.id);
  });
});

console.log(`[Collab] Collaboration service running on port ${PORT}`);
