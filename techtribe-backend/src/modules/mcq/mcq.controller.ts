import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './mcq.service';

export const categories = asyncHandler(async (_req: Request, res: Response) => {
  const data = await service.listCategories();
  res.status(200).json({ success: true, data: { categories: data } });
});

export const start = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.startAttempt(req.user!.id, req.body);
  res.status(201).json({ success: true, data: result });
});

export const answer = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.submitAnswer(
    req.user!.id,
    req.params.attemptId,
    req.body.questionId,
    req.body.selectedIndex
  );
  res.status(200).json({ success: true, data: result });
});

export const complete = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.completeAttempt(req.user!.id, req.params.attemptId);
  res.status(200).json({ success: true, data: result });
});

export const history = asyncHandler(async (req: Request, res: Response) => {
  const attempts = await service.getAttemptHistory(req.user!.id);
  res.status(200).json({ success: true, data: { attempts } });
});
