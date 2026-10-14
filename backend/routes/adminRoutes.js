import express from 'express';
import {
  getUsers,
  updateUserRole,
  toggleUserStatus,
  getActivityLogs,
  getSettings,
  updateSettings
} from '../controllers/adminController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);
router.use(requireRole('Admin'));

router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/status', toggleUserStatus);
router.get('/activity-logs', getActivityLogs);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
