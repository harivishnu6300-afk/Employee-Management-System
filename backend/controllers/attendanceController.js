import pool from '../config/db.js';
import { logActivity } from '../utils/logger.js';
import { notifyAttendanceChange, createAndSendNotification } from '../services/socketService.js';

// GET /api/attendance (Company-wide with filters)
export async function getAllAttendance(req, res, next) {
  try {
    const {
      date = '',
      startDate = '',
      endDate = '',
      department = '',
      status = '',
      search = '',
      page = 1,
      limit = 20,
      all = false
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));
    const offset = (pageNum - 1) * pageSize;

    const whereClauses = [];
    const params = [];

    if (date) {
      whereClauses.push('a.date = ?');
      params.push(date);
    } else if (startDate && endDate) {
      whereClauses.push('a.date BETWEEN ? AND ?');
      params.push(startDate, endDate);
    } else if (!startDate && !endDate && !date) {
      // Default to today
      whereClauses.push('a.date = CURDATE()');
    }

    if (department) {
      whereClauses.push('e.department_id = ?');
      params.push(department);
    }

    if (status) {
      whereClauses.push('a.status = ?');
      params.push(status);
    }

    if (search && search.trim() !== '') {
      whereClauses.push(`(
        CONCAT(e.first_name, ' ', e.last_name) LIKE ? OR
        e.employee_code LIKE ? OR
        e.email LIKE ?
      )`);
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    // Role-based scoping for Manager: view team members
    if (req.user?.role_name?.toLowerCase() === 'manager' && req.query.teamOnly === 'true') {
      whereClauses.push('(e.manager_id = ? OR e.id = ?)');
      params.push(req.user.employee_id, req.user.employee_id);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    let querySql = `
      SELECT a.id, a.employee_id, a.date, a.check_in, a.check_out,
             a.working_hours, a.status, a.notes, a.created_at,
             e.employee_code, e.first_name, e.last_name, e.email,
             e.designation, e.avatar_url,
             d.name as department_name, d.code as department_code
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereSql}
      ORDER BY a.date DESC, a.check_in DESC
    `;

    let attendance;
    if (all === 'true') {
      const [rows] = await pool.query(querySql, params);
      attendance = rows;
    } else {
      querySql += ` LIMIT ? OFFSET ?`;
      const [rows] = await pool.query(querySql, [...params, pageSize, offset]);
      attendance = rows;
    }

    return res.status(200).json({
      success: true,
      attendance,
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

// GET /api/attendance/today
export async function getTodayAttendanceStatus(req, res, next) {
  try {
    const employeeId = req.user.employee_id;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'No employee record associated with this user.'
      });
    }

    const [records] = await pool.query(
      `SELECT * FROM attendance
       WHERE employee_id = ? AND date = CURDATE()
       LIMIT 1`,
      [employeeId]
    );

    const record = records.length > 0 ? records[0] : null;

    return res.status(200).json({
      success: true,
      attendance: record,
      isCheckedIn: !!(record && record.check_in),
      isCheckedOut: !!(record && record.check_out)
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/attendance/:employeeId
export async function getEmployeeAttendance(req, res, next) {
  try {
    const employeeId = parseInt(req.params.employeeId, 10);
    const { month, year, limit = 31 } = req.query;

    const whereClauses = ['a.employee_id = ?'];
    const params = [employeeId];

    if (month && year) {
      whereClauses.push('MONTH(a.date) = ? AND YEAR(a.date) = ?');
      params.push(month, year);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const [records] = await pool.query(
      `SELECT a.*,
              e.employee_code, e.first_name, e.last_name
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       ${whereSql}
       ORDER BY a.date DESC
       LIMIT ?`,
      [...params, parseInt(limit, 10)]
    );

    // Calculate monthly summary
    const [summaryRows] = await pool.query(
      `SELECT
         COUNT(CASE WHEN status = 'Present' THEN 1 END) as present_count,
         COUNT(CASE WHEN status = 'Late' THEN 1 END) as late_count,
         COUNT(CASE WHEN status = 'Half Day' THEN 1 END) as half_day_count,
         COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent_count,
         COUNT(CASE WHEN status = 'Leave' THEN 1 END) as leave_count,
         COALESCE(SUM(working_hours), 0) as total_working_hours,
         COALESCE(AVG(working_hours), 0) as avg_working_hours
       FROM attendance
       WHERE employee_id = ? AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())`,
      [employeeId]
    );

    return res.status(200).json({
      success: true,
      attendance: records,
      summary: summaryRows[0] || {}
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/attendance/check-in
export async function checkIn(req, res, next) {
  try {
    const employeeId = req.user.employee_id;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'No linked employee record found for check-in.'
      });
    }

    // Check if already checked in today
    const [existing] = await pool.query(
      'SELECT id, check_in, check_out FROM attendance WHERE employee_id = ? AND date = CURDATE() LIMIT 1',
      [employeeId]
    );

    if (existing.length > 0 && existing[0].check_in) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked in for today.'
      });
    }

    // Check system grace period
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Standard work start is 09:00 with 15 mins grace (9:15)
    let status = 'Present';
    if (hours > 9 || (hours === 9 && minutes > 15)) {
      status = 'Late';
    }

    let attendanceId;
    if (existing.length > 0) {
      await pool.query(
        `UPDATE attendance
         SET check_in = NOW(), status = ?, notes = ?
         WHERE id = ?`,
        [status, status === 'Late' ? 'Late check-in' : 'On-time check in', existing[0].id]
      );
      attendanceId = existing[0].id;
    } else {
      const [insertResult] = await pool.query(
        `INSERT INTO attendance (employee_id, date, check_in, status, notes)
         VALUES (?, CURDATE(), NOW(), ?, ?)`,
        [employeeId, status, status === 'Late' ? 'Late check-in' : 'On-time check-in']
      );
      attendanceId = insertResult.insertId;
    }

    // Fetch newly recorded attendance
    const [freshRecord] = await pool.query(
      `SELECT a.*, e.first_name, e.last_name, e.employee_code
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       WHERE a.id = ? LIMIT 1`,
      [attendanceId]
    );

    await logActivity(req.user.id, 'Attendance Check-In', `Employee ${req.user.first_name} checked in at ${now.toLocaleTimeString()}`, req);

    notifyAttendanceChange(freshRecord[0]);

    return res.status(200).json({
      success: true,
      message: `Checked in successfully as ${status}.`,
      attendance: freshRecord[0]
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/attendance/check-out
export async function checkOut(req, res, next) {
  try {
    const employeeId = req.user.employee_id;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'No linked employee profile found.'
      });
    }

    const [existing] = await pool.query(
      'SELECT id, check_in, check_out, status FROM attendance WHERE employee_id = ? AND date = CURDATE() LIMIT 1',
      [employeeId]
    );

    if (existing.length === 0 || !existing[0].check_in) {
      return res.status(400).json({
        success: false,
        message: 'Cannot check out. You have not checked in for today yet.'
      });
    }

    if (existing[0].check_out) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked out for today.'
      });
    }

    // Calculate working hours automatically
    // Update check_out and compute working_hours
    await pool.query(
      `UPDATE attendance
       SET check_out = NOW(),
           working_hours = ROUND(TIMESTAMPDIFF(SECOND, check_in, NOW()) / 3600, 2),
           status = CASE
             WHEN TIMESTAMPDIFF(SECOND, check_in, NOW()) < (4 * 3600) THEN 'Half Day'
             ELSE status
           END
       WHERE id = ?`,
      [existing[0].id]
    );

    const [updated] = await pool.query(
      `SELECT a.*, e.first_name, e.last_name, e.employee_code
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       WHERE a.id = ? LIMIT 1`,
      [existing[0].id]
    );

    await logActivity(req.user.id, 'Attendance Check-Out', `Employee ${req.user.first_name} checked out with ${updated[0].working_hours} hours logged`, req);

    notifyAttendanceChange(updated[0]);

    return res.status(200).json({
      success: true,
      message: `Checked out successfully. Logged ${updated[0].working_hours} working hours.`,
      attendance: updated[0]
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/attendance/manual (Admin/HR manual mark/edit)
export async function manualAttendance(req, res, next) {
  try {
    const { employeeId, date, checkIn, checkOut, status, notes } = req.body;

    if (!employeeId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: 'Employee, date, and status are required fields.'
      });
    }

    let workingHours = 0.00;
    if (checkIn && checkOut) {
      const diffMs = new Date(checkOut) - new Date(checkIn);
      if (diffMs > 0) {
        workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      }
    } else if (status === 'Present') {
      workingHours = 8.00;
    } else if (status === 'Half Day') {
      workingHours = 4.00;
    }

    // Insert or update on duplicate
    await pool.query(
      `INSERT INTO attendance (employee_id, date, check_in, check_out, working_hours, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         check_in = VALUES(check_in),
         check_out = VALUES(check_out),
         working_hours = VALUES(working_hours),
         status = VALUES(status),
         notes = VALUES(notes)`,
      [employeeId, date, checkIn || null, checkOut || null, workingHours, status, notes || 'Manual record adjustment']
    );

    await logActivity(req.user.id, 'Attendance Manually Updated', `Adjusted attendance for employee ${employeeId} on ${date}`, req);

    return res.status(200).json({
      success: true,
      message: 'Attendance record saved successfully.'
    });
  } catch (error) {
    next(error);
  }
}
