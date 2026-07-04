import { Router } from 'express';
import * as controller from './news.controller';
import { requireAuth, optionalAuth } from '../../middleware/auth.middleware';

const router = Router();

router.get('/categories', controller.categories);
router.get('/', optionalAuth, controller.list);
router.get('/:id', optionalAuth, controller.getOne);
router.post('/:id/like', requireAuth, controller.like);
router.post('/:id/bookmark', requireAuth, controller.bookmark);

export default router;
