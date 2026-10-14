
const BASE_URL = 'http://localhost:5000/api';

async function runTestSuite() {
  console.log('====================================================');
  console.log('>>> STARTING FULL SYSTEM E2E VERIFICATION TEST');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extra = '') {
    if (condition) {
      console.log(`[PASS] ${testName} ${extra}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${extra}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const healthRes = await globalThis.fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    assert(health.status === 'online', '1. System Health Check');

    // 2. Register flow
    const testEmail = `test.user.${Date.now()}@company.com`;
    const registerRes = await globalThis.fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Jordan Miller',
        email: testEmail,
        phone: '+1 (555) 999-1234',
        password: 'Password@123',
        confirmPassword: 'Password@123',
        role: 'Employee',
        termsAccepted: true
      })
    });
    const regData = await registerRes.json();
    assert(regData.success === true, '2. Register New User & Employee', `Email: ${testEmail}`);
    const registeredToken = regData.token;
    const registeredUser = regData.user;

    // 3. Login with registered user
    const loginRes = await globalThis.fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password@123'
      })
    });
    const loginData = await loginRes.json();
    assert(loginData.success === true && !!loginData.token, '3. Login Authenticated', `Role: ${loginData.user?.role_name}`);

    // 4. Dashboard Stats API
    const dashRes = await globalThis.fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${registeredToken}` }
    });
    const dashData = await dashRes.json();
    assert(dashData.success === true && dashData.stats?.totalEmployees > 0, '4. Dashboard Real Stats', `Total: ${dashData.stats?.totalEmployees}`);

    // 5. Admin Login
    const adminLoginRes = await globalThis.fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@company.com',
        password: 'Admin@123'
      })
    });
    const adminLogin = await adminLoginRes.json();
    assert(adminLogin.success === true, '5. Admin Login (admin@company.com)');
    const adminToken = adminLogin.token;

    // 6. Admin Adds New Employee
    const newEmpEmail = `clara.oswald.${Date.now()}@company.com`;
    const addEmpRes = await globalThis.fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        firstName: 'Clara',
        lastName: 'Oswald',
        email: newEmpEmail,
        phone: '+1 (555) 777-8888',
        departmentId: 1,
        designation: 'Senior Cloud Architect',
        roleId: 4,
        joiningDate: '2026-03-01',
        salary: 110000,
        employmentType: 'Full-Time'
      })
    });
    const addEmpData = await addEmpRes.json();
    assert(addEmpData.success === true && !!addEmpData.employeeId, '6. Admin Creates Employee', `ID: ${addEmpData.employeeId}, Code: ${addEmpData.employeeCode}`);
    const createdEmpId = addEmpData.employeeId;

    // 7. View Employee Profile
    const viewEmpRes = await globalThis.fetch(`${BASE_URL}/employees/${createdEmpId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const viewEmpData = await viewEmpRes.json();
    assert(viewEmpData.success === true && viewEmpData.employee?.first_name === 'Clara', '7. View Employee Profile Record');

    // 8. Edit Employee Details
    const editEmpRes = await globalThis.fetch(`${BASE_URL}/employees/${createdEmpId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        designation: 'Principal Cloud & Security Architect',
        salary: 125000,
        city: 'San Francisco'
      })
    });
    const editEmpData = await editEmpRes.json();
    assert(editEmpData.success === true, '8. Edit Employee Profile (Admin)');

    // 9. Attendance Check-In (with registered user)
    const checkInRes = await globalThis.fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${registeredToken}` }
    });
    const checkInData = await checkInRes.json();
    assert(checkInData.success === true, '9. Employee Check-In Recorded', `Status: ${checkInData.attendance?.status}`);

    // Test duplicate check-in prevention
    const dupCheckInRes = await globalThis.fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${registeredToken}` }
    });
    const dupCheckInData = await dupCheckInRes.json();
    assert(dupCheckInData.success === false, '9b. Duplicate Check-In Prevented', `Msg: ${dupCheckInData.message}`);

    // 10. Attendance Check-Out
    const checkOutRes = await globalThis.fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${registeredToken}` }
    });
    const checkOutData = await checkOutRes.json();
    assert(checkOutData.success === true, '10. Employee Check-Out & Working Hours Calculation', `Hours: ${checkOutData.attendance?.working_hours}`);

    // 11. Apply for Leave
    const leaveRes = await globalThis.fetch(`${BASE_URL}/leaves`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${registeredToken}`
      },
      body: JSON.stringify({
        leaveType: 'Casual Leave',
        startDate: '2026-10-15',
        endDate: '2026-10-17',
        reason: 'Attending annual tech conference'
      })
    });
    const leaveData = await leaveRes.json();
    assert(leaveData.success === true && !!leaveData.leaveId, '11. Apply for Leave', `Leave ID: ${leaveData.leaveId}`);
    const leaveId = leaveData.leaveId;

    // 12. Approve Leave Request (Admin)
    const approveRes = await globalThis.fetch(`${BASE_URL}/leaves/${leaveId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ remarks: 'Approved. Enjoy the conference!' })
    });
    const approveData = await approveRes.json();
    assert(approveData.success === true, '12. Management Leave Approval & Remarks');

    // 13. Verify Real Notifications Received
    const notifRes = await globalThis.fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${registeredToken}` }
    });
    const notifData = await notifRes.json();
    assert(notifData.success === true && notifData.notifications?.length > 0, '13. Real-Time Notification Stored in MySQL', `Count: ${notifData.notifications?.length}`);

    // 14. User Logout
    const logoutRes = await globalThis.fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${registeredToken}` }
    });
    const logoutData = await logoutRes.json();
    assert(logoutData.success === true, '14. User Logout');

    // 15. Re-Login
    const reloginRes = await globalThis.fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password@123'
      })
    });
    const reloginData = await reloginRes.json();
    assert(reloginData.success === true && reloginData.user?.email === testEmail, '15. Re-Login Verification');

    // 16. Reports CSV generation test
    const reportRes = await globalThis.fetch(`${BASE_URL}/reports/employees?format=csv`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const reportText = await reportRes.text();
    assert(reportText.includes('Employee ID') && reportText.includes('Full Name'), '16. Employee CSV Report Generation');

    // 17. Department Safe Deletion test (cannot delete dept with employees)
    const delDeptRes = await globalThis.fetch(`${BASE_URL}/departments/1`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const delDeptData = await delDeptRes.json();
    assert(delDeptData.success === false && delDeptData.message.includes('Cannot delete department'), '17. Department Deletion Safety Guard');

    console.log('\n====================================================');
    console.log(`>>> TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
}

runTestSuite();
