import { Router } from 'express';
import {
  createSubcategory,
  deleteSubcategory,
  getSubcategories,
  getSubcategoryById,
  updateSubcategory,
} from '../controllers/subcategoryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

const router = Router();

router.get('/', getSubcategories);
router.get('/:id', getSubcategoryById);
router.post('/', protect, requireAdmin, createSubcategory);
router.put('/:id', protect, requireAdmin, updateSubcategory);
router.delete('/:id', protect, requireAdmin, deleteSubcategory);

export default router;
