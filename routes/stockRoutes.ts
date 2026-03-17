import { Router } from 'express';
import { reserveStock, releaseStock } from '../controllers/stockController.js';

const router = Router();

router.post('/reserve', reserveStock);
router.post('/release', releaseStock);

export default router;
