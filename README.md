# WorkSphere | Enterprise Real-Time Employee Management System (EMS)

WorkSphere is a full-stack employee management web application built with **React, HTML, CSS, JavaScript, Node.js, Express, MySQL, and Socket.IO**. It includes employee records, attendance, leave applications and reviews, departments, notifications, and downloadable reports. The interface is designed for day-to-day office use with a clear navigation structure, compact data tables, and responsive layouts.

---

## 🌟 Key Features

### 1. 🔐 Authentication & Role-Based Authorization
- **JWT & HTTP-Only Cookies**: Secure stateless token issuance and session persistence.
- **bcrypt Password Hashing**: Passwords encrypted using bcrypt with salt rounds of 10.
- **Role Scoping**: Granular privileges across 4 user tiers:
  - **Admin**: System-wide configuration, user role management, full employee/department CRUD, system audit logs, reports.
  - **HR**: Employee onboarding, department administration, attendance management, leave reviews, HR analytics.
  - **Manager**: Team oversight, direct-report attendance, approve/reject team leave requests with remarks.
  - **Employee**: Self-service portal, check-in/out punch clock, leave application, notifications, personal profile.
- **Password Recovery**: Secure tokenized forgot-password and reset-password flows.
- **Audit Trails**: Every login, logout, employee change, and leave approval is recorded in the `activity_logs` table with client IP and user-agent.

### 2. ⚡ Real-Time Socket.IO Synchronization
- **Employee Online Presence**: Real-time `Online` / `Away` / `Offline` status updates pushed live to all connected clients without polling.
- **Instant Notifications**: Leave request submissions, management approvals, and attendance events trigger instant browser toasts and notification badges.
- **Live Dashboards**: Interactive charts and attendance registers reflect updates in real-time.

### 3. 👥 Comprehensive Employee Directory
- Dual view modes: **Interactive Card Grid** and **Data Table**.
- Real-time online presence status dots on every profile avatar.
- Multi-field search (Name, Employee ID `EMP-xxxx`, Email, Phone).
- Filter by Department, Designation, Role, Employment Type, and Status.
- Multi-attribute sorting and server-paginated database queries.
- Add and Edit employee modals with full client and server-side validation.
- Profile photo upload powered by Multer.

### 4. ⏱️ Attendance & Automated Work Hours
- **Digital Punch Clock**: Displays live seconds clock with one-click **Check In** and **Check Out**.
- **Punctuality Detection**: Check-ins after 09:15 AM are automatically marked as `Late`.
- **Automatic Hours Computation**: Server calculates elapsed hours via `TIMESTAMPDIFF` upon checkout.
- **Duplicate Prevention**: Prevents duplicate daily check-ins.
- **Manual Adjustment**: Admin/HR can perform attendance adjustments with change notes.

### 5. 🏖️ Leave Management Workflow
- Multi-category support: `Casual Leave`, `Sick Leave`, `Earned Leave`, `Emergency Leave`, `Other`.
- Duration calculator with date overlap conflict prevention.
- Review modal for Managers and Admins with **Approve** / **Reject** decisions and mandatory remarks.
- Instant Socket.IO notifications dispatched to the applying employee upon review.

### 6. 🏢 Department Administration
- Department metrics: staff count, active headcount, and payroll allocation.
- **Integrity Rule**: Prevents deletion of any department that currently has employees assigned until they are reassigned.

### 7. 📊 Real-Time Analytics & Report Export
- Real MySQL-backed interactive charts using **Recharts**:
  - Employee distribution by department (Bar)
  - Daily attendance punctuality trend (Area)
  - Leave status distribution (Donut)
  - Monthly headcount growth (Line)
- One-click **CSV Export** streaming for:
  - Employee Master Report
  - Attendance Audit Report
  - Leave Applications Report
  - Department Payroll Report

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router v6, Tailwind CSS, Lucide React, Recharts, Axios, Socket.IO Client |
| **Backend** | Node.js (ES Modules), Express.js, Socket.IO, JWT, bcryptjs, Multer, Cookie-Parser, CORS |
| **Database** | MySQL 8.0+ with connection pooling (`mysql2/promise`), Foreign Keys, and Indexes |

---

## 📁 Project Directory Structure

```
employee-management-system/
├── backend/
│   ├── config/
│   │   └── db.js                 # MySQL pool connection setup
│   ├── controllers/
│   │   ├── adminController.js    # System settings, users, audit logs
│   │   ├── attendanceController.js
│   │   ├── authController.js     # Register, login, forgot/reset password
│   │   ├── dashboardController.js# Real MySQL metrics & charts aggregation
│   │   ├── departmentController.js
│   │   ├── employeeController.js # CRUD, pagination, filter, upload
│   │   ├── leaveController.js    # Applications & approval workflows
│   │   ├── notificationController.js
│   │   └── reportController.js   # CSV generation & analytics
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification & role authorization
│   │   ├── errorMiddleware.js    # Global error handlers
│   │   └── uploadMiddleware.js   # Multer file storage
│   ├── routes/                   # Express REST route modules
│   ├── services/
│   │   └── socketService.js      # Socket.IO dispatch helper
│   ├── sockets/
│   │   └── index.js              # Presence & room management
│   ├── utils/
│   │   ├── logger.js             # Audit logger
│   │   └── testFlow.js           # 18-step automated integration test
│   ├── server.js                 # HTTP + WebSocket initialization
│   ├── .env                      # Environment configuration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── attendance/       # CheckInWidget, Table
│   │   │   ├── common/           # Navbar, Sidebar, Modal, Badge, Card, Toast
│   │   │   ├── dashboard/        # MetricCard, Recharts components
│   │   │   └── employees/        # EmployeeCard, EmployeeTable, Modals
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── SocketContext.jsx
│   │   │   └── ToastContext.jsx
│   │   ├── layouts/
│   │   │   ├── AuthLayout.jsx
│   │   │   └── DashboardLayout.jsx
│   │   ├── pages/                # All 11 application routes
│   │   ├── services/             # Axios API service clients
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── database/
│   ├── schema.sql                # Complete relational schema
│   └── seed.sql                  # Realistic enterprise demo records
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v24+ supported)
- **MySQL**: 8.0 or higher running locally or remotely

### 2. MySQL Database Setup
Open MySQL command line or workbench and create/seed the database:

```sql
-- 1. Create database and tables
SOURCE /path/to/Employee Management System/database/schema.sql;

-- 2. Populate demo records (users, employees, departments, attendance, leaves)
SOURCE /path/to/Employee Management System/database/seed.sql;
```

Alternatively using the MySQL CLI from PowerShell / terminal:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

### 3. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create or verify `backend/.env`:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=employee_management
   JWT_SECRET=replace_with_a_long_random_secret
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:5173
   NODE_ENV=development
LEAVE_ALLOWANCE_DAYS=24
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the backend server:
   ```bash
   npm start
   # Or for auto-reload during development:
   npm run dev
   ```
   *The server will start at `http://localhost:5000` and confirm MySQL connection.*

### 4. Frontend Setup
1. Navigate to the `frontend` directory in a new terminal window:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

## 🔑 Demo Login Credentials

The database comes pre-seeded with realistic organizational profiles across all user roles:

| Role | Email | Password | Description |
|---|---|---|---|
| **Admin** | `admin@company.com` | `Admin@123` | Full access: users, roles, departments, system settings, audit logs |
| **HR** | `hr@company.com` | `Hr@123` | Full employee management, attendance records, leaves, analytics |
| **Manager** | `manager@company.com` | `Manager@123` | Engineering Manager: team overview, leave approvals with remarks |
| **Employee** | `employee@company.com` | `Employee@123` | Staff self-service: punch clock, leave application, notifications |

> **Tip**: The login page includes quick-fill buttons to populate these credentials with one click.

---

## Build verification (Windows PowerShell)

From the extracted project root, run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\verify-build.ps1
```

This installs dependencies, runs the frontend production build, and checks backend JavaScript syntax. A successful build does not by itself prove database connectivity or all business flows. For database-backed tests, MySQL must be running, `backend/.env` must contain the correct credentials, and `database/schema.sql` plus `database/seed.sql` must be imported first.

## 🧪 Automated Testing

WorkSphere includes an end-to-end integration test runner validating all critical user journeys and business rules:

```bash
cd backend
node utils/testFlow.js
```

### Test Coverage

The test runner exercises the following flows when the backend is running and MySQL has been configured and seeded. **Do not treat the checklist below as a claim that the tests have already passed on your machine.**
- 1. API Health Check
- 2. User & Employee Registration
- 3. JWT Authentication & Login
- 4. MySQL Aggregated Dashboard Stats
- 5. Admin Authentication
- 6. Employee Creation with Unique Code (`EMP-xxxx`)
- 7. Employee Profile Retrieval
- 8. Role-Protected Employee Details Modification
- 9. Attendance Check-In with Punctuality Logic
- 10. Duplicate Check-In Prevention Guard
- 11. Attendance Check-Out with Automated Hours Computation
- 12. Employee Leave Application
- 13. Management Leave Approval & Remarks Persistence
- 14. Real-Time In-Database Notification Delivery
- 15. User Logout
- 16. Re-Login Verification
- 17. CSV Report Stream Generation
- 18. Department Deletion Safety Guard (blocks deletion when staff are assigned)

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/register` - Create user and linked employee record
- `POST /api/auth/login` - Authenticate credentials and receive JWT
- `POST /api/auth/logout` - Invalidate session cookie and log activity
- `GET /api/auth/me` - Retrieve current session user & employee details
- `POST /api/auth/forgot-password` - Generate reset token
- `POST /api/auth/reset-password` - Validate token and update password
- `PUT /api/auth/change-password` - Authenticated password update

### Employees
- `GET /api/employees` - Search, filter, sort, and paginate employee records
- `GET /api/employees/:id` - Complete profile with attendance, leaves, and audit logs
- `POST /api/employees` - Register employee (Admin / HR)
- `PUT /api/employees/:id` - Update profile (Admin / HR or Self for contact details)
- `DELETE /api/employees/:id` - Soft deactivate or permanently remove employee (Admin / HR)
- `POST /api/employees/:id/avatar` - Upload profile avatar image

### Attendance
- `GET /api/attendance` - Query company attendance with date/department filters
- `GET /api/attendance/today` - Today's check-in status for active user
- `GET /api/attendance/:employeeId` - Individual employee attendance history
- `POST /api/attendance/check-in` - Record daily punch-in
- `POST /api/attendance/check-out` - Record departure and compute hours
- `POST /api/attendance/manual` - Manual adjustment (Admin / HR)

### Leaves
- `GET /api/leaves` - View leave requests (role-scoped)
- `POST /api/leaves` - Submit new leave request
- `PUT /api/leaves/:id/approve` - Approve leave with remarks (Manager / HR / Admin)
- `PUT /api/leaves/:id/reject` - Reject leave with remarks (Manager / HR / Admin)

### Departments
- `GET /api/departments` - List departments with employee count
- `GET /api/departments/:id` - Department details with member roster
- `POST /api/departments` - Create new department (Admin / HR)
- `PUT /api/departments/:id` - Update department (Admin / HR)
- `DELETE /api/departments/:id` - Delete department (blocked if staff assigned)

### Notifications & Dashboard
- `GET /api/notifications` - User alerts with unread counter
- `PUT /api/notifications/:id/read` - Mark single alert as read
- `PUT /api/notifications/read-all` - Mark all unread alerts
- `GET /api/dashboard/stats` - Live MySQL KPI metrics & chart datasets

### Reports & Admin
- `GET /api/reports/employees?format=csv` - Employee CSV download
- `GET /api/reports/attendance?format=csv` - Attendance CSV download
- `GET /api/reports/leaves?format=csv` - Leave CSV download
- `GET /api/reports/departments?format=csv` - Department payroll CSV download
- `GET /api/admin/users` - List all portal user accounts
- `PUT /api/admin/users/:id/role` - Elevate or change user role
- `PUT /api/admin/users/:id/status` - Activate or deactivate user
- `GET /api/admin/activity-logs` - Audit activity log with search
- `GET /api/admin/settings` - Retrieve system configuration
- `PUT /api/admin/settings` - Update organizational parameters


### Employee leave balance
The employee dashboard shows pending, approved, and rejected requests plus the annual leave balance. The default annual allowance is 24 days and can be changed in `backend/.env` with `LEAVE_ALLOWANCE_DAYS`. Approved leave days are deducted from the allowance for the current calendar year. Confirm your organization's actual leave policy before using this default for real HR decisions.
