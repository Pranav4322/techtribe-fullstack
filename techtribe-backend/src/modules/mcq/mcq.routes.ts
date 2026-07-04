import { Router } from 'express';
import * as controller from './mcq.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { startAttemptSchema, answerSchema } from './mcq.validation';

const router = Router();

router.get('/categories', controller.categories);
router.use(requireAuth);
router.post('/attempts', validate({ body: startAttemptSchema }), controller.start);
router.post('/attempts/:attemptId/answer', validate({ body: answerSchema }), controller.answer);
router.post('/attempts/:attemptId/complete', controller.complete);
router.get('/attempts/history', controller.history);

export default router;
