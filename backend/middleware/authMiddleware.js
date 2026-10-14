import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export async function verifyToken(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    // Fetch user and linked employee info
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.role_id, u.is_active, r.name as role_name,
              e.id as employee_id, e.employee_code, e.first_name, e.last_name,
              e.department_id, e.designation, e.avatar_url, d.name as department_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE u.id = ? LIMIT 1`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. User account not found.'
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact HR or System Administrator.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.'
    });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized access.'
      });
    }

    const userRole = (req.user.role_name || '').toLowerCase();
    const normalizedRoles = allowedRoles.map(r => r.toLowerCase());

    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. This operation requires [${allowedRoles.join(', ')}] privileges.`
      });
    }

    next();
  };
}

export function requireSelfOrRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userRole = (req.user.role_name || '').toLowerCase();
    const hasRole = allowedRoles.some(r => r.toLowerCase() === userRole);
    const targetEmpId = parseInt(req.params.id || req.params.employeeId, 10);
    const isSelf = targetEmpId && req.user.employee_id === targetEmpId;

    if (!hasRole && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access or modify this record.'
      });
    }

    next();
  };
}
