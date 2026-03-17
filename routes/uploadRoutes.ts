import { Router } from 'express';
import multer from 'multer';
import { uploadMedia } from '../controllers/uploadController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/', protect, requireAdmin, upload.single('file'), uploadMedia);

export default router;
