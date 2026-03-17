import { Router } from 'express';
import {
  getUserById,
  requestPasswordReset,
  signIn,
  signUp,
  createGuestUser,
  exchangeAuthCodeForSession,
  updateUserDetails,
  updatePassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/auth/signup
router.post('/signup', signUp);

// POST /api/auth/login
router.post('/login', signIn);

// POST /api/auth/guest
router.post('/guest', createGuestUser);

router.get('/user/:id', protect, getUserById);
router.put('/user/:id', protect, updateUserDetails);
router.post('/password-reset', requestPasswordReset);
router.post('/exchange-code', exchangeAuthCodeForSession);
router.post('/password-update', protect, updatePassword);

export default router;
