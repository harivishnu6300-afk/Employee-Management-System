import pool from '../config/db.js';

export async function logActivity(userId, action, details = '', req = null) {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1') : '127.0.0.1';
    const userAgent = req ? (req.headers['user-agent'] || 'System') : 'System';

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [userId || null, action, details, String(ipAddress).substring(0, 45), String(userAgent).substring(0, 255)]
    );
  } catch (error) {
    console.error('[Logger] Failed to write activity log:', error.message);
  }
}
