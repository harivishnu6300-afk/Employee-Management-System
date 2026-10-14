import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { logActivity } from '../utils/logger.js';
import { createAndSendNotification, notifyDashboardStatsUpdate } from '../services/socketService.js';

// GET /api/employees
export async function getAllEmployees(req, res, next) {
  try {
    const {
      search = '',
      department = '',
      designation = '',
      role = '',
      employmentType = '',
      status = '',
      sortBy = 'e.id',
      sortOrder = 'DESC',
      page = 1,
      limit = 10,
      all = false
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));
    const offset = (pageNum - 1) * pageSize;

    const whereClauses = [];
    const params = [];

    // Search by name, code, email, phone
    if (search && search.trim() !== '') {
      whereClauses.push(`(
        CONCAT(e.first_name, ' ', e.last_name) LIKE ? OR
        e.employee_code LIKE ? OR
        e.email LIKE ? OR
        e.phone LIKE ?
      )`);
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (department) {
      whereClauses.push('e.department_id = ?');
      params.push(department);
    }

    if (designation) {
      whereClauses.push('e.designation LIKE ?');
      params.push(`%${designation}%`);
    }

    if (role) {
      whereClauses.push('e.role_id = ?');
      params.push(role);
    }

    if (employmentType) {
      whereClauses.push('e.employment_type = ?');
      params.push(employmentType);
    }

    if (status) {
      whereClauses.push('e.status = ?');
      params.push(status);
    }

    // Role-based scoping: Manager viewing team
    if (req.user?.role_name?.toLowerCase() === 'manager' && req.query.teamOnly === 'true') {
      whereClauses.push('(e.manager_id = ? OR e.id = ?)');
      params.push(req.user.employee_id, req.user.employee_id);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Allowed sort columns
    const allowedSortCols = {
      id: 'e.id',
      name: 'e.first_name',
      employee_code: 'e.employee_code',
      email: 'e.email',
      department: 'd.name',
      designation: 'e.designation',
      joining_date: 'e.joining_date',
      salary: 'e.salary',
      status: 'e.status'
    };

    const cleanSortCol = allowedSortCols[sortBy] || 'e.id';
    const cleanSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count query
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    let querySql = `
      SELECT e.id, e.user_id, e.employee_code, e.first_name, e.last_name,
             e.email, e.phone, e.date_of_birth, e.gender, e.address, e.city, e.state,
             e.emergency_contact, e.department_id, e.designation, e.role_id,
             e.joining_date, e.salary, e.employment_type, e.status, e.manager_id,
             e.avatar_url, e.created_at,
             d.name as department_name, d.code as department_code,
             r.name as role_name,
             CONCAT(m.first_name, ' ', m.last_name) as manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      JOIN roles r ON e.role_id = r.id
      LEFT JOIN employees m ON e.manager_id = m.id
      ${whereSql}
      ORDER BY ${cleanSortCol} ${cleanSortOrder}
    `;

    let employees;
    if (all === 'true') {
      const [rows] = await pool.query(querySql, params);
      employees = rows;
    } else {
      querySql += ` LIMIT ? OFFSET ?`;
      const [rows] = await pool.query(querySql, [...params, pageSize, offset]);
      employees = rows;
    }

    return res.status(200).json({
      success: true,
      employees,
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

// GET /api/employees/:id
export async function getEmployeeById(req, res, next) {
  try {
    const employeeId = parseInt(req.params.id, 10);

    const [employees] = await pool.query(
      `SELECT e.*,
              d.name as department_name, d.code as department_code,
              r.name as role_name,
              CONCAT(m.first_name, ' ', m.last_name) as manager_name,
              u.last_login_at, u.is_active as user_active
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       JOIN roles r ON e.role_id = r.id
       LEFT JOIN employees m ON e.manager_id = m.id
       LEFT JOIN users u ON e.user_id = u.id
       WHERE e.id = ? LIMIT 1`,
      [employeeId]
    );

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found.'
      });
    }

    const employee = employees[0];

    // Fetch employee's recent attendance (last 30 records)
    const [attendance] = await pool.query(
      `SELECT id, date, check_in, check_out, working_hours, status, notes
       FROM attendance
       WHERE employee_id = ?
       ORDER BY date DESC LIMIT 30`,
      [employeeId]
    );

    // Fetch employee's leave requests
    const [leaves] = await pool.query(
      `SELECT l.*, CONCAT(u.email) as action_by_email
       FROM leave_requests l
       LEFT JOIN users u ON l.action_by = u.id
       WHERE l.employee_id = ?
       ORDER BY l.created_at DESC LIMIT 20`,
      [employeeId]
    );

    // Fetch employee's activity logs (if linked user)
    let logs = [];
    if (employee.user_id) {
      const [activityRows] = await pool.query(
        `SELECT id, action, details, ip_address, created_at
         FROM activity_logs
         WHERE user_id = ?
         ORDER BY created_at DESC LIMIT 15`,
        [employee.user_id]
      );
      logs = activityRows;
    }

    // Leave balance statistics
    const [leaveStats] = await pool.query(
      `SELECT
         COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_leaves,
         COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_leaves,
         COALESCE(SUM(CASE WHEN status = 'Approved' THEN total_days ELSE 0 END), 0) as total_days_taken
       FROM leave_requests
       WHERE employee_id = ? AND YEAR(start_date) = YEAR(CURDATE())`,
      [employeeId]
    );

    // Attendance statistics
    const [attStats] = await pool.query(
      `SELECT
         COUNT(CASE WHEN status = 'Present' THEN 1 END) as present_days,
         COUNT(CASE WHEN status = 'Late' THEN 1 END) as late_days,
         COUNT(CASE WHEN status = 'Half Day' THEN 1 END) as half_days,
         COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent_days
       FROM attendance
       WHERE employee_id = ? AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())`,
      [employeeId]
    );

    return res.status(200).json({
      success: true,
      employee,
      attendance,
      leaves,
      activityLogs: logs,
      stats: {
        leave: leaveStats[0] || {},
        attendance: attStats[0] || {}
      }
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/employees
export async function createEmployee(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender = 'Male',
      address,
      city,
      state,
      emergencyContact,
      departmentId,
      designation,
      roleId = 4,
      joiningDate,
      salary = 0,
      employmentType = 'Full-Time',
      managerId,
      createAccount = true,
      initialPassword = 'Employee@123'
    } = req.body;

    if (!firstName || !lastName || !email || !designation || !joiningDate) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, designation, and joining date are required.'
      });
    }

    await connection.beginTransaction();

    // Check duplicate email
    const [existing] = await connection.query(
      'SELECT id FROM employees WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'An employee with this email address already exists.'
      });
    }

    let userId = null;
    if (createAccount) {
      // Check duplicate user email
      const [existingUser] = await connection.query(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [email.trim().toLowerCase()]
      );

      if (existingUser.length > 0) {
        userId = existingUser[0].id;
      } else {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(initialPassword || 'Employee@123', salt);
        const [userResult] = await connection.query(
          `INSERT INTO users (email, password_hash, role_id, is_active)
           VALUES (?, ?, ?, 1)`,
          [email.trim().toLowerCase(), passwordHash, roleId]
        );
        userId = userResult.insertId;
      }
    }

    // Generate unique employee code
    const [lastEmp] = await connection.query(
      'SELECT id FROM employees ORDER BY id DESC LIMIT 1'
    );
    const nextNum = (lastEmp[0]?.id || 0) + 1001;
    const employeeCode = `EMP-${nextNum}`;

    const [empResult] = await connection.query(
      `INSERT INTO employees (
         user_id, employee_code, first_name, last_name, email, phone,
         date_of_birth, gender, address, city, state, emergency_contact,
         department_id, designation, role_id, joining_date, salary,
         employment_type, status, manager_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)`,
      [
        userId,
        employeeCode,
        firstName.trim(),
        lastName.trim(),
        email.trim().toLowerCase(),
        phone || null,
        dateOfBirth || null,
        gender,
        address || null,
        city || null,
        state || null,
        emergencyContact || null,
        departmentId || null,
        designation.trim(),
        roleId,
        joiningDate,
        parseFloat(salary) || 0.00,
        employmentType,
        managerId || null
      ]
    );

    const newEmployeeId = empResult.insertId;

    await connection.commit();

    await logActivity(req.user?.id, 'Employee Created', `Created employee ${firstName} ${lastName} (${employeeCode})`, req);

    await createAndSendNotification({
      userId: userId,
      title: 'Welcome to the Team!',
      message: `Your employee profile has been created with code ${employeeCode}. Welcome aboard!`,
      type: 'success',
      link: '/profile'
    });

    notifyDashboardStatsUpdate();

    return res.status(201).json({
      success: true,
      message: 'Employee added successfully.',
      employeeId: newEmployeeId,
      employeeCode
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

// PUT /api/employees/:id
export async function updateEmployee(req, res, next) {
  try {
    const employeeId = parseInt(req.params.id, 10);
    const userRole = (req.user?.role_name || '').toLowerCase();
    const isSelf = req.user?.employee_id === employeeId;
    const isElevated = userRole === 'admin' || userRole === 'hr';

    const [existing] = await pool.query(
      'SELECT * FROM employees WHERE id = ? LIMIT 1',
      [employeeId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const current = existing[0];
    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      address,
      city,
      state,
      emergencyContact,
      departmentId,
      designation,
      roleId,
      joiningDate,
      salary,
      employmentType,
      status,
      managerId
    } = req.body;

    // Fields employee can update on themselves
    let updateFields = {
      phone: phone !== undefined ? phone : current.phone,
      date_of_birth: dateOfBirth !== undefined ? dateOfBirth : current.date_of_birth,
      gender: gender !== undefined ? gender : current.gender,
      address: address !== undefined ? address : current.address,
      city: city !== undefined ? city : current.city,
      state: state !== undefined ? state : current.state,
      emergency_contact: emergencyContact !== undefined ? emergencyContact : current.emergency_contact
    };

    // Sensitive fields restricted to Admin/HR
    if (isElevated) {
      updateFields = {
        ...updateFields,
        first_name: firstName !== undefined ? firstName.trim() : current.first_name,
        last_name: lastName !== undefined ? lastName.trim() : current.last_name,
        department_id: departmentId !== undefined ? departmentId : current.department_id,
        designation: designation !== undefined ? designation.trim() : current.designation,
        role_id: roleId !== undefined ? roleId : current.role_id,
        joining_date: joiningDate !== undefined ? joiningDate : current.joining_date,
        salary: salary !== undefined ? parseFloat(salary) : current.salary,
        employment_type: employmentType !== undefined ? employmentType : current.employment_type,
        status: status !== undefined ? status : current.status,
        manager_id: managerId !== undefined ? managerId : current.manager_id
      };
    } else if (isSelf) {
      // Self can update first name and last name
      if (firstName) updateFields.first_name = firstName.trim();
      if (lastName) updateFields.last_name = lastName.trim();
    }

    const sets = Object.keys(updateFields).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updateFields), employeeId];

    await pool.query(`UPDATE employees SET ${sets} WHERE id = ?`, values);

    // If role changed and user exists, update user table role_id too
    if (isElevated && roleId && current.user_id) {
      await pool.query('UPDATE users SET role_id = ? WHERE id = ?', [roleId, current.user_id]);
    }

    // If status changed to Inactive or Terminated, deactivate user account
    if (isElevated && status && current.user_id) {
      const isAccountActive = status === 'Active' || status === 'On Leave' ? 1 : 0;
      await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [isAccountActive, current.user_id]);
    }

    await logActivity(req.user?.id, 'Employee Updated', `Updated details for employee ${current.employee_code}`, req);

    notifyDashboardStatsUpdate();

    return res.status(200).json({
      success: true,
      message: 'Employee updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/employees/:id
export async function deleteEmployee(req, res, next) {
  try {
    const employeeId = parseInt(req.params.id, 10);
    const { permanent = false } = req.query;

    const [existing] = await pool.query(
      'SELECT id, employee_code, first_name, last_name, user_id FROM employees WHERE id = ? LIMIT 1',
      [employeeId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const emp = existing[0];

    if (permanent === 'true') {
      // Permanent removal
      await pool.query('DELETE FROM employees WHERE id = ?', [employeeId]);
      if (emp.user_id) {
        await pool.query('DELETE FROM users WHERE id = ?', [emp.user_id]);
      }
      await logActivity(req.user?.id, 'Employee Deleted', `Permanently deleted employee ${emp.employee_code}`, req);
    } else {
      // Soft deactivate
      await pool.query("UPDATE employees SET status = 'Inactive' WHERE id = ?", [employeeId]);
      if (emp.user_id) {
        await pool.query('UPDATE users SET is_active = 0 WHERE id = ?', [emp.user_id]);
      }
      await logActivity(req.user?.id, 'Employee Deactivated', `Deactivated employee ${emp.employee_code}`, req);
    }

    notifyDashboardStatsUpdate();

    return res.status(200).json({
      success: true,
      message: permanent === 'true' ? 'Employee permanently deleted.' : 'Employee marked as inactive.'
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/employees/:id/avatar
export async function uploadEmployeeAvatar(req, res, next) {
  try {
    const employeeId = parseInt(req.params.id, 10);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded.' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    await pool.query('UPDATE employees SET avatar_url = ? WHERE id = ?', [avatarUrl, employeeId]);

    await logActivity(req.user?.id, 'Avatar Uploaded', `Uploaded avatar for employee ID ${employeeId}`, req);

    return res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully.',
      avatarUrl
    });
  } catch (error) {
    next(error);
  }
}
