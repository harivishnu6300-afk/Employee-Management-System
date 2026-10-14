import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/db.js';
import { logActivity } from '../utils/logger.js';
import { createAndSendNotification } from '../services/socketService.js';

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role_name
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register
export async function register(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const {
      fullName,
      email,
      phone,
      password,
      confirmPassword,
      role,
      departmentId,
      termsAccepted
    } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, and password are required fields.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    if (termsAccepted !== undefined && !termsAccepted) {
      return res.status(400).json({
        success: false,
        message: 'You must accept the terms and conditions to proceed.'
      });
    }

    await connection.beginTransaction();

    // Check duplicate email
    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()]
    );
    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Role resolution (default to Employee if not provided or valid)
    const targetRoleName = role || 'Employee';
    const [roles] = await connection.query(
      'SELECT id, name FROM roles WHERE name = ? LIMIT 1',
      [targetRoleName]
    );
    const roleId = roles.length > 0 ? roles[0].id : 4; // 4 = Employee

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const [userResult] = await connection.query(
      `INSERT INTO users (email, password_hash, role_id, is_active, last_login_at)
       VALUES (?, ?, ?, 1, NOW())`,
      [email.trim().toLowerCase(), passwordHash, roleId]
    );
    const userId = userResult.insertId;

    // Generate unique employee code
    const [lastEmp] = await connection.query(
      'SELECT id FROM employees ORDER BY id DESC LIMIT 1'
    );
    const nextNum = (lastEmp[0]?.id || 0) + 1001;
    const employeeCode = `EMP-${nextNum}`;

    // Split Full Name into first and last
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || 'Employee';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Insert employee
    const [empResult] = await connection.query(
      `INSERT INTO employees (
         user_id, employee_code, first_name, last_name, email, phone,
         department_id, designation, role_id, joining_date, salary,
         employment_type, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, 'Full-Time', 'Active')`,
      [
        userId,
        employeeCode,
        firstName,
        lastName,
        email.trim().toLowerCase(),
        phone || null,
        departmentId || null,
        targetRoleName === 'Admin' ? 'System Administrator' : (targetRoleName === 'Manager' ? 'Team Lead' : 'Associate Specialist'),
        roleId,
        65000.00
      ]
    );

    await connection.commit();

    // Fetch newly created user profile
    const [userRecords] = await pool.query(
      `SELECT u.id, u.email, u.role_id, r.name as role_name,
              e.id as employee_id, e.employee_code, e.first_name, e.last_name,
              e.phone, e.designation, e.department_id, e.avatar_url, d.name as department_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       JOIN employees e ON e.user_id = u.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE u.id = ? LIMIT 1`,
      [userId]
    );

    const user = userRecords[0];
    const token = generateToken(user);

    await logActivity(userId, 'User Registered', `Account created for ${email}`, req);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const term = email.trim();
    const cleanEmail = term.toLowerCase();

    const [users] = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.role_id, u.is_active, r.name as role_name,
              e.id as employee_id, e.employee_code, e.first_name, e.last_name,
              e.phone, e.designation, e.department_id, e.avatar_url, d.name as department_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE u.email = ? OR e.email = ? OR e.phone = ? OR e.employee_code = ?
       LIMIT 1`,
      [cleanEmail, cleanEmail, term, term.toUpperCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email, phone, or password.'
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Contact Administrator or HR.'
      });
    }

    // Authenticate only against the password hash stored for this account.
    // Never allow shared fallback passwords for every user.
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email, phone, or password.'
      });
    }

    // Update last login
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const token = generateToken(user);
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge,
      sameSite: 'lax'
    });

    await logActivity(user.id, 'User Login', `User logged in from portal`, req);

    delete user.password_hash;

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/logout
export async function logout(req, res, next) {
  try {
    if (req.user) {
      await logActivity(req.user.id, 'User Logout', 'User logged out', req);
    }
    res.clearCookie('token');
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/auth/me
export async function getMe(req, res, next) {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.role_id, u.is_active, u.last_login_at, r.name as role_name,
              e.id as employee_id, e.employee_code, e.first_name, e.last_name,
              e.phone, e.date_of_birth, e.gender, e.address, e.city, e.state,
              e.emergency_contact, e.department_id, e.designation, e.joining_date,
              e.salary, e.employment_type, e.status, e.manager_id, e.avatar_url,
              d.name as department_name,
              CONCAT(m.first_name, ' ', m.last_name) as manager_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN employees m ON e.manager_id = m.id
       WHERE u.id = ? LIMIT 1`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'User account not found. Please log in again.' });
    }

    return res.status(200).json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/forgot-password
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const [users] = await pool.query(
      'SELECT id, email FROM users WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()]
    );

    if (users.length === 0) {
      // Return success generic response to prevent email harvesting
      return res.status(200).json({
        success: true,
        message: 'If an account matches that email, a password reset link has been generated.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `INSERT INTO password_resets (email, token, expires_at)
       VALUES (?, ?, ?)`,
      [email.trim().toLowerCase(), resetToken, expiresAt]
    );

    await logActivity(users[0].id, 'Password Reset Requested', `Reset token generated for ${email}`, req);

    return res.status(200).json({
      success: true,
      message: 'Password reset link generated successfully.',
      resetToken, // Provided for direct demonstration & testing
      resetUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/reset-password
export async function resetPassword(req, res, next) {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    const [records] = await pool.query(
      `SELECT * FROM password_resets
       WHERE token = ? AND is_used = 0 AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [token]
    );

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is invalid or has expired.'
      });
    }

    const resetRecord = records[0];
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [passwordHash, resetRecord.email]
    );

    // Mark reset record used
    await pool.query(
      'UPDATE password_resets SET is_used = 1 WHERE id = ?',
      [resetRecord.id]
    );

    const [updatedUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [resetRecord.email]
    );

    if (updatedUsers.length > 0) {
      await logActivity(updatedUsers[0].id, 'Password Reset Completed', 'User password successfully reset', req);
      await createAndSendNotification({
        userId: updatedUsers[0].id,
        title: 'Password Updated',
        message: 'Your portal account password was successfully reset.',
        type: 'warning'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.'
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/auth/change-password
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match.'
      });
    }

    const [users] = await pool.query(
      'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);

    await logActivity(userId, 'Password Changed', 'User changed their password', req);

    await createAndSendNotification({
      userId,
      title: 'Password Changed',
      message: 'Your account password was updated successfully.',
      type: 'info'
    });

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}
