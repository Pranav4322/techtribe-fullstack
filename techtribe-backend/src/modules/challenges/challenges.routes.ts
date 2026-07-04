import { Router } from 'express';
import * as controller from './challenges.controller';
import { requireAuth, requireRole, optionalAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createChallengeSchema, submitSolutionSchema } from './challenges.validation';

const router = Router();

router.get('/', controller.list);
router.get('/:slug', optionalAuth, controller.getOne);
router.post('/', requireAuth, requireRole('ADMIN'), validate({ body: createChallengeSchema }), controller.create);
router.delete('/:slug', requireAuth, requireRole('ADMIN'), controller.remove);

router.post('/:slug/submit', requireAuth, validate({ body: submitSolutionSchema }), controller.submit);
router.get('/:slug/submissions', requireAuth, controller.mySubmissions);
router.post('/:slug/bookmark', requireAuth, controller.bookmark);

export default router;
