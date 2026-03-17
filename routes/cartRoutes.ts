import { Router } from 'express';
import {
  createCart,
  deleteCart,
  getCart,
  updateCart,
} from '../controllers/cartController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Routes for /api/cart
router.get('/:userId', protect, getCart);
router.post('/update', protect, updateCart);
router.post('/', protect, createCart);
router.put('/:userId', protect, updateCart);
router.delete('/:userId', protect, deleteCart);

export default router;
