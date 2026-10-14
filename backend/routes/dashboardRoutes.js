import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);
router.get('/stats', getDashboardStats);

export default router;
