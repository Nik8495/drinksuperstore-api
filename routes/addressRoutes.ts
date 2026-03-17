import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createAddress,
  deleteAddress,
  getAddressesByUserId,
  updateAddress,
} from '../controllers/addressController.js';

const router = Router();

// Endpoint: POST /api/addresses
router.post('/guest', createAddress);
router.post('/', protect, createAddress);
router.get('/', protect, getAddressesByUserId);
router.put('/:id', protect, updateAddress);
router.delete('/:id', protect, deleteAddress);

export default router;
