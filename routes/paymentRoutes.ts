import { Router } from 'express';
import {
  createPaymentIntent,
  createCheckoutSession,
  getCheckoutSession,
  recordPayment,
} from '../controllers/paymentController.js';

const router = Router();

// Endpoint: POST /api/payments/create-intent
router.post('/create-intent', createPaymentIntent);
router.post('/create-checkout-session', createCheckoutSession);
router.get('/session/:id', getCheckoutSession);
router.post('/record', recordPayment);

export default router;
