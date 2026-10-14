import express from 'express';
import {
  getAllLeaves,
  applyLeave,
  approveLeave,
  rejectLeave
} from '../controllers/leaveController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getAllLeaves);
router.post('/', applyLeave);
router.put('/:id/approve', requireRole('Admin', 'HR', 'Manager'), approveLeave);
router.put('/:id/reject', requireRole('Admin', 'HR', 'Manager'), rejectLeave);

export default router;
