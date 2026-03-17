import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import {
  deleteUserById,
  getAllOrders,
  getAllPayments,
  getAllUsers,
  getDashboardStats,
  getOrderById,
} from '../controllers/adminController.js';

const router = Router();

router.get('/users', protect, requireAdmin, getAllUsers);
router.delete('/users/:id', protect, requireAdmin, deleteUserById);
router.get('/orders', protect, requireAdmin, getAllOrders);
router.get('/orders/:id', protect, requireAdmin, getOrderById);
router.get('/payments', protect, requireAdmin, getAllPayments);
router.get('/stats', protect, requireAdmin, getDashboardStats);

export default router;
