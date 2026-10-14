import express from 'express';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../controllers/departmentController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Allow public retrieval of departments (needed for registration & portal)
router.get('/', getAllDepartments);

// All subsequent routes require authentication
router.use(verifyToken);

router.get('/:id', getDepartmentById);
router.post('/', requireRole('Admin', 'HR'), createDepartment);
router.put('/:id', requireRole('Admin', 'HR'), updateDepartment);
router.delete('/:id', requireRole('Admin'), deleteDepartment);

export default router;
