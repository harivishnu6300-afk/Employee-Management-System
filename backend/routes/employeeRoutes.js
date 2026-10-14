import express from 'express';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  uploadEmployeeAvatar
} from '../controllers/employeeController.js';
import { verifyToken, requireRole, requireSelfOrRole } from '../middleware/authMiddleware.js';
import { uploadAvatar } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getAllEmployees);
router.get('/:id', getEmployeeById);
router.post('/', requireRole('Admin', 'HR'), createEmployee);
router.put('/:id', requireSelfOrRole('Admin', 'HR'), updateEmployee);
router.delete('/:id', requireRole('Admin', 'HR'), deleteEmployee);
router.post('/:id/avatar', requireSelfOrRole('Admin', 'HR'), uploadAvatar.single('avatar'), uploadEmployeeAvatar);

export default router;
