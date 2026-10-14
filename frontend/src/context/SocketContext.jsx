import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const { showInfo, showSuccess, showWarning } = useToast();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({}); // userId/employeeId -> 'Online' | 'Away'
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef(new Map());

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers({});
      }
      return;
    }

    // Connect to server socket — use env var in production, localhost in dev
    const serverUrl = import.meta.env.VITE_SOCKET_URL
      || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : '');

    // Skip socket connection if no server URL available (e.g. no VITE_SOCKET_URL set in prod)
    if (!serverUrl) {
      console.warn('[Socket] No VITE_SOCKET_URL configured — real-time features disabled');
      return;
    }

    const s = io(serverUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnectionAttempts: 5,
      timeout: 10000
    });

    s.on('connect_error', (err) => {
      console.warn('Socket connection note:', err.message);
    });

    s.on('connect', () => {
      setIsConnected(true);
      // Announce user presence
      s.emit('user:online', {
        userId: user.id,
        employeeId: user.employee_id
      });
      // Join role room
      if (user.role_name) {
        s.emit('join:role', user.role_name);
      }
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // Receive initial online users snapshot
    s.on('users:online_list', (list) => {
      const map = {};
      list.forEach((u) => {
        if (u.employeeId) map[`emp_${u.employeeId}`] = u.status;
        if (u.userId) map[`user_${u.userId}`] = u.status;
      });
      setOnlineUsers(map);
    });

    // Receive presence updates
    s.on('user:status_changed', ({ userId, employeeId, status }) => {
      setOnlineUsers((prev) => {
        const next = { ...prev };
        if (status === 'Offline') {
          if (employeeId) delete next[`emp_${employeeId}`];
          if (userId) delete next[`user_${userId}`];
        } else {
          if (employeeId) next[`emp_${employeeId}`] = status;
          if (userId) next[`user_${userId}`] = status;
        }
        return next;
      });
    });

    // Real-time toast for incoming notifications
    s.on('notification:new', (notif) => {
      if (notif.type === 'success') {
        showSuccess(notif.message);
      } else if (notif.type === 'danger' || notif.type === 'warning') {
        showWarning(notif.message);
      } else {
        showInfo(notif.message);
      }
      notifyEvent('notification', notif);
    });

    s.on('attendance:updated', (data) => {
      notifyEvent('attendance', data);
    });

    s.on('leave:status_updated', (data) => {
      notifyEvent('leave', data);
    });

    s.on('dashboard:refresh', (data) => {
      notifyEvent('dashboard', data);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [isAuthenticated, user?.id]);

  const notifyEvent = (event, data) => {
    const cbs = listenersRef.current.get(event) || [];
    cbs.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error(`Error in listener for ${event}:`, e);
      }
    });
  };

  const subscribe = useCallback((event, callback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, []);
    }
    listenersRef.current.get(event).push(callback);

    return () => {
      const list = listenersRef.current.get(event) || [];
      listenersRef.current.set(event, list.filter((cb) => cb !== callback));
    };
  }, []);

  const setMyStatus = useCallback((status) => {
    if (socket && isConnected) {
      socket.emit('user:set_status', { status });
    }
  }, [socket, isConnected]);

  const isEmployeeOnline = useCallback((employeeId) => {
    if (!employeeId) return false;
    return !!onlineUsers[`emp_${employeeId}`];
  }, [onlineUsers]);

  const getEmployeeStatus = useCallback((employeeId) => {
    if (!employeeId) return 'Offline';
    return onlineUsers[`emp_${employeeId}`] || 'Offline';
  }, [onlineUsers]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        subscribe,
        setMyStatus,
        isEmployeeOnline,
        getEmployeeStatus
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
