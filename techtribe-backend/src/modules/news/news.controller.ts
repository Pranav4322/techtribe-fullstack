import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as newsService from './news.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await newsService.listNews({
    category: req.query.category as string | undefined,
    page: req.query.page as string | undefined,
    limit: req.query.limit as string | undefined,
    userId: req.user?.id
  });
  res.status(200).json({ success: true, data: result });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const article = await newsService.getArticleById(req.params.id);
  res.status(200).json({ success: true, data: { article } });
});

export const like = asyncHandler(async (req: Request, res: Response) => {
  const result = await newsService.toggleLike(req.user!.id, req.params.id);
  res.status(200).json({ success: true, data: result });
});

export const bookmark = asyncHandler(async (req: Request, res: Response) => {
  const result = await newsService.toggleBookmark(req.user!.id, req.params.id);
  res.status(200).json({ success: true, data: result });
});

export const categories = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { categories: newsService.listCategories() } });
});
