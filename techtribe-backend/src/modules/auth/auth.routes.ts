import { Router } from 'express';
import * as controller from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { authRateLimiter } from '../../middleware/rateLimit.middleware';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  changePasswordSchema
} from './auth.validation';
import { z } from 'zod';

const router = Router();

router.post('/register', authRateLimiter, validate({ body: registerSchema }), controller.register);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), controller.login);
router.post('/refresh', validate({ body: refreshSchema }), controller.refresh);
router.post('/logout', controller.logout);
router.post('/logout-all', requireAuth, controller.logoutAll);

router.get('/verify-email', validate({ query: z.object({ token: z.string() }) }), controller.verifyEmail);
router.post('/verify-email', validate({ body: verifyEmailSchema }), controller.verifyEmail);

router.post(
  '/forgot-password',
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  controller.forgotPassword
);
router.post('/reset-password', authRateLimiter, validate({ body: resetPasswordSchema }), controller.resetPassword);
router.post(
  '/change-password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  controller.changePassword
);

router.get('/me', requireAuth, controller.me);

export default router;
