-- ========================================================
-- Employee Management System - Seed Data
-- ========================================================

USE employee_management;

-- 1. SEED ROLES
INSERT INTO roles (id, name, description) VALUES
(1, 'Admin', 'Complete administrative access to all modules, settings, users, and audit logs'),
(2, 'HR', 'Human resources access to manage employees, attendance, leave requests, and reports'),
(3, 'Manager', 'Team management access to oversee assigned employees, attendance, and leave approvals'),
(4, 'Employee', 'Standard employee access to profile, own attendance, leave applications, and notifications')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

-- 2. SEED DEPARTMENTS
INSERT INTO departments (id, name, code, description, status) VALUES
(1, 'Engineering & Technology', 'ENG', 'Software engineering, cloud infrastructure, QA, and IT operations', 'Active'),
(2, 'Human Resources', 'HR', 'Talent acquisition, employee welfare, compensation, and people operations', 'Active'),
(3, 'Product & Design', 'PRD', 'Product management, UX/UI research, and creative systems design', 'Active'),
(4, 'Finance & Accounts', 'FIN', 'Corporate finance, payroll, auditing, and financial strategy', 'Active'),
(5, 'Marketing & Growth', 'MKT', 'Brand strategy, digital marketing, demand generation, and communications', 'Active'),
(6, 'Operations & Logistics', 'OPS', 'Facilities management, global operations, and compliance', 'Active')
ON DUPLICATE KEY UPDATE name=VALUES(name), code=VALUES(code), description=VALUES(description);

-- 3. SEED USERS
-- Passwords:
-- admin@company.com    -> Admin@123
-- hr@company.com       -> Hr@123
-- manager@company.com  -> Manager@123
-- employee@company.com -> Employee@123
-- others               -> Employee@123
INSERT INTO users (id, email, password_hash, role_id, is_active, last_login_at) VALUES
(1, 'admin@company.com', '$2a$10$75i51GdFxiJxfHkeqOA40eZFkavt5CG2mLW/NwiqLZITKlazE6MK2', 1, 1, NOW()),
(2, 'hr@company.com', '$2a$10$nWZOhkIWZpqJiHL5ADViO.sxyfOqI2x6XEK2vorpc7t5nxFKFVB52', 2, 1, NOW()),
(3, 'manager@company.com', '$2a$10$z9pj9Sw9417BKTWB9DKQIOC4A8/aFBSrDTeEVXRMX1wUu13CBBviu', 3, 1, NOW()),
(4, 'employee@company.com', '$2a$10$/il4tOiOELVH86ps5iUbAuSlwDRjC3eF3aSompGn59vjJWsvXGHv.', 4, 1, NOW()),
(5, 'marcus.vance@company.com', '$2a$10$z9pj9Sw9417BKTWB9DKQIOC4A8/aFBSrDTeEVXRMX1wUu13CBBviu', 3, 1, NOW()),
(6, 'rachel.green@company.com', '$2a$10$/il4tOiOELVH86ps5iUbAuSlwDRjC3eF3aSompGn59vjJWsvXGHv.', 4, 1, NOW()),
(7, 'james.wilson@company.com', '$2a$10$/il4tOiOELVH86ps5iUbAuSlwDRjC3eF3aSompGn59vjJWsvXGHv.', 4, 1, NOW()),
(8, 'olivia.taylor@company.com', '$2a$10$/il4tOiOELVH86ps5iUbAuSlwDRjC3eF3aSompGn59vjJWsvXGHv.', 4, 1, NOW()),
(9, 'liam.johnson@company.com', '$2a$10$/il4tOiOELVH86ps5iUbAuSlwDRjC3eF3aSompGn59vjJWsvXGHv.', 4, 1, NOW()),
(10, 'sarah.jenkins@company.com', '$2a$10$/il4tOiOELVH86ps5iUbAuSlwDRjC3eF3aSompGn59vjJWsvXGHv.', 4, 1, NOW())
ON DUPLICATE KEY UPDATE email=VALUES(email), password_hash=VALUES(password_hash), role_id=VALUES(role_id);

-- 4. SEED EMPLOYEES
INSERT INTO employees (id, user_id, employee_code, first_name, last_name, email, phone, date_of_birth, gender, address, city, state, emergency_contact, department_id, designation, role_id, joining_date, salary, employment_type, status, manager_id, avatar_url) VALUES
(1, 1, 'EMP-1001', 'Alexander', 'Wright', 'admin@company.com', '+1 (555) 019-2831', '1985-04-12', 'Male', '742 Evergreen Terrace', 'San Francisco', 'California', '+1 (555) 019-9999', 6, 'Director of Operations', 1, '2021-01-15', 125000.00, 'Full-Time', 'Active', NULL, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'),
(2, 2, 'EMP-1002', 'Sophia', 'Martinez', 'hr@company.com', '+1 (555) 019-4822', '1990-08-23', 'Female', '128 Willow Creek Lane', 'San Francisco', 'California', '+1 (555) 019-8888', 2, 'Lead HR Business Partner', 2, '2021-06-01', 95000.00, 'Full-Time', 'Active', 1, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'),
(3, 3, 'EMP-1003', 'David', 'Chen', 'manager@company.com', '+1 (555) 019-6734', '1988-11-05', 'Male', '55 Tech Ridge Parkway', 'San Jose', 'California', '+1 (555) 019-7777', 1, 'Engineering Manager', 3, '2021-09-10', 115000.00, 'Full-Time', 'Active', 1, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'),
(4, 4, 'EMP-1004', 'Emily', 'Watson', 'employee@company.com', '+1 (555) 019-8921', '1994-03-19', 'Female', '404 Silicon Vista Way', 'San Jose', 'California', '+1 (555) 019-6666', 1, 'Senior Full Stack Engineer', 4, '2022-03-15', 88000.00, 'Full-Time', 'Active', 3, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80'),
(5, 5, 'EMP-1005', 'Marcus', 'Vance', 'marcus.vance@company.com', '+1 (555) 019-1102', '1989-07-14', 'Male', '890 Market Street', 'San Francisco', 'California', '+1 (555) 019-5555', 3, 'Head of Product', 3, '2022-01-20', 112000.00, 'Full-Time', 'Active', 1, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'),
(6, 6, 'EMP-1006', 'Rachel', 'Green', 'rachel.green@company.com', '+1 (555) 019-3345', '1995-09-30', 'Female', '312 Pine Needle Court', 'Oakland', 'California', '+1 (555) 019-4444', 3, 'Senior UI/UX Designer', 4, '2022-08-01', 82000.00, 'Full-Time', 'Active', 5, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80'),
(7, 7, 'EMP-1007', 'James', 'Wilson', 'james.wilson@company.com', '+1 (555) 019-5567', '1992-12-18', 'Male', '210 Marina Boulevard', 'San Francisco', 'California', '+1 (555) 019-3333', 1, 'DevOps & Cloud Specialist', 4, '2023-02-14', 90000.00, 'Full-Time', 'Active', 3, 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80'),
(8, 8, 'EMP-1008', 'Olivia', 'Taylor', 'olivia.taylor@company.com', '+1 (555) 019-7789', '1993-05-25', 'Female', '670 Financial Plaza', 'San Francisco', 'California', '+1 (555) 019-2222', 4, 'Senior Financial Analyst', 4, '2023-05-10', 85000.00, 'Full-Time', 'Active', 1, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'),
(9, 9, 'EMP-1009', 'Liam', 'Johnson', 'liam.johnson@company.com', '+1 (555) 019-9901', '1996-02-08', 'Male', '144 Mission District St', 'San Francisco', 'California', '+1 (555) 019-1111', 5, 'Growth Marketing Lead', 4, '2023-09-01', 78000.00, 'Full-Time', 'Active', 1, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80'),
(10, 10, 'EMP-1010', 'Sarah', 'Jenkins', 'sarah.jenkins@company.com', '+1 (555) 019-2234', '1997-10-11', 'Female', '88 Sunset Crest Way', 'Berkeley', 'California', '+1 (555) 019-0000', 2, 'HR Operations Specialist', 4, '2024-01-15', 68000.00, 'Full-Time', 'Active', 2, 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80')
ON DUPLICATE KEY UPDATE first_name=VALUES(first_name), last_name=VALUES(last_name), designation=VALUES(designation), salary=VALUES(salary);

-- 5. SEED ATTENDANCE (Past week & today)
INSERT INTO attendance (employee_id, date, check_in, check_out, working_hours, status, notes) VALUES
(1, CURDATE() - INTERVAL 2 DAY, '2026-09-28 08:55:00', '2026-09-28 17:45:00', 8.83, 'Present', 'On-time standard shift'),
(2, CURDATE() - INTERVAL 2 DAY, '2026-09-28 09:05:00', '2026-09-28 17:30:00', 8.41, 'Present', 'HR interviews handled'),
(3, CURDATE() - INTERVAL 2 DAY, '2026-09-28 08:50:00', '2026-09-28 18:00:00', 9.16, 'Present', 'Sprint planning day'),
(4, CURDATE() - INTERVAL 2 DAY, '2026-09-28 09:12:00', '2026-09-28 18:15:00', 9.05, 'Present', 'Backend refactoring'),
(5, CURDATE() - INTERVAL 2 DAY, '2026-09-28 09:00:00', '2026-09-28 17:30:00', 8.50, 'Present', 'Product roadmap reviews'),
(6, CURDATE() - INTERVAL 2 DAY, '2026-09-28 09:45:00', '2026-09-28 18:00:00', 8.25, 'Late', 'Transit delay, informed manager'),
(7, CURDATE() - INTERVAL 2 DAY, '2026-09-28 08:45:00', '2026-09-28 17:15:00', 8.50, 'Present', 'Server upgrades deployed'),
(8, CURDATE() - INTERVAL 2 DAY, '2026-09-28 09:00:00', '2026-09-28 13:00:00', 4.00, 'Half Day', 'Doctor appointment afternoon'),
(9, CURDATE() - INTERVAL 2 DAY, '2026-09-28 09:10:00', '2026-09-28 17:40:00', 8.50, 'Present', 'Ad campaign launch'),
(10, CURDATE() - INTERVAL 2 DAY, '2026-09-28 08:58:00', '2026-09-28 17:30:00', 8.53, 'Present', 'Onboarding batch ready'),

(1, CURDATE() - INTERVAL 1 DAY, '2026-09-29 08:50:00', '2026-09-29 17:50:00', 9.00, 'Present', 'Operations review'),
(2, CURDATE() - INTERVAL 1 DAY, '2026-09-29 08:58:00', '2026-09-29 17:35:00', 8.61, 'Present', 'Regular workday'),
(3, CURDATE() - INTERVAL 1 DAY, '2026-09-29 08:45:00', '2026-09-29 18:10:00', 9.41, 'Present', 'Tech review meetings'),
(4, CURDATE() - INTERVAL 1 DAY, '2026-09-29 09:00:00', '2026-09-29 17:45:00', 8.75, 'Present', 'PR reviews & merges'),
(5, CURDATE() - INTERVAL 1 DAY, '2026-09-29 09:20:00', '2026-09-29 17:50:00', 8.50, 'Late', 'Morning client demo delay'),
(6, CURDATE() - INTERVAL 1 DAY, '2026-09-29 09:00:00', '2026-09-29 17:30:00', 8.50, 'Present', 'Design system sprint'),
(7, CURDATE() - INTERVAL 1 DAY, '2026-09-29 08:50:00', '2026-09-29 17:20:00', 8.50, 'Present', 'Cloud monitoring'),
(8, CURDATE() - INTERVAL 1 DAY, '2026-09-29 09:00:00', '2026-09-29 17:30:00', 8.50, 'Present', 'Quarterly budget checks'),
(9, CURDATE() - INTERVAL 1 DAY, '2026-09-29 09:05:00', '2026-09-29 17:35:00', 8.50, 'Present', 'Social media analysis'),
(10, CURDATE() - INTERVAL 1 DAY, '2026-09-29 09:00:00', '2026-09-29 17:30:00', 8.50, 'Present', 'Policy updates'),

-- Today's attendance
(1, CURDATE(), CONCAT(CURDATE(), ' 08:52:00'), NULL, 0.00, 'Present', 'Checked in on time'),
(2, CURDATE(), CONCAT(CURDATE(), ' 08:58:00'), NULL, 0.00, 'Present', 'Checked in on time'),
(3, CURDATE(), CONCAT(CURDATE(), ' 08:48:00'), NULL, 0.00, 'Present', 'Checked in on time'),
(4, CURDATE(), CONCAT(CURDATE(), ' 09:02:00'), NULL, 0.00, 'Present', 'Checked in for daily standup'),
(5, CURDATE(), CONCAT(CURDATE(), ' 09:15:00'), NULL, 0.00, 'Late', 'Late check-in due to traffic'),
(7, CURDATE(), CONCAT(CURDATE(), ' 08:40:00'), NULL, 0.00, 'Present', 'Checked in on time'),
(9, CURDATE(), CONCAT(CURDATE(), ' 09:05:00'), NULL, 0.00, 'Present', 'Checked in on time')
ON DUPLICATE KEY UPDATE status=VALUES(status), notes=VALUES(notes);

-- 6. SEED LEAVE REQUESTS
INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, total_days, reason, status, action_by, action_remarks, action_at) VALUES
(1, 6, 'Casual Leave', CURDATE(), CURDATE() + INTERVAL 2 DAY, 3, 'Attending family wedding ceremony', 'Approved', 1, 'Approved. Enjoy your time off with family!', NOW() - INTERVAL 1 DAY),
(2, 8, 'Sick Leave', CURDATE(), CURDATE() + INTERVAL 1 DAY, 2, 'Severe seasonal viral flu and fever', 'Approved', 1, 'Approved. Please rest and submit medical certificate upon return.', NOW() - INTERVAL 2 HOUR),
(3, 4, 'Earned Leave', CURDATE() + INTERVAL 7 DAY, CURDATE() + INTERVAL 11 DAY, 5, 'Annual scheduled family vacation to Lake Tahoe', 'Pending', NULL, NULL, NULL),
(4, 7, 'Casual Leave', CURDATE() + INTERVAL 14 DAY, CURDATE() + INTERVAL 15 DAY, 2, 'Personal errand and household relocation', 'Pending', NULL, NULL, NULL),
(5, 10, 'Emergency Leave', CURDATE() - INTERVAL 10 DAY, CURDATE() - INTERVAL 8 DAY, 3, 'Emergency home maintenance and plumbing repair', 'Approved', 2, 'Approved retrospectively.', CURDATE() - INTERVAL 8 DAY),
(6, 9, 'Other', CURDATE() - INTERVAL 20 DAY, CURDATE() - INTERVAL 19 DAY, 2, 'Attending conference as guest speaker', 'Approved', 1, 'Approved company representation.', CURDATE() - INTERVAL 21 DAY),
(7, 4, 'Sick Leave', CURDATE() - INTERVAL 40 DAY, CURDATE() - INTERVAL 39 DAY, 2, 'Dental procedure and recovery', 'Approved', 3, 'Approved by engineering manager.', CURDATE() - INTERVAL 41 DAY)
ON DUPLICATE KEY UPDATE reason=VALUES(reason), status=VALUES(status);

-- 7. SEED NOTIFICATIONS
INSERT INTO notifications (id, user_id, title, message, type, is_read, link) VALUES
(1, 4, 'Leave Request Submitted', 'Your leave request for 5 days starting next week has been sent for manager review.', 'leave', 0, '/leaves'),
(2, 4, 'Attendance Logged', 'Good morning Emily! Your check-in at 09:02 AM has been recorded successfully.', 'attendance', 1, '/attendance'),
(3, 3, 'Pending Leave Approval', 'Emily Watson has requested 5 days of Earned Leave requiring your approval.', 'leave', 0, '/leaves'),
(4, 1, 'System Health Normal', 'Automated nightly database backup and audit verification completed successfully.', 'system', 0, '/settings'),
(5, 2, 'New Employee Onboarding', 'Review documentation submitted for newly joined engineering cohort.', 'info', 0, '/employees'),
(6, 4, 'Quarterly Review Reminder', 'Q3 Performance and Goals evaluation cycle is now open for review submissions.', 'info', 1, '/profile')
ON DUPLICATE KEY UPDATE title=VALUES(title), message=VALUES(message);

-- 8. SEED ACTIVITY LOGS
INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent) VALUES
(1, 'User Login', 'Admin Alexander Wright logged in successfully', '127.0.0.1', 'Mozilla/5.0 Chrome/120.0'),
(1, 'Employee Updated', 'Updated role permissions and department parameters for Engineering cohort', '127.0.0.1', 'Mozilla/5.0 Chrome/120.0'),
(2, 'User Login', 'HR Sophia Martinez authenticated via portal', '127.0.0.1', 'Mozilla/5.0 Chrome/120.0'),
(3, 'Leave Approved', 'Manager David Chen approved sick leave for Rachel Green', '127.0.0.1', 'Mozilla/5.0 Chrome/120.0'),
(4, 'User Login', 'Employee Emily Watson logged into portal', '127.0.0.1', 'Mozilla/5.0 Chrome/120.0'),
(4, 'Attendance Check-In', 'Emily Watson registered attendance check-in', '127.0.0.1', 'Mozilla/5.0 Chrome/120.0');

-- 9. SEED SYSTEM SETTINGS
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('company_name', 'WorkSphere Global Inc.', 'Company organization legal name'),
('work_start_time', '09:00', 'Standard morning punch-in time'),
('work_end_time', '18:00', 'Standard evening punch-out time'),
('grace_period_minutes', '15', 'Allowed grace period in minutes before marked as Late'),
('standard_work_hours', '8.0', 'Expected daily working hours'),
('support_email', 'support@worksphere.io', 'Internal HR & IT support helpdesk email')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);
