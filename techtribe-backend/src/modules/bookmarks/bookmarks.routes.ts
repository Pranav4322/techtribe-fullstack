import { Router } from 'express';
import * as controller from './bookmarks.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();
router.get('/', requireAuth, controller.list);

export default router;
