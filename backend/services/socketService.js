import { emitToUser, emitToRole, emitBroadcast } from '../sockets/index.js';
import pool from '../config/db.js';

export async function createAndSendNotification({ userId, title, message, type = 'info', link = null }) {
  try {
    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (?, ?, ?, ?, ?)`,
      [userId || null, title, message, type, link]
    );

    const notification = {
      id: result.insertId,
      user_id: userId,
      title,
      message,
      type,
      is_read: 0,
      link,
      created_at: new Date().toISOString()
    };

    if (userId) {
      emitToUser(userId, 'notification:new', notification);
    } else {
      emitBroadcast('notification:new', notification);
    }

    return notification;
  } catch (error) {
    console.error('[NotificationService] Error creating notification:', error.message);
    return null;
  }
}

export function notifyAttendanceChange(attendanceData) {
  emitBroadcast('attendance:updated', attendanceData);
  emitBroadcast('dashboard:refresh', { trigger: 'attendance' });
}

export function notifyLeaveStatusChange(leaveData, employeeUserId) {
  if (employeeUserId) {
    emitToUser(employeeUserId, 'leave:status_updated', leaveData);
  }
  emitToRole('admin', 'leave:status_updated', leaveData);
  emitToRole('hr', 'leave:status_updated', leaveData);
  emitToRole('manager', 'leave:status_updated', leaveData);
  emitBroadcast('dashboard:refresh', { trigger: 'leave' });
}

export function notifyDashboardStatsUpdate() {
  emitBroadcast('dashboard:refresh', { trigger: 'stats' });
}
