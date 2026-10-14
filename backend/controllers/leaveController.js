import pool from '../config/db.js';
import { logActivity } from '../utils/logger.js';
import { createAndSendNotification, notifyLeaveStatusChange } from '../services/socketService.js';

// GET /api/leaves
export async function getAllLeaves(req, res, next) {
  try {
    const {
      status = '',
      leaveType = '',
      department = '',
      employeeId = '',
      search = '',
      page = 1,
      limit = 20,
      all = false
    } = req.query;

    const userRole = (req.user?.role_name || '').toLowerCase();
    const isEmployee = userRole === 'employee';
    const isManager = userRole === 'manager';

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));
    const offset = (pageNum - 1) * pageSize;

    const whereClauses = [];
    const params = [];

    // Scope for standard Employee: only own leaves
    if (isEmployee) {
      whereClauses.push('l.employee_id = ?');
      params.push(req.user.employee_id);
    } else if (isManager && req.query.teamOnly === 'true') {
      // Scope for Manager team review
      whereClauses.push('(e.manager_id = ? OR e.id = ?)');
      params.push(req.user.employee_id, req.user.employee_id);
    } else if (employeeId) {
      whereClauses.push('l.employee_id = ?');
      params.push(employeeId);
    }

    if (status) {
      whereClauses.push('l.status = ?');
      params.push(status);
    }

    if (leaveType) {
      whereClauses.push('l.leave_type = ?');
      params.push(leaveType);
    }

    if (department) {
      whereClauses.push('e.department_id = ?');
      params.push(department);
    }

    if (search && search.trim() !== '') {
      whereClauses.push(`(
        CONCAT(e.first_name, ' ', e.last_name) LIKE ? OR
        e.employee_code LIKE ? OR
        l.reason LIKE ?
      )`);
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total
       FROM leave_requests l
       JOIN employees e ON l.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    let querySql = `
      SELECT l.*,
             e.employee_code, e.first_name, e.last_name, e.email,
             e.designation, e.avatar_url, e.user_id as employee_user_id,
             d.name as department_name, d.code as department_code,
             u.email as reviewer_email,
             CONCAT(m.first_name, ' ', m.last_name) as manager_name
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON l.action_by = u.id
      LEFT JOIN employees m ON e.manager_id = m.id
      ${whereSql}
      ORDER BY
        CASE WHEN l.status = 'Pending' THEN 1 ELSE 2 END ASC,
        l.created_at DESC
    `;

    let leaves;
    if (all === 'true') {
      const [rows] = await pool.query(querySql, params);
      leaves = rows;
    } else {
      querySql += ` LIMIT ? OFFSET ?`;
      const [rows] = await pool.query(querySql, [...params, pageSize, offset]);
      leaves = rows;
    }

    return res.status(200).json({
      success: true,
      leaves,
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

// POST /api/leaves (Apply for leave)
export async function applyLeave(req, res, next) {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    const employeeId = req.user.employee_id;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'No associated employee profile found for leave application.'
      });
    }

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Leave type, start date, end date, and reason are required.'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date or end date format.'
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date.'
      });
    }

    // Calculate total days
    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check for overlapping pending/approved leaves
    const [overlap] = await pool.query(
      `SELECT id FROM leave_requests
       WHERE employee_id = ?
         AND status IN ('Pending', 'Approved')
         AND NOT (end_date < ? OR start_date > ?)
       LIMIT 1`,
      [employeeId, startDate, endDate]
    );

    if (overlap.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending or approved leave request overlapping these dates.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO leave_requests (
         employee_id, leave_type, start_date, end_date, total_days, reason, status
       ) VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
      [employeeId, leaveType, startDate, endDate, totalDays, reason.trim()]
    );

    const leaveId = result.insertId;

    await logActivity(req.user.id, 'Leave Applied', `Applied for ${totalDays} days of ${leaveType} (${startDate} to ${endDate})`, req);

    // Notify Admins, HRs and assigned manager
    const [empInfo] = await pool.query(
      `SELECT e.first_name, e.last_name, e.manager_id, m.user_id as manager_user_id
       FROM employees e
       LEFT JOIN employees m ON e.manager_id = m.id
       WHERE e.id = ?`,
      [employeeId]
    );

    const empName = `${empInfo[0]?.first_name || ''} ${empInfo[0]?.last_name || ''}`;

    if (empInfo[0]?.manager_user_id) {
      await createAndSendNotification({
        userId: empInfo[0].manager_user_id,
        title: 'New Leave Request',
        message: `${empName} applied for ${totalDays} day(s) of ${leaveType}.`,
        type: 'leave',
        link: '/leaves'
      });
    }

    // Also broadcast notification to HR & Admin
    const [adminHrUsers] = await pool.query(
      'SELECT id FROM users WHERE role_id IN (1, 2)'
    );
    for (const u of adminHrUsers) {
      if (u.id !== req.user.id && u.id !== empInfo[0]?.manager_user_id) {
        await createAndSendNotification({
          userId: u.id,
          title: 'New Leave Request',
          message: `${empName} applied for ${totalDays} day(s) of ${leaveType}.`,
          type: 'leave',
          link: '/leaves'
        });
      }
    }

    notifyLeaveStatusChange({
      leaveId,
      employeeId,
      status: 'Pending',
      employeeName: empName
    });

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully.',
      leaveId
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/leaves/:id/approve
export async function approveLeave(req, res, next) {
  try {
    const leaveId = parseInt(req.params.id, 10);
    const { remarks } = req.body;

    const [records] = await pool.query(
      `SELECT l.*, e.user_id as employee_user_id, e.first_name, e.last_name
       FROM leave_requests l
       JOIN employees e ON l.employee_id = e.id
       WHERE l.id = ? LIMIT 1`,
      [leaveId]
    );

    if (records.length === 0) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    const leave = records[0];

    await pool.query(
      `UPDATE leave_requests
       SET status = 'Approved',
           action_by = ?,
           action_remarks = ?,
           action_at = NOW()
       WHERE id = ?`,
      [req.user.id, remarks || 'Approved by management', leaveId]
    );

    await logActivity(req.user.id, 'Leave Approved', `Approved ${leave.leave_type} request for ${leave.first_name} ${leave.last_name}`, req);

    // Send real-time notification to employee
    if (leave.employee_user_id) {
      await createAndSendNotification({
        userId: leave.employee_user_id,
        title: 'Leave Request Approved',
        message: `Your ${leave.leave_type} from ${leave.start_date} to ${leave.end_date} has been Approved. Remarks: ${remarks || 'None'}`,
        type: 'success',
        link: '/leaves'
      });
    }

    notifyLeaveStatusChange(
      { leaveId, status: 'Approved', remarks: remarks || 'Approved' },
      leave.employee_user_id
    );

    return res.status(200).json({
      success: true,
      message: 'Leave request approved successfully.'
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/leaves/:id/reject
export async function rejectLeave(req, res, next) {
  try {
    const leaveId = parseInt(req.params.id, 10);
    const { remarks } = req.body;

    if (!remarks) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason or remarks for rejection.'
      });
    }

    const [records] = await pool.query(
      `SELECT l.*, e.user_id as employee_user_id, e.first_name, e.last_name
       FROM leave_requests l
       JOIN employees e ON l.employee_id = e.id
       WHERE l.id = ? LIMIT 1`,
      [leaveId]
    );

    if (records.length === 0) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    const leave = records[0];

    await pool.query(
      `UPDATE leave_requests
       SET status = 'Rejected',
           action_by = ?,
           action_remarks = ?,
           action_at = NOW()
       WHERE id = ?`,
      [req.user.id, remarks, leaveId]
    );

    await logActivity(req.user.id, 'Leave Rejected', `Rejected ${leave.leave_type} request for ${leave.first_name} ${leave.last_name}`, req);

    if (leave.employee_user_id) {
      await createAndSendNotification({
        userId: leave.employee_user_id,
        title: 'Leave Request Rejected',
        message: `Your ${leave.leave_type} from ${leave.start_date} to ${leave.end_date} was Rejected. Remarks: ${remarks}`,
        type: 'danger',
        link: '/leaves'
      });
    }

    notifyLeaveStatusChange(
      { leaveId, status: 'Rejected', remarks },
      leave.employee_user_id
    );

    return res.status(200).json({
      success: true,
      message: 'Leave request rejected.'
    });
  } catch (error) {
    next(error);
  }
}
