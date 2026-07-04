import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './bookmarks.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listBookmarks(req.user!.id, {
    page: req.query.page as string,
    limit: req.query.limit as string,
    type: req.query.type as string
  });
  res.status(200).json({ success: true, data: result });
});
