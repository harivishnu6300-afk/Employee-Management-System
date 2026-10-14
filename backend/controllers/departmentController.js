import pool from '../config/db.js';
import { logActivity } from '../utils/logger.js';
import { notifyDashboardStatsUpdate } from '../services/socketService.js';

// GET /api/departments
export async function getAllDepartments(req, res, next) {
  try {
    const [departments] = await pool.query(`
      SELECT d.id, d.name, d.code, d.description, d.status, d.created_at,
             COUNT(e.id) as employee_count,
             COALESCE(SUM(CASE WHEN e.status = 'Active' THEN 1 ELSE 0 END), 0) as active_employee_count
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id
      GROUP BY d.id
      ORDER BY d.name ASC
    `);

    return res.status(200).json({
      success: true,
      departments
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/departments/:id
export async function getDepartmentById(req, res, next) {
  try {
    const deptId = parseInt(req.params.id, 10);

    const [departments] = await pool.query(
      'SELECT * FROM departments WHERE id = ? LIMIT 1',
      [deptId]
    );

    if (departments.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const [employees] = await pool.query(
      `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email,
              e.designation, e.status, e.avatar_url, r.name as role_name
       FROM employees e
       JOIN roles r ON e.role_id = r.id
       WHERE e.department_id = ?
       ORDER BY e.first_name ASC`,
      [deptId]
    );

    return res.status(200).json({
      success: true,
      department: departments[0],
      employees
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/departments
export async function createDepartment(req, res, next) {
  try {
    const { name, code, description, status = 'Active' } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Department name and unique code are required.'
      });
    }

    const [existing] = await pool.query(
      'SELECT id FROM departments WHERE name = ? OR code = ? LIMIT 1',
      [name.trim(), code.trim().toUpperCase()]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A department with this name or code already exists.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO departments (name, code, description, status)
       VALUES (?, ?, ?, ?)`,
      [name.trim(), code.trim().toUpperCase(), description || null, status]
    );

    await logActivity(req.user?.id, 'Department Created', `Created department ${name} (${code})`, req);
    notifyDashboardStatsUpdate();

    return res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      departmentId: result.insertId
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/departments/:id
export async function updateDepartment(req, res, next) {
  try {
    const deptId = parseInt(req.params.id, 10);
    const { name, code, description, status } = req.body;

    const [existing] = await pool.query(
      'SELECT * FROM departments WHERE id = ? LIMIT 1',
      [deptId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    if (name || code) {
      const [duplicate] = await pool.query(
        'SELECT id FROM departments WHERE (name = ? OR code = ?) AND id != ? LIMIT 1',
        [name ? name.trim() : existing[0].name, code ? code.trim().toUpperCase() : existing[0].code, deptId]
      );
      if (duplicate.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Another department with this name or code already exists.'
        });
      }
    }

    await pool.query(
      `UPDATE departments
       SET name = COALESCE(?, name),
           code = COALESCE(?, code),
           description = COALESCE(?, description),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        code ? code.trim().toUpperCase() : null,
        description !== undefined ? description : null,
        status || null,
        deptId
      ]
    );

    await logActivity(req.user?.id, 'Department Updated', `Updated department ID ${deptId}`, req);
    notifyDashboardStatsUpdate();

    return res.status(200).json({
      success: true,
      message: 'Department updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/departments/:id
export async function deleteDepartment(req, res, next) {
  try {
    const deptId = parseInt(req.params.id, 10);

    // Rule: Check if any employees are assigned to this department
    const [assigned] = await pool.query(
      'SELECT COUNT(*) as count FROM employees WHERE department_id = ?',
      [deptId]
    );

    if (assigned[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department: ${assigned[0].count} employee(s) are currently assigned to it. Please reassign them first.`
      });
    }

    await pool.query('DELETE FROM departments WHERE id = ?', [deptId]);

    await logActivity(req.user?.id, 'Department Deleted', `Deleted department ID ${deptId}`, req);
    notifyDashboardStatsUpdate();

    return res.status(200).json({
      success: true,
      message: 'Department deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}
