import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './community.service';

export const listPosts = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listPosts({
    page: req.query.page as string,
    limit: req.query.limit as string,
    tag: req.query.tag as string,
    sort: req.query.sort as 'newest' | 'oldest' | 'popular',
    userId: req.user?.id
  });
  res.status(200).json({ success: true, data: result });
});

export const getPost = asyncHandler(async (req: Request, res: Response) => {
  const post = await service.getPost(req.params.id, req.user?.id);
  res.status(200).json({ success: true, data: { post } });
});

export const createPost = asyncHandler(async (req: Request, res: Response) => {
  const post = await service.createPost(req.user!.id, req.body);
  res.status(201).json({ success: true, message: 'Post created', data: { post } });
});

export const updatePost = asyncHandler(async (req: Request, res: Response) => {
  const post = await service.updatePost(req.params.id, req.user!.id, req.user!.role !== 'USER', req.body);
  res.status(200).json({ success: true, message: 'Post updated', data: { post } });
});

export const deletePost = asyncHandler(async (req: Request, res: Response) => {
  await service.deletePost(req.params.id, req.user!.id, req.user!.role !== 'USER');
  res.status(200).json({ success: true, message: 'Post deleted' });
});

export const likePost = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.togglePostLike(req.user!.id, req.params.id);
  res.status(200).json({ success: true, data: result });
});

export const bookmarkPost = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.togglePostBookmark(req.user!.id, req.params.id);
  res.status(200).json({ success: true, data: result });
});

export const listComments = asyncHandler(async (req: Request, res: Response) => {
  const comments = await service.listComments(req.params.id, req.user?.id);
  res.status(200).json({ success: true, data: { comments } });
});

export const createComment = asyncHandler(async (req: Request, res: Response) => {
  const comment = await service.createComment(req.user!.id, { postId: req.params.id, ...req.body });
  res.status(201).json({ success: true, message: 'Comment added', data: { comment } });
});

export const updateComment = asyncHandler(async (req: Request, res: Response) => {
  const comment = await service.updateComment(
    req.params.commentId,
    req.user!.id,
    req.user!.role !== 'USER',
    req.body.body
  );
  res.status(200).json({ success: true, message: 'Comment updated', data: { comment } });
});

export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteComment(req.params.commentId, req.user!.id, req.user!.role !== 'USER');
  res.status(200).json({ success: true, message: 'Comment deleted' });
});

export const likeComment = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.toggleCommentLike(req.user!.id, req.params.commentId);
  res.status(200).json({ success: true, data: result });
});

export const report = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.reportContent(req.user!.id, req.body);
  res.status(201).json({ success: true, message: 'Report submitted. Our moderators will review it.', data: { report: result } });
});

export const topTags = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 6;
  const tags = await service.getTopTags(limit);
  res.status(200).json({ success: true, data: { tags } });
});
