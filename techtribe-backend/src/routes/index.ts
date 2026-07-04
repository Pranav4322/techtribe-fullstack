import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import languagesRoutes from '../modules/languages/languages.routes';
import newsRoutes from '../modules/news/news.routes';
import communityRoutes from '../modules/community/community.routes';
import aiRoutes from '../modules/ai/ai.routes';
import bookmarksRoutes from '../modules/bookmarks/bookmarks.routes';
import searchRoutes from '../modules/search/search.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';
import mcqRoutes from '../modules/mcq/mcq.routes';
import challengesRoutes from '../modules/challenges/challenges.routes';
import notesRoutes from '../modules/notes/notes.routes';
import roadmapsRoutes from '../modules/roadmaps/roadmaps.routes';
import adminRoutes from '../modules/admin/admin.routes';

const router = Router();

router.get('/health', (_req, res) => res.status(200).json({ success: true, message: 'TechTribe API is healthy' }));

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/languages', languagesRoutes);
router.use('/news', newsRoutes);
router.use('/community', communityRoutes);
router.use('/ai', aiRoutes);
router.use('/bookmarks', bookmarksRoutes);
router.use('/search', searchRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/mcq', mcqRoutes);
router.use('/challenges', challengesRoutes);
router.use('/notes', notesRoutes);
router.use('/roadmaps', roadmapsRoutes);
router.use('/admin', adminRoutes);

export default router;
