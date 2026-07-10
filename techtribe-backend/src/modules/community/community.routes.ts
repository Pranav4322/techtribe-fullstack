import { Router } from 'express';
import * as controller from './community.controller';
import { requireAuth, optionalAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createPostSchema, updatePostSchema, createCommentSchema, reportSchema } from './community.validation';

const router = Router();

router.get('/posts', optionalAuth, controller.listPosts);
router.get('/tags/top', controller.topTags);
router.post('/posts', requireAuth, validate({ body: createPostSchema }), controller.createPost);
router.get('/posts/:id', optionalAuth, controller.getPost);
router.put('/posts/:id', requireAuth, validate({ body: updatePostSchema }), controller.updatePost);
router.delete('/posts/:id', requireAuth, controller.deletePost);
router.post('/posts/:id/like', requireAuth, controller.likePost);
router.post('/posts/:id/bookmark', requireAuth, controller.bookmarkPost);

router.get('/posts/:id/comments', optionalAuth, controller.listComments);
router.post('/posts/:id/comments', requireAuth, validate({ body: createCommentSchema }), controller.createComment);
router.put('/comments/:commentId', requireAuth, controller.updateComment);
router.delete('/comments/:commentId', requireAuth, controller.deleteComment);
router.post('/comments/:commentId/like', requireAuth, controller.likeComment);
router.post('/report', requireAuth, validate({ body: reportSchema }), controller.report);

export default router;
