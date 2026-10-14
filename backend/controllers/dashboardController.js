import pool from '../config/db.js';

// GET /api/dashboard/stats
export async function getDashboardStats(req, res, next) {
  try {
    const userRole = (req.user?.role_name || '').toLowerCase();
    const isEmployee = userRole === 'employee';
    const employeeId = req.user?.employee_id;

    // 1. Overall Employee Statistics
    const [employeeCounts] = await pool.query(`
      SELECT
        COUNT(*) as total_employees,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_employees,
        COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_employees,
        COUNT(CASE WHEN status = 'On Leave' THEN 1 END) as on_leave_employees,
        COUNT(CASE WHEN joining_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as new_employees_month
      FROM employees
    `);

    // 2. Today's Attendance Overview
    const [todayAttendance] = await pool.query(`
      SELECT
        COUNT(CASE WHEN status = 'Present' THEN 1 END) as present_today,
        COUNT(CASE WHEN status = 'Late' THEN 1 END) as late_today,
        COUNT(CASE WHEN status = 'Half Day' THEN 1 END) as half_day_today,
        COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent_today,
        COUNT(CASE WHEN status = 'Leave' THEN 1 END) as on_leave_today
      FROM attendance
      WHERE date = CURDATE()
    `);

    // Calculate inferred absent employees (Active employees who haven't checked in today and not on leave)
    const activeTotal = employeeCounts[0].active_employees || 0;
    const checkedInToday = (todayAttendance[0].present_today || 0) + (todayAttendance[0].late_today || 0) + (todayAttendance[0].half_day_today || 0);
    const absentInferred = Math.max(0, activeTotal - checkedInToday - (employeeCounts[0].on_leave_employees || 0));

    // 3. Leave Requests Statistics
    const [leaveStats] = await pool.query(`
      SELECT
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_leaves,
        COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_leaves,
        COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_leaves,
        COUNT(*) as total_leave_requests
      FROM leave_requests
    `);

    // 4. Department Distribution (Chart 1)
    const [departmentStats] = await pool.query(`
      SELECT d.name as department_name, d.code as department_code,
             COUNT(e.id) as employee_count
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'Active'
      GROUP BY d.id
      ORDER BY employee_count DESC
    `);

    // 5. Attendance Trend for past 7 days (Chart 2)
    const [attendanceTrend] = await pool.query(`
      SELECT
        a.date,
        DATE_FORMAT(a.date, '%a %d') as formatted_date,
        COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'Late' THEN 1 END) as late,
        COUNT(CASE WHEN a.status = 'Half Day' THEN 1 END) as half_day,
        COUNT(CASE WHEN a.status = 'Leave' THEN 1 END) as leave_count
      FROM attendance a
      WHERE a.date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY a.date
      ORDER BY a.date ASC
    `);

    // 6. Monthly Employee Growth (Chart 3)
    const [monthlyGrowth] = await pool.query(`
      SELECT
        DATE_FORMAT(joining_date, '%b %Y') as month_label,
        DATE_FORMAT(joining_date, '%Y-%m') as period_ym,
        COUNT(*) as joined_count
      FROM employees
      WHERE joining_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY period_ym, month_label
      ORDER BY period_ym ASC
    `);

    // 7. Recent Activities (Admin & HR)
    const [recentActivities] = await pool.query(`
      SELECT l.id, l.action, l.details, l.created_at,
             u.email, CONCAT(e.first_name, ' ', e.last_name) as user_name
      FROM activity_logs l
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN employees e ON e.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 6
    `);

    // 8. Recent Leave Applications
    const [recentLeaves] = await pool.query(`
      SELECT l.*,
             e.first_name, e.last_name, e.employee_code, e.avatar_url,
             d.name as department_name
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY l.created_at DESC
      LIMIT 5
    `);

    // Employee personal metrics if logged in as Employee
    let myMetrics = null;
    if (isEmployee && employeeId) {
      const [todayMyAtt] = await pool.query(
        'SELECT * FROM attendance WHERE employee_id = ? AND date = CURDATE() LIMIT 1',
        [employeeId]
      );
      const [myLeaveSummary] = await pool.query(`
        SELECT
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved,
          COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected,
          COALESCE(SUM(CASE WHEN status = 'Approved' THEN total_days ELSE 0 END), 0) as days_taken
        FROM leave_requests
        WHERE employee_id = ? AND YEAR(start_date) = YEAR(CURDATE())
      `, [employeeId]);

      myMetrics = {
        todayAttendance: todayMyAtt[0] || null,
        leaveSummary: { ...(myLeaveSummary[0] || {}), allowance_days: Number(process.env.LEAVE_ALLOWANCE_DAYS || 24) }
      };
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalEmployees: employeeCounts[0].total_employees || 0,
        activeEmployees: activeTotal,
        inactiveEmployees: employeeCounts[0].inactive_employees || 0,
        onLeaveEmployees: employeeCounts[0].on_leave_employees || 0,
        presentToday: todayAttendance[0].present_today || 0,
        lateToday: todayAttendance[0].late_today || 0,
        absentToday: absentInferred,
        pendingLeaves: leaveStats[0].pending_leaves || 0,
        approvedLeaves: leaveStats[0].approved_leaves || 0,
        newEmployeesMonth: employeeCounts[0].new_employees_month || 0
      },
      charts: {
        departmentDistribution: departmentStats,
        attendanceTrend,
        monthlyGrowth,
        leaveStats: [
          { status: 'Approved', count: leaveStats[0].approved_leaves || 0 },
          { status: 'Pending', count: leaveStats[0].pending_leaves || 0 },
          { status: 'Rejected', count: leaveStats[0].rejected_leaves || 0 }
        ]
      },
      recentActivities,
      recentLeaves,
      myMetrics
    });
  } catch (error) {
    next(error);
  }
}
