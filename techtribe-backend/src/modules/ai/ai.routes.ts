import { Router } from 'express';
import * as controller from './ai.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { aiRateLimiter } from '../../middleware/rateLimit.middleware';
import { validate } from '../../middleware/validate.middleware';
import { quizSchema, summarySchema, pathSchema, reviewSchema, quickAskSchema } from './ai.validation';

const router = Router();

router.use(requireAuth, aiRateLimiter);

router.post('/quiz', validate({ body: quizSchema }), controller.quiz);
router.post('/summary', validate({ body: summarySchema }), controller.summary);
router.post('/path', validate({ body: pathSchema }), controller.path);
router.post('/review', validate({ body: reviewSchema }), controller.review);
router.post('/quick-ask', validate({ body: quickAskSchema }), controller.quickAsk);

export default router;
