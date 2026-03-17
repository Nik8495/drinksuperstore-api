import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireOwnership } from '../middleware/ownershipMiddleware.js';
import {
  createAddress,
  deleteAddress,
  getAddressesByUserId,
  updateAddress,
} from '../controllers/addressController.js';

const router = Router();

// Guest checkout address (no auth)
router.post('/guest', createAddress);

// Authenticated routes with ownership validation
router.post('/', protect, requireOwnership, createAddress);
router.get('/', protect, requireOwnership, getAddressesByUserId);
router.put('/:id', protect, updateAddress);
router.delete('/:id', protect, deleteAddress);

export default router;
