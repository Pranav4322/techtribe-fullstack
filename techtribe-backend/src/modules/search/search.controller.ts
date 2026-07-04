import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './search.service';

export const search = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.globalSearch((req.query.q as string) || '', req.user?.id);
  res.status(200).json({ success: true, data: result });
});
