import { Router } from 'express';
import * as controller from './admin.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { banUserSchema, updateRoleSchema, resolveReportSchema, announcementSchema } from './admin.validation';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'MODERATOR'));

router.get('/stats', controller.stats);
router.get('/users', controller.listUsers);
router.post('/users/:userId/ban', validate({ body: banUserSchema }), controller.banUser);
router.post('/users/:userId/unban', controller.unbanUser);
router.patch('/users/:userId/role', requireRole('ADMIN'), validate({ body: updateRoleSchema }), controller.updateRole);

router.get('/reports', controller.listReports);
router.patch('/reports/:reportId', validate({ body: resolveReportSchema }), controller.resolveReport);

router.post('/announcements', requireRole('ADMIN'), validate({ body: announcementSchema }), controller.announcement);
router.get('/audit-log', requireRole('ADMIN'), controller.auditLog);

export default router;
