import { Router } from 'express';
import * as controller from './roadmaps.controller';
import { requireAuth, requireRole, optionalAuth } from '../../middleware/auth.middleware';
import { aiRateLimiter } from '../../middleware/rateLimit.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createRoadmapSchema, generateRoadmapSchema } from './roadmaps.validation';

const router = Router();

router.get('/', controller.list);
router.get('/mine', requireAuth, controller.mine);
router.get('/:slug', optionalAuth, controller.getOne);

router.post('/', requireAuth, requireRole('ADMIN'), validate({ body: createRoadmapSchema }), controller.create);
router.post(
  '/generate',
  requireAuth,
  aiRateLimiter,
  validate({ body: generateRoadmapSchema }),
  controller.generate
);

router.post('/:slug/start', requireAuth, controller.start);
router.post('/:slug/milestones/:milestoneId/toggle', requireAuth, controller.toggleMilestone);

export default router;
