import { Router } from 'express';
import { reserveStock, releaseStock } from '../controllers/stockController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Stock endpoints require authentication
router.post('/reserve', protect, reserveStock);
router.post('/release', protect, releaseStock);

export default router;
