import { Router } from 'express';
import * as controller from './languages.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createLanguageSchema, updateLanguageSchema, upsertSectionSchema } from './languages.validation';

const router = Router();

router.get('/', controller.list);
router.get('/:slug', controller.getOne);

router.post('/', requireAuth, requireRole('ADMIN'), validate({ body: createLanguageSchema }), controller.create);
router.put('/:slug', requireAuth, requireRole('ADMIN'), validate({ body: updateLanguageSchema }), controller.update);
router.delete('/:slug', requireAuth, requireRole('ADMIN'), controller.remove);

router.put(
  '/:slug/sections',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: upsertSectionSchema }),
  controller.upsertSection
);
router.delete('/:slug/sections/:key', requireAuth, requireRole('ADMIN'), controller.deleteSection);

export default router;
