import express from 'express';
import {
  getAllAttendance,
  getTodayAttendanceStatus,
  getEmployeeAttendance,
  checkIn,
  checkOut,
  manualAttendance
} from '../controllers/attendanceController.js';
import { verifyToken, requireRole, requireSelfOrRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', requireRole('Admin', 'HR', 'Manager'), getAllAttendance);
router.get('/today', getTodayAttendanceStatus);
router.get('/:employeeId', requireSelfOrRole('Admin', 'HR', 'Manager'), getEmployeeAttendance);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.post('/manual', requireRole('Admin', 'HR'), manualAttendance);

export default router;
