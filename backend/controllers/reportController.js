import pool from '../config/db.js';

// Helper to convert array of objects to CSV string
function convertToCSV(data, headers) {
  if (!data || data.length === 0) return '';
  const headerKeys = Object.keys(headers);
  const headerLabels = Object.values(headers);

  const lines = [headerLabels.map(l => `"${String(l).replace(/"/g, '""')}"`).join(',')];

  for (const row of data) {
    const values = headerKeys.map(k => {
      let val = row[k];
      if (val === null || val === undefined) val = '';
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

// GET /api/reports/employees
export async function getEmployeeReport(req, res, next) {
  try {
    const { department, status, employmentType, startDate, endDate, format } = req.query;

    const whereClauses = [];
    const params = [];

    if (department) {
      whereClauses.push('e.department_id = ?');
      params.push(department);
    }
    if (status) {
      whereClauses.push('e.status = ?');
      params.push(status);
    }
    if (employmentType) {
      whereClauses.push('e.employment_type = ?');
      params.push(employmentType);
    }
    if (startDate && endDate) {
      whereClauses.push('e.joining_date BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [rows] = await pool.query(`
      SELECT e.employee_code, CONCAT(e.first_name, ' ', e.last_name) as full_name,
             e.email, e.phone, d.name as department, e.designation,
             r.name as role, e.employment_type, e.joining_date, e.salary, e.status,
             CONCAT(m.first_name, ' ', m.last_name) as manager
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      JOIN roles r ON e.role_id = r.id
      LEFT JOIN employees m ON e.manager_id = m.id
      ${whereSql}
      ORDER BY e.joining_date DESC
    `, params);

    if (format === 'csv') {
      const csv = convertToCSV(rows, {
        employee_code: 'Employee ID',
        full_name: 'Full Name',
        email: 'Email',
        phone: 'Phone',
        department: 'Department',
        designation: 'Designation',
        role: 'Role',
        employment_type: 'Employment Type',
        joining_date: 'Joining Date',
        salary: 'Salary ($)',
        status: 'Status',
        manager: 'Manager'
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="employee_report.csv"');
      return res.status(200).send(csv);
    }

    return res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    next(error);
  }
}

// GET /api/reports/attendance
export async function getAttendanceReport(req, res, next) {
  try {
    const { startDate, endDate, department, status, format } = req.query;

    const whereClauses = [];
    const params = [];

    if (startDate && endDate) {
      whereClauses.push('a.date BETWEEN ? AND ?');
      params.push(startDate, endDate);
    } else {
      whereClauses.push('a.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)');
    }

    if (department) {
      whereClauses.push('e.department_id = ?');
      params.push(department);
    }
    if (status) {
      whereClauses.push('a.status = ?');
      params.push(status);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const [rows] = await pool.query(`
      SELECT a.date, e.employee_code, CONCAT(e.first_name, ' ', e.last_name) as full_name,
             d.name as department, e.designation,
             DATE_FORMAT(a.check_in, '%H:%i:%s') as check_in_time,
             DATE_FORMAT(a.check_out, '%H:%i:%s') as check_out_time,
             a.working_hours, a.status, a.notes
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereSql}
      ORDER BY a.date DESC, a.check_in ASC
    `, params);

    if (format === 'csv') {
      const csv = convertToCSV(rows, {
        date: 'Date',
        employee_code: 'Employee ID',
        full_name: 'Employee Name',
        department: 'Department',
        designation: 'Designation',
        check_in_time: 'Check In',
        check_out_time: 'Check Out',
        working_hours: 'Hours Worked',
        status: 'Status',
        notes: 'Notes'
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="attendance_report.csv"');
      return res.status(200).send(csv);
    }

    return res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    next(error);
  }
}

// GET /api/reports/leaves
export async function getLeaveReport(req, res, next) {
  try {
    const { startDate, endDate, leaveType, status, department, format } = req.query;

    const whereClauses = [];
    const params = [];

    if (startDate && endDate) {
      whereClauses.push('l.start_date >= ? AND l.end_date <= ?');
      params.push(startDate, endDate);
    }

    if (leaveType) {
      whereClauses.push('l.leave_type = ?');
      params.push(leaveType);
    }

    if (status) {
      whereClauses.push('l.status = ?');
      params.push(status);
    }

    if (department) {
      whereClauses.push('e.department_id = ?');
      params.push(department);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [rows] = await pool.query(`
      SELECT e.employee_code, CONCAT(e.first_name, ' ', e.last_name) as full_name,
             d.name as department, l.leave_type, l.start_date, l.end_date,
             l.total_days, l.reason, l.status,
             u.email as reviewer, l.action_remarks, l.action_at
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON l.action_by = u.id
      ${whereSql}
      ORDER BY l.created_at DESC
    `, params);

    if (format === 'csv') {
      const csv = convertToCSV(rows, {
        employee_code: 'Employee ID',
        full_name: 'Employee Name',
        department: 'Department',
        leave_type: 'Leave Type',
        start_date: 'Start Date',
        end_date: 'End Date',
        total_days: 'Days',
        reason: 'Reason',
        status: 'Status',
        reviewer: 'Reviewed By',
        action_remarks: 'Remarks',
        action_at: 'Review Date'
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="leave_report.csv"');
      return res.status(200).send(csv);
    }

    return res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    next(error);
  }
}

// GET /api/reports/departments
export async function getDepartmentReport(req, res, next) {
  try {
    const { format } = req.query;

    const [rows] = await pool.query(`
      SELECT d.code, d.name, d.status,
             COUNT(e.id) as total_employees,
             COALESCE(SUM(CASE WHEN e.status = 'Active' THEN 1 ELSE 0 END), 0) as active_employees,
             COALESCE(SUM(e.salary), 0) as total_monthly_payroll,
             COALESCE(AVG(e.salary), 0) as avg_salary
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id
      GROUP BY d.id
      ORDER BY total_employees DESC
    `);

    if (format === 'csv') {
      const csv = convertToCSV(rows, {
        code: 'Code',
        name: 'Department Name',
        status: 'Status',
        total_employees: 'Total Staff',
        active_employees: 'Active Staff',
        total_monthly_payroll: 'Total Payroll ($)',
        avg_salary: 'Average Salary ($)'
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="department_report.csv"');
      return res.status(200).send(csv);
    }

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}
