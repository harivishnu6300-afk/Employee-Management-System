let ioInstance = null;
const onlineUsers = new Map(); // userId -> { socketIds: Set, employeeId, status: 'Online' | 'Away' }
const employeeToUser = new Map(); // employeeId -> userId

export function initSocketIO(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    let currentUserId = null;
    let currentEmployeeId = null;

    // Handle user authentication / registration on socket
    socket.on('user:online', ({ userId, employeeId }) => {
      if (!userId) return;
      currentUserId = Number(userId);
      currentEmployeeId = employeeId ? Number(employeeId) : null;

      // Join personal room
      socket.join(`user_${currentUserId}`);
      if (currentEmployeeId) {
        socket.join(`employee_${currentEmployeeId}`);
        employeeToUser.set(currentEmployeeId, currentUserId);
      }

      if (!onlineUsers.has(currentUserId)) {
        onlineUsers.set(currentUserId, {
          socketIds: new Set(),
          employeeId: currentEmployeeId,
          status: 'Online',
          lastSeen: new Date()
        });
      }
      onlineUsers.get(currentUserId).socketIds.add(socket.id);
      onlineUsers.get(currentUserId).status = 'Online';

      // Broadcast to everyone that this user is online
      io.emit('user:status_changed', {
        userId: currentUserId,
        employeeId: currentEmployeeId,
        status: 'Online'
      });

      // Send the current list of online users to the freshly connected socket
      const activeList = [];
      for (const [uid, info] of onlineUsers.entries()) {
        if (info.socketIds.size > 0) {
          activeList.push({
            userId: uid,
            employeeId: info.employeeId,
            status: info.status
          });
        }
      }
      socket.emit('users:online_list', activeList);
    });

    // Handle Away / Online status toggle
    socket.on('user:set_status', ({ status }) => {
      if (currentUserId && onlineUsers.has(currentUserId)) {
        const userInfo = onlineUsers.get(currentUserId);
        userInfo.status = status || 'Online';
        io.emit('user:status_changed', {
          userId: currentUserId,
          employeeId: currentEmployeeId,
          status: userInfo.status
        });
      }
    });

    // Handle joining role room
    socket.on('join:role', (roleName) => {
      if (roleName) {
        socket.join(`role_${String(roleName).toLowerCase()}`);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (currentUserId && onlineUsers.has(currentUserId)) {
        const userInfo = onlineUsers.get(currentUserId);
        userInfo.socketIds.delete(socket.id);

        if (userInfo.socketIds.size === 0) {
          userInfo.status = 'Offline';
          userInfo.lastSeen = new Date();
          io.emit('user:status_changed', {
            userId: currentUserId,
            employeeId: currentEmployeeId,
            status: 'Offline'
          });
        }
      }
    });
  });

  return io;
}

export function getIO() {
  return ioInstance;
}

export function getOnlineUsers() {
  const active = [];
  for (const [userId, info] of onlineUsers.entries()) {
    if (info.socketIds.size > 0) {
      active.push({
        userId,
        employeeId: info.employeeId,
        status: info.status
      });
    }
  }
  return active;
}

export function emitToUser(userId, event, data) {
  if (ioInstance && userId) {
    ioInstance.to(`user_${userId}`).emit(event, data);
  }
}

export function emitToRole(roleName, event, data) {
  if (ioInstance && roleName) {
    ioInstance.to(`role_${String(roleName).toLowerCase()}`).emit(event, data);
  }
}

export function emitBroadcast(event, data) {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
}
