USE employee_management;

-- Disable foreign key checks for clean truncation
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE activity_logs;
TRUNCATE TABLE notifications;
TRUNCATE TABLE attendance;
TRUNCATE TABLE leave_requests;
TRUNCATE TABLE password_resets;
TRUNCATE TABLE employees;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Ensure Roles Exist
INSERT INTO roles (id, name, description) VALUES
(1, 'Admin', 'Complete administrative access to all modules, settings, users, and audit logs'),
(2, 'HR', 'Human resources access to manage employees, attendance, leave requests, and reports'),
(3, 'Manager', 'Team management access to oversee assigned employees, attendance, and leave approvals'),
(4, 'Employee', 'Standard employee access to profile, own attendance, leave applications, and notifications')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

-- 2. Ensure Departments Exist
INSERT INTO departments (id, name, code, description, status) VALUES
(1, 'Engineering & Technology', 'ENG', 'Software engineering, cloud infrastructure, QA, and IT operations', 'Active'),
(2, 'Human Resources', 'HR', 'Talent acquisition, employee welfare, compensation, and people operations', 'Active'),
(3, 'Product & Design', 'PRD', 'Product management, UX/UI research, and creative systems design', 'Active'),
(4, 'Finance & Accounts', 'FIN', 'Corporate finance, payroll, auditing, and financial strategy', 'Active'),
(5, 'Marketing & Growth', 'MKT', 'Brand strategy, digital marketing, demand generation, and communications', 'Active'),
(6, 'Operations & Logistics', 'OPS', 'Facilities management, global operations, and compliance', 'Active')
ON DUPLICATE KEY UPDATE name=VALUES(name), code=VALUES(code), description=VALUES(description);

-- 3. Insert Sole Administrator Account (Hari Vishnu)
-- Password is 'Hari@123'
INSERT INTO users (id, email, password_hash, role_id, is_active, last_login_at) VALUES
(1, 'admin@company.com', '$2a$10$ACw.32HpADeCPJzrIX765./DWxJWmRceQi/XK/X91jxptxYGPE7Zi', 1, 1, NOW());

-- 4. Insert Sole Employee Record for Hari Vishnu
INSERT INTO employees (
  id, user_id, employee_code, first_name, last_name, email, phone,
  date_of_birth, gender, address, city, state, emergency_contact,
  department_id, designation, role_id, joining_date, salary,
  employment_type, status, manager_id, avatar_url
) VALUES (
  1, 1, 'EMP-1001', 'Hari', 'Vishnu', 'admin@company.com', '63005626352',
  '1995-01-01', 'Male', 'Headquarters Executive Suite', 'Hyderabad', 'Telangana', '63005626352',
  1, 'Chief Executive Administrator', 1, CURDATE(), 150000.00,
  'Full-Time', 'Active', NULL,
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
);

-- 5. Welcome Notification
INSERT INTO notifications (user_id, title, message, type, is_read, link) VALUES
(1, 'Welcome Hari Vishnu!', 'System initialized successfully. You are logged in as the Sole Master Administrator. You can now add new team members, manage departments, and track attendance.', 'success', 0, '/dashboard');

-- 6. Initial Activity Log
INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent) VALUES
(1, 'System Reset & Initialized', 'All previous duplicate and dummy accounts removed. Master Admin Hari Vishnu (Phone: 63005626352) established.', '127.0.0.1', 'Portal System Initializer');
