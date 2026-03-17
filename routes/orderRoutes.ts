import { Router } from 'express';
import {
  createOrder,
  deleteOrder,
  getUserOrders,
  updateOrder,
} from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Endpoint: POST /api/orders (Create new)
router.post('/guest', createOrder);
router.post('/', protect, createOrder);

// Endpoint: GET /api/orders/:userId (Fetch history)
router.get('/:userId', protect, getUserOrders);
router.put('/:id', protect, updateOrder);
router.delete('/:id', protect, deleteOrder);

export default router;
