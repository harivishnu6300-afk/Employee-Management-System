import express from 'express';
import {
  getEmployeeReport,
  getAttendanceReport,
  getLeaveReport,
  getDepartmentReport
} from '../controllers/reportController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);
router.use(requireRole('Admin', 'HR', 'Manager'));

router.get('/employees', getEmployeeReport);
router.get('/attendance', getAttendanceReport);
router.get('/leaves', getLeaveReport);
router.get('/departments', getDepartmentReport);

export default router;
