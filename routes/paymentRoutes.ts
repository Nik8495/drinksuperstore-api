import { Router } from 'express';
import {
  createPaymentIntent,
  createCheckoutSession,
  getCheckoutSession,
  recordPayment,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// All payment endpoints require authentication
router.post('/create-intent', protect, createPaymentIntent);
router.post('/create-checkout-session', protect, createCheckoutSession);
router.get('/session/:id', protect, getCheckoutSession);
router.post('/record', protect, recordPayment);

export default router;
