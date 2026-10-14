import pool from '../config/db.js';

// GET /api/notifications
export async function getNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const { unreadOnly = false, limit = 50 } = req.query;

    const whereClauses = ['(user_id = ? OR user_id IS NULL)'];
    const params = [userId];

    if (unreadOnly === 'true') {
      whereClauses.push('is_read = 0');
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const [notifications] = await pool.query(
      `SELECT * FROM notifications
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ?`,
      [...params, parseInt(limit, 10)]
    );

    // Count unread
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as unread_count
       FROM notifications
       WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount: countRows[0].unread_count || 0
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/notifications/:id/read
export async function markAsRead(req, res, next) {
  try {
    const notificationId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [notificationId, userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.'
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/notifications/read-all
export async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user.id;

    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0',
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    next(error);
  }
}
