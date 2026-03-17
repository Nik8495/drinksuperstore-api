import { Router } from 'express';
import {
  createCart,
  deleteCart,
  getCart,
  updateCart,
} from '../controllers/cartController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireOwnership } from '../middleware/ownershipMiddleware.js';

const router = Router();

// Routes for /api/cart — all require auth + ownership validation
router.get('/:userId', protect, requireOwnership, getCart);
router.post('/update', protect, requireOwnership, updateCart);
router.post('/', protect, requireOwnership, createCart);
router.put('/:userId', protect, requireOwnership, updateCart);
router.delete('/:userId', protect, requireOwnership, deleteCart);

export default router;
