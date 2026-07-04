import { Router } from 'express';
import * as controller from './users.controller';
import { requireAuth, optionalAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { updateProfileSchema } from './users.validation';

const router = Router();

router.get('/dashboard', requireAuth, controller.dashboard);
router.put('/me', requireAuth, validate({ body: updateProfileSchema }), controller.updateMyProfile);
router.get('/:username', optionalAuth, controller.getProfile);
router.post('/:username/follow', requireAuth, controller.follow);
router.delete('/:username/follow', requireAuth, controller.unfollow);

export default router;
