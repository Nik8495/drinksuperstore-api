import { Router } from 'express';
//import { getBrands } from '../controllers/brandController';
import {
  createBrand,
  deleteBrand,
  getBrandById,
  getBrands,
  updateBrand,
} from '../controllers/brandController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

const router = Router();

// Endpoint: GET /api/brands
router.get('/', getBrands);
router.get('/:id', getBrandById);
router.post('/', protect, requireAdmin, createBrand);
router.put('/:id', protect, requireAdmin, updateBrand);
router.delete('/:id', protect, requireAdmin, deleteBrand);

export default router;
