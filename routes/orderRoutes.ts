import { Router } from 'express';
import {
  createOrder,
  deleteOrder,
  getUserOrders,
  updateOrder,
} from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireOwnership } from '../middleware/ownershipMiddleware.js';

const router = Router();

// Guest checkout (no auth required)
router.post('/guest', createOrder);

// Authenticated routes with ownership validation
router.post('/', protect, requireOwnership, createOrder);
router.get('/:userId', protect, requireOwnership, getUserOrders);
router.put('/:id', protect, updateOrder);
router.delete('/:id', protect, deleteOrder);

export default router;
