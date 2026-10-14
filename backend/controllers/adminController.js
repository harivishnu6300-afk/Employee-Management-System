import pool from '../config/db.js';
import { logActivity } from '../utils/logger.js';

// GET /api/admin/users
export async function getUsers(req, res, next) {
  try {
    const [users] = await pool.query(`
      SELECT u.id, u.email, u.role_id, u.is_active, u.last_login_at, u.created_at,
             r.name as role_name,
             e.id as employee_id, e.employee_code, e.first_name, e.last_name, e.designation,
             d.name as department_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN employees e ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY u.created_at DESC
    `);

    return res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
}

// PUT /api/admin/users/:id/role
export async function updateUserRole(req, res, next) {
  try {
    const userId = parseInt(req.params.id, 10);
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ success: false, message: 'Role ID is required.' });
    }

    // Verify role exists
    const [roles] = await pool.query('SELECT name FROM roles WHERE id = ?', [roleId]);
    if (roles.length === 0) {
      return res.status(400).json({ success: false, message: 'Specified role not found.' });
    }

    await pool.query('UPDATE users SET role_id = ? WHERE id = ?', [roleId, userId]);
    // Also update linked employee record if present
    await pool.query('UPDATE employees SET role_id = ? WHERE user_id = ?', [roleId, userId]);

    await logActivity(req.user.id, 'User Role Changed', `Updated user ID ${userId} role to ${roles[0].name}`, req);

    return res.status(200).json({ success: true, message: `User role updated to ${roles[0].name}.` });
  } catch (error) {
    next(error);
  }
}

// PUT /api/admin/users/:id/status
export async function toggleUserStatus(req, res, next) {
  try {
    const userId = parseInt(req.params.id, 10);
    const { isActive } = req.body;

    // Prevent deactivating own account
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, userId]);
    await logActivity(req.user.id, isActive ? 'User Activated' : 'User Deactivated', `User ID ${userId} status changed`, req);

    return res.status(200).json({
      success: true,
      message: `User account has been ${isActive ? 'activated' : 'deactivated'}.`
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/activity-logs
export async function getActivityLogs(req, res, next) {
  try {
    const { action = '', search = '', page = 1, limit = 25 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));
    const offset = (pageNum - 1) * pageSize;

    const whereClauses = [];
    const params = [];

    if (action) {
      whereClauses.push('l.action = ?');
      params.push(action);
    }

    if (search && search.trim() !== '') {
      whereClauses.push(`(
        l.action LIKE ? OR
        l.details LIKE ? OR
        u.email LIKE ? OR
        CONCAT(e.first_name, ' ', e.last_name) LIKE ?
      )`);
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total
       FROM activity_logs l
       LEFT JOIN users u ON l.user_id = u.id
       LEFT JOIN employees e ON e.user_id = u.id
       ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    const [logs] = await pool.query(
      `SELECT l.*,
              u.email, CONCAT(e.first_name, ' ', e.last_name) as full_name,
              e.employee_code
       FROM activity_logs l
       LEFT JOIN users u ON l.user_id = u.id
       LEFT JOIN employees e ON e.user_id = u.id
       ${whereSql}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize) || 1
      }
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/settings
export async function getSettings(req, res, next) {
  try {
    const [settings] = await pool.query('SELECT * FROM system_settings');
    const settingsMap = {};
    for (const s of settings) {
      settingsMap[s.setting_key] = s.setting_value;
    }
    return res.status(200).json({ success: true, settings: settingsMap });
  } catch (error) {
    next(error);
  }
}

// PUT /api/admin/settings
export async function updateSettings(req, res, next) {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, String(value)]
      );
    }

    await logActivity(req.user.id, 'Settings Updated', 'System configuration updated', req);

    return res.status(200).json({ success: true, message: 'System settings saved.' });
  } catch (error) {
    next(error);
  }
}
