import { Router } from 'express';
import * as controller from './search.controller';
import { optionalAuth } from '../../middleware/auth.middleware';

const router = Router();
router.get('/', optionalAuth, controller.search);

export default router;
